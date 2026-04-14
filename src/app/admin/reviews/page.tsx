"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MessageSquareText,
  Send,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Msg = { role: "bot" | "customer"; content: string; timestamp: string };
type Item = {
  id: string;
  firstName: string;
  phone: string;
  status: string;
  rating: number | null;
  provider: "aws" | "preview";
  sentBy: string;
  sentAt: string;
  respondedAt: string | null;
  conversation: Msg[];
  feedbackText: string | null;
};
type Stats = {
  total: number;
  responded: number;
  avgRating: number;
  positive: number;
  negative: number;
};

const STATUS_LABEL: Record<string, string> = {
  sent: "Sent",
  rated_positive: "Positive",
  rated_negative: "Negative",
  followed_up: "Followed Up",
  opted_out: "Opted Out",
  expired: "Expired",
};

function statusBadge(status: string) {
  const color =
    status === "rated_positive"
      ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      : status === "rated_negative"
        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
        : status === "opted_out"
          ? "bg-gray-500/10 text-gray-500 border-gray-500/20"
          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  return (
    <Badge variant="outline" className={color}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

export default function ReviewsPage() {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (statusFilter !== "all") sp.set("status", statusFilter);
      if (search) sp.set("search", search);
      const res = await fetch(`/api/admin/reviews/list?${sp.toString()}`);
      if (!res.ok) throw new Error(`list failed: ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    if (!consent) {
      toast.error("Confirm the customer consented to receive SMS");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/reviews/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, phone, consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send");
      } else if (data.preview) {
        toast.success("Preview mode: SMS stored, not actually sent (add AWS env vars to go live)");
        setFirstName("");
        setPhone("");
        setConsent(false);
        load();
      } else {
        toast.success(`Sent to ${phone}`);
        setFirstName("");
        setPhone("");
        setConsent(false);
        load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-7 h-7 text-yellow-500" />
          Reviews &amp; Reputation
        </h1>
        <p className="text-muted-foreground mt-1">
          Send an in-store visitor an SMS asking for a 1–5 rating. Positive
          ratings get a follow-up with the Google review link.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
              Requests Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
              Responded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.responded ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgRating ? stats.avgRating.toFixed(2) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> Positive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.positive ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <ThumbsDown className="w-3 h-3" /> Negative
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.negative ?? "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="w-5 h-5" /> Send Review Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Customer First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={sending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (10 digits)</Label>
                <Input
                  id="phone"
                  placeholder="787-555-1234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={sending}
                  inputMode="tel"
                />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(!!v)}
                disabled={sending}
              />
              <Label
                htmlFor="consent"
                className="text-sm leading-snug cursor-pointer"
              >
                Customer verbally consented in-store to receive a review
                request SMS. I understand they can reply STOP at any time.
              </Label>
            </div>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send SMS
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquareText className="w-5 h-5" /> Conversations
          </CardTitle>
          <div className="flex items-center gap-3 pt-2">
            <Input
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent (awaiting)</SelectItem>
                <SelectItem value="rated_positive">Positive</SelectItem>
                <SelectItem value="rated_negative">Negative</SelectItem>
                <SelectItem value="opted_out">Opted Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No requests yet. Send one above.
            </div>
          ) : (
            <div className="divide-y">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setActive(it)}
                  className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{it.firstName}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.phone} · Sent by {it.sentBy} ·{" "}
                        {new Date(it.sentAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {it.rating && (
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {it.rating}
                        </div>
                      )}
                      {statusBadge(it.status)}
                      {it.provider === "preview" && (
                        <Badge variant="secondary" className="text-[10px]">
                          preview
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {active?.firstName} · {active?.phone}
            </SheetTitle>
          </SheetHeader>
          {active && (
            <div className="mt-4 space-y-4">
              <div className="text-xs text-muted-foreground">
                Sent {new Date(active.sentAt).toLocaleString()} by {active.sentBy}
                {active.respondedAt && (
                  <>
                    {" "}· Responded{" "}
                    {new Date(active.respondedAt).toLocaleString()}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(active.status)}
                {active.rating && (
                  <Badge className="bg-yellow-500 text-black">
                    {active.rating} / 5
                  </Badge>
                )}
                {active.provider === "preview" && (
                  <Badge variant="secondary">preview</Badge>
                )}
              </div>
              {active.feedbackText && (
                <div className="border rounded-md p-3 bg-red-500/5 text-sm">
                  <div className="font-medium text-red-600 mb-1">
                    Negative feedback
                  </div>
                  {active.feedbackText}
                </div>
              )}
              <div className="space-y-2">
                {active.conversation.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                      m.role === "bot"
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground ml-auto"
                    }`}
                  >
                    {m.content}
                    <div className="text-[10px] opacity-70 mt-1">
                      {new Date(m.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
