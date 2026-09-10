"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Pending = { id: string; title: string; rationale: string | null; assignee: string | null };

export function PendingApprovals({ tasks }: { tasks: Pending[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, decision: "APPROVE" | "REJECT") {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Could not update approval.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Could not reach the server. The approval was not changed.");
    } finally {
      setBusyId(null);
    }
  }

  if (tasks.length === 0) {
    return <p className="px-[18px] py-5 text-sm text-muted">Nothing waiting. Tasks the assistant proposes land here first.</p>;
  }

  return (
    <div>
      {error && <p className="border-b border-rule px-[18px] py-3 text-sm text-blocked" role="alert">{error}</p>}
      <ul className="divide-y divide-rule">
      {tasks.map((task) => (
        <li key={task.id} className="px-[18px] py-3">
          <p className="text-sm">{task.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {task.assignee ? `Proposed for ${task.assignee}` : "Unassigned"}
            {task.rationale ? ` · ${task.rationale}` : ""}
          </p>
          <div className="mt-2 flex gap-2">
            <button className="btn btn-primary" disabled={busyId === task.id || pending} onClick={() => decide(task.id, "APPROVE")}>
              Approve
            </button>
            <button className="btn" disabled={busyId === task.id || pending} onClick={() => decide(task.id, "REJECT")}>
              Reject
            </button>
          </div>
        </li>
      ))}
      </ul>
    </div>
  );
}
