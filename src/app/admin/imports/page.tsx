"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  RefreshCw,
  Upload,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

type RunSource = "sync-agent" | "admin-ui";
type RunStatus = "success" | "partial" | "failed";

interface ImportRunSummary {
  _id: string;
  source: RunSource;
  status: RunStatus;
  agentVersion?: string;
  adminUserName?: string;
  fileName?: string;
  fileSize?: number;
  totalRows: number;
  created: number;
  updated: number;
  unchanged?: number;
  skipped: number;
  pendingAiCategorize: number;
  totalErrors: number;
  durationMs?: number;
  startedAt: string;
  finishedAt: string;
}

interface ImportRunDetail extends ImportRunSummary {
  products: Array<{
    sku: string;
    name?: string;
    action: "created" | "updated" | "unchanged";
    category?: string;
    needsAiCategorize?: boolean;
  }>;
  errorList: Array<{ row: number; sku: string; error: string }>;
}

interface SparkyEntry {
  _id: string;
  description: string;
  targetName?: string;
  metadata?: {
    source?: string;
    tool?: string;
    category?: string;
    brand?: string | null;
    reason?: string | null;
  };
  createdAt: string;
}

const sourceLabel: Record<RunSource, string> = {
  "sync-agent": "Sync Agent",
  "admin-ui": "Admin Upload",
};

const statusStyle: Record<RunStatus, string> = {
  success: "bg-green-500/10 text-green-600 border-green-500/20",
  partial: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function formatDuration(ms?: number) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

export default function ImportsPage() {
  const [runs, setRuns] = useState<ImportRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<"all" | RunSource>("all");
  const [selectedRun, setSelectedRun] = useState<ImportRunDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [pendingAiCount, setPendingAiCount] = useState<number | null>(null);
  const [sparky, setSparky] = useState<SparkyEntry[]>([]);
  const [sparkyLoading, setSparkyLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const qs =
        sourceFilter === "all"
          ? ""
          : `?source=${encodeURIComponent(sourceFilter)}`;
      const res = await fetch(`/api/admin/import-runs${qs}`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setRuns(data.runs);
    } catch {
      toast.error("Failed to load import runs");
    } finally {
      setLoading(false);
    }
  }, [sourceFilter]);

  const fetchSparky = useCallback(async () => {
    setSparkyLoading(true);
    try {
      const res = await fetch(`/api/admin/sparky-activity?limit=50`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setSparky(data.entries);
    } catch {
      // silent — non-critical
    } finally {
      setSparkyLoading(false);
    }
  }, []);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/import-runs/stats`);
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.pendingAiCategorize === "number") {
        setPendingAiCount(data.pendingAiCategorize);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    fetchSparky();
    fetchPendingCount();
  }, [fetchSparky, fetchPendingCount]);

  async function openRun(id: string) {
    setSelectedLoading(true);
    setSelectedRun(null);
    try {
      const res = await fetch(`/api/admin/import-runs/${id}`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setSelectedRun(data.run);
    } catch {
      toast.error("Failed to load run detail");
    } finally {
      setSelectedLoading(false);
    }
  }

  async function runSparkyCategorize() {
    const toastId = toast.loading("Asking Sparky to categorize pending products…");
    let totalProcessed = 0;
    let totalRejected = 0;
    // Safety bound so a bug in the endpoint can't loop indefinitely.
    const MAX_ITERATIONS = 200;
    const BATCH_SIZE = 200; // server cap

    try {
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const res = await fetch("/api/admin/ai-categorize-pending", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ limit: BATCH_SIZE }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "failed");

        totalProcessed += data.processed ?? 0;
        totalRejected += Array.isArray(data.rejected) ? data.rejected.length : 0;

        toast.loading(
          `Sparky categorized ${totalProcessed} so far. ${data.remaining} remaining…`,
          { id: toastId }
        );

        // Stop conditions: nothing left, or this batch made no progress
        // (happens if all remaining items keep getting rejected for bad
        // slugs — don't spin forever).
        if (!data.remaining) break;
        if ((data.processed ?? 0) === 0) break;
      }

      toast.success(
        `Sparky categorized ${totalProcessed} product${
          totalProcessed === 1 ? "" : "s"
        }${totalRejected ? ` · ${totalRejected} rejected` : ""}.`,
        { id: toastId }
      );
      fetchSparky();
      fetchPendingCount();
    } catch (err) {
      toast.error((err as Error).message || "Sparky failed", { id: toastId });
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" /> Imports & Sparky Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily sync agent runs, manual uploads, and Sparky's AI categorization log.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRuns}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={runSparkyCategorize}>
            <Zap className="w-4 h-4 mr-2" /> Run Sparky now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Last run"
          value={runs[0] ? formatWhen(runs[0].startedAt) : "—"}
          hint={runs[0] ? sourceLabel[runs[0].source] : "No imports yet"}
        />
        <StatCard
          title="Created (last run)"
          value={runs[0] ? String(runs[0].created) : "—"}
          hint="New products added"
        />
        <StatCard
          title="Updated (last run)"
          value={runs[0] ? String(runs[0].updated) : "—"}
          hint="Existing products changed"
        />
        <StatCard
          title="Pending AI categorize"
          value={pendingAiCount === null ? "—" : String(pendingAiCount)}
          hint="Products awaiting Sparky"
        />
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Import Runs</TabsTrigger>
          <TabsTrigger value="sparky">Sparky Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-4">
          <div className="flex gap-2">
            {(["all", "sync-agent", "admin-ui"] as const).map((f) => (
              <Button
                key={f}
                variant={sourceFilter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter(f)}
              >
                {f === "all" ? "All" : sourceLabel[f]}
              </Button>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead className="text-right">Unchanged</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Pending AI</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <SkeletonRows />
                  ) : runs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center text-muted-foreground py-10"
                      >
                        No import runs recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    runs.map((r) => (
                      <TableRow
                        key={r._id}
                        className="cursor-pointer"
                        onClick={() => openRun(r._id)}
                      >
                        <TableCell>
                          <div className="text-sm">{formatWhen(r.startedAt)}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.fileName || (r.source === "sync-agent" ? "agent-upload" : "manual upload")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {r.source === "sync-agent" ? (
                              <RefreshCw className="w-3 h-3" />
                            ) : (
                              <Upload className="w-3 h-3" />
                            )}
                            <span className="text-sm">{sourceLabel[r.source]}</span>
                          </div>
                          {r.source === "sync-agent" && r.agentVersion && (
                            <div className="text-xs text-muted-foreground">
                              v{r.agentVersion}
                            </div>
                          )}
                          {r.adminUserName && (
                            <div className="text-xs text-muted-foreground">
                              {r.adminUserName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusStyle[r.status]}
                          >
                            {r.status === "success" && (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                            )}
                            {r.status === "partial" && (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {r.status === "failed" && (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {r.created}
                        </TableCell>
                        <TableCell className="text-right">{r.updated}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {r.unchanged ?? 0}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {r.skipped}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.pendingAiCategorize > 0 ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              {r.pendingAiCategorize}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.totalErrors > 0 ? (
                            <span className="text-red-600">{r.totalErrors}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatDuration(r.durationMs)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sparky">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" /> Sparky Activity
              </CardTitle>
              <CardDescription>
                AI categorizations and other automated actions by Sparky.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sparkyLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : sparky.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sparky hasn't done anything yet. Run a categorization to populate this log.
                </p>
              ) : (
                <ul className="divide-y">
                  {sparky.map((e) => (
                    <li key={e._id} className="py-2 text-sm flex items-start gap-3">
                      <Zap className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{e.description}</div>
                        {e.metadata?.reason && (
                          <div className="text-xs text-muted-foreground mt-0.5 italic">
                            “{e.metadata.reason}”
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatWhen(e.createdAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet
        open={selectedLoading || !!selectedRun}
        onOpenChange={(open) => {
          if (!open) setSelectedRun(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : selectedRun ? (
            <RunDetail run={selectedRun} />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
        <div className="text-lg font-semibold mt-1 truncate">{value}</div>
        {hint && (
          <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonRows() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(10)].map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function RunDetail({ run }: { run: ImportRunDetail }) {
  const created = run.products.filter((p) => p.action === "created");
  const updated = run.products.filter((p) => p.action === "updated");
  const pendingAi = run.products.filter((p) => p.needsAiCategorize);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Badge variant="outline" className={statusStyle[run.status]}>
            {run.status}
          </Badge>
          {sourceLabel[run.source]}
        </SheetTitle>
        <SheetDescription>
          {formatWhen(run.startedAt)} · {formatDuration(run.durationMs)} ·{" "}
          {run.fileName || "—"}
        </SheetDescription>
      </SheetHeader>

      <div className="px-4 pb-6 space-y-6">
        <div className="grid grid-cols-4 gap-2 text-center">
          <MiniStat label="Created" value={run.created} tone="green" />
          <MiniStat label="Updated" value={run.updated} tone="default" />
          <MiniStat label="Skipped" value={run.skipped} tone="muted" />
          <MiniStat
            label="Errors"
            value={run.totalErrors}
            tone={run.totalErrors > 0 ? "red" : "muted"}
          />
        </div>

        {pendingAi.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Needs AI categorization (
              {pendingAi.length})
            </h3>
            <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
              {pendingAi.slice(0, 50).map((p) => (
                <div
                  key={p.sku}
                  className="px-3 py-1.5 text-xs flex justify-between gap-2"
                >
                  <span className="font-mono">{p.sku}</span>
                  <span className="truncate text-muted-foreground">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {created.length > 0 && (
          <CollapsibleList title={`New products (${created.length})`} items={created} />
        )}
        {updated.length > 0 && (
          <CollapsibleList title={`Updated (${updated.length})`} items={updated} limit={30} />
        )}

        {run.errorList.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold mb-2 text-red-600">
              Errors ({run.totalErrors})
            </h3>
            <div className="rounded-md border divide-y max-h-60 overflow-y-auto">
              {run.errorList.slice(0, 50).map((e, i) => (
                <div key={i} className="px-3 py-2 text-xs">
                  <div className="font-mono">
                    row {e.row} · {e.sku}
                  </div>
                  <div className="text-red-600 mt-0.5">{e.error}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "default" | "muted";
}) {
  const toneClass = {
    green: "text-green-600",
    red: "text-red-600",
    default: "text-foreground",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <div className="rounded-md border p-3">
      <div className={`text-xl font-bold ${toneClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function CollapsibleList({
  title,
  items,
  limit = 50,
}: {
  title: string;
  items: Array<{ sku: string; name?: string; category?: string }>;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, limit);
  return (
    <section>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="rounded-md border divide-y max-h-60 overflow-y-auto">
        {shown.map((p) => (
          <div
            key={p.sku}
            className="px-3 py-1.5 text-xs flex justify-between gap-2"
          >
            <span className="font-mono">{p.sku}</span>
            <span className="truncate text-muted-foreground max-w-[50%]">
              {p.name}
            </span>
            {p.category && (
              <Badge variant="outline" className="text-[10px]">
                {p.category}
              </Badge>
            )}
          </div>
        ))}
      </div>
      {items.length > limit && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="p-0 h-auto mt-1 text-xs"
        >
          {expanded ? "Show less" : `Show all ${items.length}`}
        </Button>
      )}
    </section>
  );
}
