"use client";

import { useState } from "react";
import { useApproveTaskMutation } from "@/redux/api/tasksApi";

type Pending = { id: string; title: string; rationale: string | null; assignee: string | null };

export function PendingApprovals({ tasks }: { tasks: Pending[] }) {
  const [approveTask, { isLoading }] = useApproveTaskMutation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, decision: "APPROVE" | "REJECT") {
    setBusyId(id);
    setError(null);
    try {
      await approveTask({ id, decision }).unwrap();
      // RTK invalidates "Task" + "Dashboard" tags → both queries auto-refetch
    } catch (err: any) {
      setError(err?.data?.error ?? "Could not update approval.");
    } finally {
      setBusyId(null);
    }
  }

  if (tasks.length === 0) {
    return (
      <p className="px-[18px] py-5 text-sm text-muted">
        Nothing waiting. Tasks the assistant proposes land here first.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p className="border-b border-rule px-[18px] py-3 text-sm text-blocked" role="alert">
          {error}
        </p>
      )}
      <ul className="divide-y divide-rule">
        {tasks.map((task) => (
          <li key={task.id} className="px-[18px] py-3">
            <p className="text-sm">{task.title}</p>
            <p className="mt-0.5 text-xs text-muted">
              {task.assignee ? `Proposed for ${task.assignee}` : "Unassigned"}
              {task.rationale ? ` · ${task.rationale}` : ""}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                className="btn btn-primary"
                disabled={busyId === task.id || isLoading}
                onClick={() => decide(task.id, "APPROVE")}
              >
                Approve
              </button>
              <button
                className="btn"
                disabled={busyId === task.id || isLoading}
                onClick={() => decide(task.id, "REJECT")}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
