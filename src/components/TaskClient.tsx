"use client";

import Link from "next/link";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fmt } from "@/lib/dates";
import { Panel, Status } from "@/components/ui";
import { TaskComposer } from "@/components/TaskComposer";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project?: { name: string } | null;
  assignee?: { user: { name: string } } | null;
};

type EmployeeOption = { id: string; name: string };
type ProjectOption = { id: string; name: string };

type TaskClientProps = {
  employees: EmployeeOption[];
  projects: ProjectOption[];
  tasks: TaskRow[];
  canManage: boolean;
  initialStatus: string;
};

const statusOptions = [
  ["ALL", "All"],
  ["IN_PROGRESS", "In progress"],
  ["OVERDUE", "Overdue"],
  ["BLOCKED", "Blocked"],
  ["WAITING_FOR_REVIEW", "Review"],
] as const;

export function TaskClient({ employees, projects, tasks, canManage, initialStatus }: TaskClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function applyStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("status");
    } else {
      params.set("status", value);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => {
      router.push(nextUrl);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 className="page-title">Task register</h1>
          <p className="mt-1 text-sm text-muted">One shared view of the work across people and projects.</p>
        </div>
        <Link href="/my-tasks" className="btn btn-primary">
          Open my board
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {statusOptions.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => applyStatus(value)}
            className={`filter-chip ${initialStatus === value ? "filter-chip-active" : ""}`}
            aria-pressed={initialStatus === value}
          >
            {label}
          </button>
        ))}
      </div>

      {isPending && (
        <div className="flex items-center gap-2 rounded-xl border border-rule bg-surface px-3 py-2 text-sm text-muted" role="status" aria-live="polite">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
          Loading tasks...
        </div>
      )}

      {canManage && <TaskComposer employees={employees} projects={projects} />}

      <Panel title={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`} aside={<span className="text-xs text-muted">Live database view</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-rule text-left text-xs text-muted">
              <tr>
                <th className="px-[18px] py-3 font-normal">Task</th>
                <th className="px-3 py-3 font-normal">Owner</th>
                <th className="px-3 py-3 font-normal">Status</th>
                <th className="px-3 py-3 font-normal">Priority</th>
                <th className="px-[18px] py-3 font-normal">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-sunk">
                  <td className="px-[18px] py-3">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted">{task.project?.name ?? "No project"}</p>
                  </td>
                  <td className="px-3 py-3 text-muted">{task.assignee?.user.name ?? "Unassigned"}</td>
                  <td className="px-3 py-3">
                    <Status value={task.status as any} />
                  </td>
                  <td className="px-3 py-3 text-xs">{task.priority}</td>
                  <td className="px-[18px] py-3 text-muted">{task.dueDate ? fmt(new Date(task.dueDate), "d MMM") : "-"}</td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-[18px] py-8 text-muted">
                    No tasks match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
