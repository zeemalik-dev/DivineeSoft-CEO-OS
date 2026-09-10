"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["AUTO", "IDEA", "TASK", "REMINDER", "PROBLEM", "GOAL"] as const;

/** The "next steps" input: type anything, it gets filed in the right place. */
export function CaptureBox() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("AUTO");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error ?? "Could not file that.");
        return;
      }
      setResult(`Filed as a ${data.created.kind.toLowerCase()} in ${data.created.where}.`);
      setText("");
      startTransition(() => router.refresh());
    } catch {
      setResult("Could not reach the server. Nothing was filed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 px-[18px] py-4">
      <textarea
        className="field"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="An idea, a task, a reminder, a problem, a goal. Write it the way you would say it."
        aria-label="Capture anything"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="field w-auto"
          value={type}
          onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
          aria-label="File as"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "AUTO" ? "Decide for me" : t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={submit} disabled={busy || text.trim().length < 3}>
          {busy ? "Filing" : "Capture"}
        </button>
        {result && <span className={`text-xs ${result.startsWith("Could") ? "text-blocked" : "text-muted"}`} role="status">{result}</span>}
      </div>
    </div>
  );
}
