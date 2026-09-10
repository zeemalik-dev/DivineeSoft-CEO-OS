"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DailyUpdateForm({ existing }: { existing: { didToday: string; planNext: string | null; blockers: string | null } | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [didToday, setDidToday] = useState(existing?.didToday ?? "");
  const [planNext, setPlanNext] = useState(existing?.planNext ?? "");
  const [blockers, setBlockers] = useState(existing?.blockers ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/daily-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ didToday, planNext: planNext || undefined, blockers: blockers || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the update.");
        return;
      }
      setSaved(true);
      startTransition(() => router.refresh());
    } catch {
      setError("Could not reach the server. Your update was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 px-[18px] py-4">
      <div>
        <label className="label" htmlFor="did">
          What you did today
        </label>
        <textarea id="did" className="field" rows={2} value={didToday} onChange={(e) => setDidToday(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="plan">
          What is next
        </label>
        <textarea id="plan" className="field" rows={2} value={planNext} onChange={(e) => setPlanNext(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="blockers">
          Anything blocking you
        </label>
        <input id="blockers" className="field" value={blockers} onChange={(e) => setBlockers(e.target.value)} />
      </div>
      {error && <p className="text-sm text-blocked">{error}</p>}
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={busy || didToday.trim().length < 5}>
          {busy ? "Saving update" : existing ? "Update today&apos;s post" : "Post update"}
        </button>
        {saved && <span className="text-xs text-ontrack">Posted</span>}
      </div>
    </div>
  );
}
