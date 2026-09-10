import type { ProjectRow } from "@/server/dashboard";
import { Progress, Status } from "@/components/ui";
import { fmt } from "@/lib/dates";

export function ProjectTable({ rows }: { rows: ProjectRow[] }) {
  const sorted = [...rows].sort(
    (a, b) => b.overdueTasks + b.blockedTasks * 2 - (a.overdueTasks + a.blockedTasks * 2),
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-rule">
            <th className="px-[18px] py-2 font-normal">Project</th>
            <th className="px-3 py-2 font-normal">Health</th>
            <th className="px-3 py-2 font-normal">Progress</th>
            <th className="px-3 py-2 font-normal">Open</th>
            <th className="px-3 py-2 font-normal">Late</th>
            <th className="px-3 py-2 font-normal">Lead</th>
            <th className="px-[18px] py-2 font-normal">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {sorted.map((row) => (
            <tr key={row.id}>
              <td className="px-[18px] py-2.5">{row.name}</td>
              <td className="px-3 py-2.5">
                <Status value={row.health} />
              </td>
              <td className="px-3 py-2.5">
                <span className="mr-2 text-xs text-muted">{row.progress}%</span>
                <Progress value={row.progress} tone={row.health === "ON_TRACK" ? "ontrack" : "ink"} />
              </td>
              <td className="px-3 py-2.5">{row.openTasks}</td>
              <td className={`px-3 py-2.5 ${row.overdueTasks ? "text-blocked" : ""}`}>{row.overdueTasks}</td>
              <td className="px-3 py-2.5 text-muted">{row.lead ?? "—"}</td>
              <td className="px-[18px] py-2.5 text-muted">{row.dueDate ? fmt(row.dueDate, "d MMM") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
