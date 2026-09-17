"use client";

import { useGetMyTasksQuery, useGetCeoPersonalTasksQuery } from "@/redux/api/tasksApi";
import { useGetTodayUpdateQuery } from "@/redux/api/dailyUpdatesApi";
import type { BoardTask } from "@/redux/api/tasksApi";
import { TaskBoard } from "@/components/TaskBoard";
import { DailyUpdateForm } from "@/components/DailyUpdateForm";
import { Panel } from "@/components/ui";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-rule ${className ?? "h-4 w-full"}`} />;
}

function MyTasksSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonBlock className="h-7 w-40" />
        <SkeletonBlock className="mt-2 h-4 w-48" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="panel h-64" />
        </div>
        <div className="panel h-64" />
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  employeeId: string | null;
  role: string;
};

// ─── Board content rendered once data is available ───────────────────────────

function BoardContent({ tasks }: { tasks: BoardTask[] }) {
  const open = tasks.filter((t) => t.status !== "COMPLETED");
  const done = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <Panel title="Open">
        <TaskBoard tasks={open} />
      </Panel>
      {done.length > 0 && (
        <Panel title="Completed" aside={<span className="text-xs text-muted">{done.length}</span>}>
          <TaskBoard tasks={done.slice(0, 15)} />
        </Panel>
      )}
    </div>
  );
}

// ─── Daily Update Panel ───────────────────────────────────────────────────────

function DailyUpdatePanel({ employeeId }: { employeeId: string | null }) {
  const { data, isLoading } = useGetTodayUpdateQuery(undefined, { skip: !employeeId });

  return (
    <Panel title="Today's update">
      {isLoading ? (
        <div className="space-y-3 px-[18px] py-4">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      ) : (
        <DailyUpdateForm
          existing={
            data?.update
              ? {
                  didToday: data.update.didToday,
                  planNext: data.update.planNext,
                  blockers: data.update.blockers,
                }
              : null
          }
        />
      )}
    </Panel>
  );
}

// ─── CEO version (personal + assigned combined) ───────────────────────────────

function CeoTasksContent({ employeeId }: { employeeId: string | null }) {
  // CEO personal tasks (kind=CEO_PERSONAL)
  const personalQuery = useGetCeoPersonalTasksQuery();
  // CEO assigned tasks (like any employee)
  const assignedQuery = useGetMyTasksQuery(
    { employeeId: employeeId ?? "none", role: "CEO" },
    { skip: !employeeId }
  );

  const isLoading = personalQuery.isLoading || assignedQuery.isLoading;
  if (isLoading) return <MyTasksSkeleton />;

  // Merge both lists, deduplicate by id
  const seen = new Set<string>();
  const combined: BoardTask[] = [];
  for (const t of [...(personalQuery.data?.tasks ?? []), ...(assignedQuery.data?.tasks ?? [])]) {
    if (!seen.has(t.id)) { seen.add(t.id); combined.push(t); }
  }
  const open = combined.filter((t) => t.status !== "COMPLETED");
  const done = combined.filter((t) => t.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Your board</h1>
        <p className="mt-1 text-sm text-muted">
          {open.length === 0
            ? "Nothing open. Ask your lead what to pick up."
            : `${open.length} open · ${open.filter((t) => t.overdue).length} past due`}
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <BoardContent tasks={combined} />
        <DailyUpdatePanel employeeId={employeeId} />
      </div>
    </div>
  );
}

// ─── Employee version ─────────────────────────────────────────────────────────

function EmployeeTasksContent({ employeeId, role }: Props) {
  const { data, isLoading, isError } = useGetMyTasksQuery(
    { employeeId: employeeId ?? "none", role },
    { skip: !employeeId }
  );

  if (!employeeId) {
    return <p className="text-sm text-muted">Your account has no employee record linked.</p>;
  }

  if (isLoading) return <MyTasksSkeleton />;

  if (isError || !data) {
    return (
      <div className="panel px-[18px] py-6 text-sm text-blocked">
        Could not load your tasks. Please refresh.
      </div>
    );
  }

  const open = data.tasks.filter((t) => t.status !== "COMPLETED");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Your board</h1>
        <p className="mt-1 text-sm text-muted">
          {open.length === 0
            ? "Nothing open. Ask your lead what to pick up."
            : `${open.length} open · ${open.filter((t) => t.overdue).length} past due`}
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <BoardContent tasks={data.tasks} />
        <DailyUpdatePanel employeeId={employeeId} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MyTasksClient({ employeeId, role }: Props) {
  if (role === "CEO") {
    return <CeoTasksContent employeeId={employeeId} />;
  }
  return <EmployeeTasksContent employeeId={employeeId} role={role} />;
}
