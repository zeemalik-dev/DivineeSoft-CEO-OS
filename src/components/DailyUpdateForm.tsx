"use client";

import { useState } from "react";
import { useSaveDailyUpdateMutation } from "@/redux/api/dailyUpdatesApi";

export function DailyUpdateForm({
  existing,
}: {
  existing: { didToday: string; planNext: string | null; blockers: string | null } | null;
}) {
  const [saveDailyUpdate, { isLoading: busy }] = useSaveDailyUpdateMutation();
  const [didToday, setDidToday] = useState(existing?.didToday ?? "");
  const [planNext, setPlanNext] = useState(existing?.planNext ?? "");
  const [blockers, setBlockers] = useState(existing?.blockers ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaved(false);
    try {
      await saveDailyUpdate({
        didToday,
        planNext: planNext || undefined,
        blockers: blockers || undefined,
      }).unwrap();
      // RTK invalidates "DailyUpdate" tag → useGetTodayUpdateQuery auto-refetches
      setSaved(true);
    } catch (err: any) {
      setError(err?.data?.error ?? "Could not save the update.");
    }
  }

  return (
    <div className="space-y-3 px-[18px] py-4">
      <div>
        <label className="label" htmlFor="did">
          What you did today
        </label>
        <textarea
          id="did"
          className="field"
          rows={2}
          value={didToday}
          onChange={(e) => setDidToday(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="plan">
          What is next
        </label>
        <textarea
          id="plan"
          className="field"
          rows={2}
          value={planNext}
          onChange={(e) => setPlanNext(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="blockers">
          Anything blocking you
        </label>
        <input
          id="blockers"
          className="field"
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-blocked">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={busy || didToday.trim().length < 5}
        >
          {busy ? "Saving update" : existing ? "Update today\u0027s post" : "Post update"}
        </button>
        {saved && <span className="text-xs text-ontrack">Posted</span>}
      </div>
    </div>
  );
}
