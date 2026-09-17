import type { CompanyOverview } from "@/redux/api/dashboardApi";
import Link from "next/link";

const ORDER: { key: keyof CompanyOverview; label: string; href: string; alert?: boolean }[] = [
  { key: "tasksInProgress", label: "in progress", href: "/tasks?status=IN_PROGRESS" },
  { key: "completedToday", label: "done today", href: "/tasks?status=COMPLETED" },
  { key: "overdue", label: "overdue", href: "/tasks?status=OVERDUE", alert: true },
  { key: "blocked", label: "blocked", href: "/tasks?status=BLOCKED", alert: true },
  { key: "awaitingReview", label: "await review", href: "/tasks?status=WAITING_FOR_REVIEW" },
  { key: "upcomingDeadlines", label: "due in 7 days", href: "/tasks?status=UPCOMING" },
  { key: "projectsAtRisk", label: "projects at risk", href: "/projects?health=AT_RISK" },
  { key: "employeesWithoutActiveTask", label: "without active task", href: "/team?filter=unassigned" },
];

export function SignalStrip({ overview }: { overview: CompanyOverview }) {
  return (
    <div className="panel grid grid-cols-2 divide-rule sm:grid-cols-4 xl:grid-cols-8">
      {ORDER.map((item, index) => {
        const value = overview[item.key];
        const alarmed = item.alert && value > 0;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`px-4 py-3 ${index % 2 === 1 ? "border-l border-rule" : ""} sm:border-l sm:first:border-l-0 sm:[&:nth-child(5)]:border-l xl:[&:nth-child(5)]:border-l`}
          >
            <div className={`text-[26px] font-semibold leading-none ${alarmed ? "text-blocked" : "text-ink"}`}>
              {value}
            </div>
            <div className="mt-1.5 text-xs text-muted">{item.label}</div>
          </Link>
        );
      })}
    </div>
  );
}
