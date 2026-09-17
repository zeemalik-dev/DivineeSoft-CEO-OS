"use client";

import { useState } from "react";
import { useUpdateTaskMutation } from "@/redux/api/tasksApi";
import { Progress, statusLabel } from "@/components/ui";

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  project: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  blockerNote: string | null;
  overdue: boolean;
};

const NEXT_ACTIONS: Record<string, { label: string; status: string }[]> = {
  NOT_STARTED: [{ label: "Start", status: "STARTED" }],
  STARTED: [
    { label: "Working on it", status: "IN_PROGRESS" },
    { label: "Pause", status: "NOT_STARTED" },
  ],
  IN_PROGRESS: [
    { label: "Send for review", status: "WAITING_FOR_REVIEW" },
    { label: "Pause", status: "NOT_STARTED" },
  ],
  WAITING_FOR_REVIEW: [{ label: "Reopen", status: "IN_PROGRESS" }],
  BLOCKED: [{ label: "Unblock", status: "IN_PROGRESS" }],
  COMPLETED: [{ label: "Reopen", status: "IN_PROGRESS" }],
};

export function TaskBoard({ tasks }: { tasks: BoardTask[] }) {
  const [updateTask, { isLoading: isMutating }] = useUpdateTaskMutation();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [blocker, setBlocker] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await updateTask({ id, body }).unwrap();
      // RTK invalidates "Task" tag → useGetMyTasksQuery auto-refetches
      setComment("");
      setBlocker("");
    } catch (err: any) {
      setError(err?.data?.error ?? "Could not update this task.");
    } finally {
      setBusyId(null);
    }
  }

  if (tasks.length === 0) {
    return <p className="px-[18px] py-6 text-sm text-muted">No tasks here. Nothing to do in this view.</p>;
  }

  return (
    <div>
      {error && <p className="border-b border-rule px-[18px] py-3 text-sm text-blocked" role="alert">{error}</p>}
      <ul className="divide-y divide-rule">
      {tasks.map((task) => {
        const open = openId === task.id;
        const busy = busyId === task.id;
        return (
          <li key={task.id} className="px-[18px] py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <button
                className="text-left text-sm font-medium hover:underline"
                onClick={() => setOpenId(open ? null : task.id)}
                aria-expanded={open}
              >
                {task.title}
              </button>
              <span className="text-xs text-muted">
                {task.project ?? "No project"}
                {task.dueDate && (
                  <span className={task.overdue ? "text-blocked" : ""}>
                    {" "}
                    · due {new Date(task.dueDate).toLocaleDateString([], { day: "numeric", month: "short" })}
                  </span>
                )}
                {task.priority !== "MEDIUM" && ` · ${task.priority.toLowerCase()}`}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <Progress
                value={task.progress}
                tone={task.status === "BLOCKED" ? "blocked" : task.status === "COMPLETED" ? "ontrack" : "ink"}
              />
              <span className="text-xs text-muted">
                {statusLabel(task.status)} · {task.progress}%
              </span>
            </div>
            {task.blockerNote && <p className="mt-1.5 text-xs text-blocked">Blocked: {task.blockerNote}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              {(NEXT_ACTIONS[task.status] ?? []).map((action) => (
                <button
                  key={action.status}
                  className="btn"
                  disabled={busy || isMutating}
                  onClick={() => patch(task.id, { status: action.status })}
                >
                  {action.label}
                </button>
              ))}
              {task.status !== "COMPLETED" && (
                <button
                  className="btn btn-primary"
                  disabled={busy || isMutating}
                  onClick={() => patch(task.id, { status: "COMPLETED" })}
                >
                  Mark complete
                </button>
              )}
              <button className="btn" onClick={() => setOpenId(open ? null : task.id)}>
                {open ? "Close" : "Update"}
              </button>
            </div>

            {open && (
              <div className="mt-4 space-y-4 border-t border-rule pt-4">
                {task.description && <p className="text-sm leading-relaxed text-muted">{task.description}</p>}

                <div>
                  <label className="label" htmlFor={`progress-${task.id}`}>
                    Progress
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[10, 25, 50, 75, 90].map((value) => (
                      <button
                        key={value}
                        id={`progress-${task.id}`}
                        className="btn"
                        disabled={busy || isMutating}
                        onClick={() => patch(task.id, { progress: value, status: "IN_PROGRESS" })}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor={`comment-${task.id}`}>
                    Add a comment
                  </label>
                  <textarea
                    id={`comment-${task.id}`}
                    className="field"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What changed since the last update?"
                  />
                  <button
                    className="btn mt-2"
                    disabled={!comment.trim() || busy || isMutating}
                    onClick={() => patch(task.id, { comment })}
                  >
                    Save comment
                  </button>
                </div>

                <div>
                  <label className="label" htmlFor={`blocker-${task.id}`}>
                    Report a blocker
                  </label>
                  <input
                    id={`blocker-${task.id}`}
                    className="field"
                    value={blocker}
                    onChange={(e) => setBlocker(e.target.value)}
                    placeholder="What is stopping you, and who can clear it?"
                  />
                  <button
                    className="btn mt-2"
                    disabled={!blocker.trim() || busy || isMutating}
                    onClick={() => patch(task.id, { status: "BLOCKED", blockerNote: blocker })}
                  >
                    Flag as blocked
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
      </ul>
    </div>
  );
}
