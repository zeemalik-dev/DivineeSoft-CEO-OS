import type { TeamRow } from "@/server/dashboard";
import { Progress, Status } from "@/components/ui";
import { relative } from "@/lib/dates";
import Link from "next/link";

export function TeamRoster({ rows }: { rows: TeamRow[] }) {
  return (
    <div className="divide-y divide-rule">
      {rows.map((row) => (
        <article key={row.employeeId} className="grid gap-2 px-[18px] py-4 sm:grid-cols-[190px_1fr] sm:gap-5">
          <div>
            <Link href={`/team/${row.employeeId}`} className="font-medium leading-tight hover:text-accent">
              {row.name}
            </Link>
            <p className="text-xs text-muted">{row.title}</p>
            <p className="mt-1 text-xs text-muted">
              {row.openTasks} open
              {row.overdueTasks > 0 && <span className="text-blocked"> · {row.overdueTasks} overdue</span>}
            </p>
          </div>

          <div className="min-w-0">
            {row.currentTask ? (
              <>
                <p className="truncate text-sm">{row.currentTask}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {row.currentProject ?? "No project"} · <Status value={row.taskStatus} /> · {row.progress}% ·{" "}
                  {relative(row.lastUpdateAt)}
                </p>
                <div className="mt-2">
                  <Progress
                    value={row.progress}
                    tone={row.taskStatus === "BLOCKED" ? "blocked" : row.progress >= 60 ? "ontrack" : "ink"}
                  />
                </div>
                {row.blocker && <p className="mt-2 text-xs text-blocked">Blocked: {row.blocker}</p>}
              </>
            ) : (
              <p className="text-sm text-muted">
                Nothing assigned. Give them work or ask what they are picking up.
              </p>
            )}
          </div>
        </article>
      ))}
      <p className="px-[18px] py-3 text-xs text-muted">
        Activity comes from tasks and updates people record here. Nothing on anyone&apos;s machine is monitored.
      </p>
    </div>
  );
}
