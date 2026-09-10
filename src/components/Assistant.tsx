"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Turn = { role: "you" | "assistant"; text: string; tools?: string[] };
type Pending = { id: string; tool: string; input: unknown };

const SUGGESTIONS = [
  "What is everyone working on today?",
  "Which projects are delayed?",
  "Show me all overdue tasks",
  "What should I focus on today?",
  "Create a task for Hassaan to fix the CosmoLink website footer tomorrow",
];

export function Assistant({ canApprove }: { canApprove: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim()) return;
    setTurns((t) => [...t, { role: "you", text }]);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The assistant could not answer.");
        return;
      }
      setConversationId(data.conversationId);
      setTurns((t) => [...t, { role: "assistant", text: data.reply, tools: data.usedTools }]);
      setPending(data.pendingActions ?? []);
      requestAnimationFrame(() => boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight }));
    } catch {
      setError("Could not reach the assistant.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, decision: "CONFIRM" | "REJECT") {
    const res = await fetch(`/api/ai/actions/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json();
    setPending((list) => list.filter((p) => p.id !== id));
    setTurns((t) => [
      ...t,
      {
        role: "assistant",
        text:
          decision === "REJECT"
            ? "Cancelled — nothing was changed."
            : data.status === "CONFIRMED"
              ? `Done. ${JSON.stringify(data.result)}`
              : `That failed: ${JSON.stringify(data.result)}`,
      },
    ]);
    startTransition(() => router.refresh());
  }

  return (
    <div className="panel">
      <div ref={boxRef} className="max-h-[52vh] min-h-[220px] space-y-4 overflow-y-auto px-[18px] py-5">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Ask about the company in plain language. Every answer comes from live data, and anything that changes
              data waits for your confirmation.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} className="btn" onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, index) => (
          <div key={index}>
            <p className="text-xs text-muted">{turn.role === "you" ? "You" : "Assistant"}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{turn.text}</p>
            {turn.tools && turn.tools.length > 0 && (
              <p className="mt-1 text-xs text-muted">Looked at: {[...new Set(turn.tools)].join(", ")}</p>
            )}
          </div>
        ))}

        {busy && <p className="text-sm text-muted">Checking the data…</p>}
        {error && <p className="text-sm text-blocked">{error}</p>}
      </div>

      {pending.length > 0 && (
        <div className="border-t border-rule px-[18px] py-4">
          <p className="text-sm font-medium">Confirm before this happens</p>
          {pending.map((action) => (
            <div key={action.id} className="mt-2">
              <p className="text-sm">
                {action.tool.replace(/_/g, " ")} — {JSON.stringify(action.input)}
              </p>
              <div className="mt-2 flex gap-2">
                <button className="btn btn-primary" disabled={!canApprove} onClick={() => decide(action.id, "CONFIRM")}>
                  Confirm
                </button>
                <button className="btn" onClick={() => decide(action.id, "REJECT")}>
                  Cancel
                </button>
              </div>
              {!canApprove && <p className="mt-1 text-xs text-muted">Only the CEO can confirm this change.</p>}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-t border-rule px-[18px] py-3">
        <input
          className="field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && send(input)}
          placeholder="Ask anything about the company"
          aria-label="Message the assistant"
        />
        <button className="btn btn-primary" onClick={() => send(input)} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
