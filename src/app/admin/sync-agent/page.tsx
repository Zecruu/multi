"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Key,
  Copy,
  Check,
  RefreshCw,
  Monitor,
  FolderOpen,
  Mail,
  FileText,
  Github,
  Settings,
  ArrowRight,
} from "lucide-react";

interface AgentInfo {
  version: string;
  hasSyncKey: boolean;
  syncKeyPreview: string | null;
  downloadUrl: string;
  repo: string;
}

export default function SyncAgentPage() {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [newSyncKey, setNewSyncKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAgentInfo();
  }, []);

  async function fetchAgentInfo() {
    try {
      const res = await fetch("/api/admin/sync-agent");
      if (res.ok) {
        setAgentInfo(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch agent info:", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateSyncKey() {
    setGeneratingKey(true);
    try {
      const res = await fetch("/api/admin/sync-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-key" }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewSyncKey(data.syncKey);
      }
    } catch (err) {
      console.error("Failed to generate key:", err);
    } finally {
      setGeneratingKey(false);
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Sync Agent</h1>
        <p className="text-muted-foreground mt-1">
          Automatically sync products from your inventory software to the online store.
        </p>
      </div>

      {/* Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Sync Agent
          </CardTitle>
          <CardDescription>
            Install the sync agent on the computer that runs your inventory management software.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button asChild size="lg">
              <a
                href={agentInfo?.downloadUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4 mr-2" />
                Download for Windows
              </a>
            </Button>
            <Badge variant="secondary">v{agentInfo?.version || "1.0.0"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            System requirements: Windows 10 or later. The agent runs in the background and watches for new export files.
          </p>
        </CardContent>
      </Card>

      {/* Sync Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Sync Key
          </CardTitle>
          <CardDescription>
            The sync key authenticates the agent with the server. Generate one here — it&apos;s saved automatically — then paste into the agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {agentInfo?.hasSyncKey ? (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                {agentInfo.syncKeyPreview}
              </Badge>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                Active
              </Badge>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No sync key configured. Generate one below — it&apos;s saved to the database automatically.
              </AlertDescription>
            </Alert>
          )}

          {newSyncKey ? (
            <div className="space-y-2">
              <Alert>
                <AlertDescription className="space-y-3">
                  <p className="font-semibold">Your new sync key (save it now — it won&apos;t be shown again):</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-3 py-2 rounded text-xs font-mono break-all flex-1">
                      {newSyncKey}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newSyncKey)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>Key saved to the server. Paste it into the sync agent&apos;s Settings → Sync Key field (or <code className="bg-muted px-1 rounded">config.yaml</code> under <code className="bg-muted px-1 rounded">api.sync_key</code>) and restart the agent.</p>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Button onClick={generateSyncKey} disabled={generatingKey} variant="outline">
              {generatingKey ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Generate New Sync Key
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Step
              number={1}
              icon={<Download className="h-4 w-4" />}
              title="Download & Install"
              description="Download the sync agent above and extract it to a folder on the computer (e.g., C:\MultiElectricSync)."
            />
            <Step
              number={2}
              icon={<Key className="h-4 w-4" />}
              title="Configure Sync Key"
              description='Generate a sync key above (auto-saved to the server) and paste it into the agent&apos;s config.yaml file under api.sync_key.'
            />
            <Step
              number={3}
              icon={<FolderOpen className="h-4 w-4" />}
              title="Set Watch Folder"
              description='Edit config.yaml and set watch_folder to the folder where your inventory software exports files (e.g., C:\Exports).'
            />
            <Step
              number={4}
              icon={<Monitor className="h-4 w-4" />}
              title="Run the Agent"
              description="Double-click MultiElectricSync.exe to start the agent. It will watch for new .xls/.xlsx files and automatically sync them."
            />
            <Step
              number={5}
              icon={<Mail className="h-4 w-4" />}
              title="Email Notifications (Optional)"
              description="Add recipient email addresses in config.yaml under notifications.recipients to get notified on each sync."
            />
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-muted px-4 py-3 rounded-lg">
              <FileText className="h-5 w-5 text-blue-500 shrink-0" />
              <span>Export from inventory software</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block shrink-0" />
            <div className="flex items-center gap-2 bg-muted px-4 py-3 rounded-lg">
              <FolderOpen className="h-5 w-5 text-yellow-500 shrink-0" />
              <span>File saved to watch folder</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block shrink-0" />
            <div className="flex items-center gap-2 bg-muted px-4 py-3 rounded-lg">
              <RefreshCw className="h-5 w-5 text-green-500 shrink-0" />
              <span>Agent detects & uploads</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block shrink-0" />
            <div className="flex items-center gap-2 bg-muted px-4 py-3 rounded-lg">
              <Monitor className="h-5 w-5 text-purple-500 shrink-0" />
              <span>Products updated on website</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Config Reference (config.yaml)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre">
{`# Folder to watch for export files
watch_folder: "C:\\\\Exports"

# Scan interval in seconds
scan_interval: 30

# API Configuration
api:
  url: "https://multielectricsupply.com"
  sync_key: "YOUR_SYNC_KEY_HERE"

# Email notifications
notifications:
  enabled: true
  recipients:
    - "admin@multielectricsupply.com"

# Logging
logging:
  file: "sync.log"
  level: "info"
  max_size_mb: 10

# Auto-update
auto_update:
  enabled: true
  check_interval_hours: 6
  repo: "Zecruu/multi-electric-sync"

# File processing
processing:
  move_after_sync: true
  delete_after_sync: false
  skip_older_than_days: 7`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
        {number}
      </div>
      <div>
        <div className="flex items-center gap-2 font-semibold">
          {icon}
          {title}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}
