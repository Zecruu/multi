"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Loader2, Send, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Turn = { role: "user" | "model"; text: string };
type ToolCall = { name: string; args: unknown; result: unknown };

const STORAGE_KEY = "sparky.chat.history.v1";

function loadHistory(): Turn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Turn[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history: Turn[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-40)));
  } catch {}
}

export function SparkyChat() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastCalls, setLastCalls] = useState<ToolCall[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    saveHistory(history);
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    const next: Turn[] = [...history, { role: "user", text: msg }];
    setHistory(next);
    setSending(true);
    try {
      const res = await fetch("/api/admin/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: history.slice(-20) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHistory([
          ...next,
          { role: "model", text: `**Error:** ${data.error || res.statusText}` },
        ]);
      } else {
        const calls = (data.toolCalls || []) as ToolCall[];
        setLastCalls(calls);
        setHistory([...next, { role: "model", text: data.reply || "(no reply)" }]);

        // Auto-navigate to the results view when a tool returns a URL.
        // Priority: staging > search. Only navigate if we're not already
        // on that page (avoids a jarring scroll-to-top reload).
        const stagingUrl = calls.find(
          (c) => c.name === "stage_bulk_action"
        )?.result as { productsPageUrl?: string } | undefined;
        const searchUrl = calls.find(
          (c) => c.name === "search_products"
        )?.result as { productsPageUrl?: string; truncated?: boolean } | undefined;

        const targetUrl =
          stagingUrl?.productsPageUrl ||
          (searchUrl?.truncated ? searchUrl.productsPageUrl : undefined);

        if (targetUrl) {
          // Always route — the products page reads fresh URL params and
          // refetches. Skip only if exactly same url so we don't reload.
          const current = pathname + (typeof window !== "undefined" ? window.location.search : "");
          if (current !== targetUrl) {
            router.push(targetUrl);
          }
        }
      }
    } catch (err) {
      setHistory([
        ...next,
        {
          role: "model",
          text: `**Error:** ${err instanceof Error ? err.message : "network error"}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function clear() {
    setHistory([]);
    setLastCalls([]);
  }

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          aria-label="Open Sparky"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-black shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <Zap className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2rem)] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-yellow-400 to-amber-500 text-black">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <div>
                <div className="font-semibold leading-tight">Sparky</div>
                <div className="text-[11px] opacity-80 leading-tight">
                  MultiElectric admin assistant
                </div>
              </div>
            </div>
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-black/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollerRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-muted/20"
          >
            {history.length === 0 && (
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Bot className="h-4 w-4" />
                  Hi, I&apos;m Sparky.
                </div>
                <div>Try:</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>&quot;How many active products do we have?&quot;</li>
                  <li>&quot;Find Klein hand tools priced over $50.&quot;</li>
                  <li>&quot;Set SKU ABC-123 on sale at $19.99.&quot;</li>
                  <li>&quot;Add 12 units to SKU XYZ-9.&quot;</li>
                </ul>
              </div>
            )}
            {history.map((t, i) => (
              <div
                key={i}
                className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    t.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  }`}
                >
                  {t.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 text-sm bg-card border flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            {lastCalls.length > 0 && (
              <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer">
                  {lastCalls.length} tool call{lastCalls.length === 1 ? "" : "s"}
                </summary>
                <pre className="mt-1 overflow-x-auto rounded bg-muted p-2">
                  {JSON.stringify(lastCalls, null, 2)}
                </pre>
              </details>
            )}
          </div>

          <div className="border-t p-2 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask Sparky…"
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={send} disabled={sending || !input.trim()} size="icon">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between px-3 pb-2 text-[11px] text-muted-foreground">
            <button onClick={clear} className="hover:underline">
              Clear history
            </button>
            <span>Gemini · live DB writes</span>
          </div>
        </div>
      )}
    </>
  );
}
