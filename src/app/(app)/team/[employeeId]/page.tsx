import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canSeeEmployee } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { Panel, Progress, Status } from "@/components/ui";
import { fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function EmployeePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const user = await requireUser();
  const { employeeId } = await params;
  if (!(await canSeeEmployee(user, employeeId))) notFound();
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: { select: { name: true, email: true, systemRole: true } },
      reportsTo: { select: { user: { select: { name: true } } } },
      assignedTasks: { where: { approvalState: "APPROVED" }, include: { project: { select: { name: true } } }, orderBy: [{ status: "asc" }, { dueDate: "asc" }], take: 40 },
      memberships: { include: { project: { select: { name: true, status: true } } }, orderBy: { project: { name: "asc" } } },
      dailyUpdates: { orderBy: { forDate: "desc" }, take: 10 },
    },
  });
  if (!employee) notFound();
  const openTasks = employee.assignedTasks.filter((task) => task.status !== "COMPLETED");
  const overdue = openTasks.filter((task) => task.dueDate && task.dueDate < new Date());
  const completed = employee.assignedTasks.filter((task) => task.status === "COMPLETED");
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/team" className="text-xs text-accent">Back to team</Link><p className="eyebrow mt-4">Employee workspace</p><h1 className="page-title">{employee.user.name}</h1><p className="mt-1 text-sm text-muted">{employee.title} · {employee.department ?? "Company"} · Reports to {employee.reportsTo?.user.name ?? "CEO"}</p></div><Link href={`/tasks?assigneeId=${employee.id}`} className="btn">View task register</Link></header>
      <div className="grid gap-4 sm:grid-cols-4"><div className="metric-card"><span>Open tasks</span><strong>{openTasks.length}</strong></div><div className="metric-card"><span>Overdue</span><strong className="text-blocked">{overdue.length}</strong></div><div className="metric-card"><span>Completed</span><strong className="text-ontrack">{completed.length}</strong></div><div className="metric-card"><span>Updates posted</span><strong>{employee.dailyUpdates.length}</strong></div></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><Panel title="Current work"><div className="divide-y divide-rule">{openTasks.map((task) => <div key={task.id} className="px-[18px] py-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{task.title}</p><Status value={task.status} /></div><p className="mt-1 text-xs text-muted">{task.project?.name ?? "No project"} · {task.priority} priority{task.dueDate ? ` · due ${fmt(task.dueDate, "d MMM")}` : ""}</p><div className="mt-2"><Progress value={task.progress} tone={task.status === "BLOCKED" ? "blocked" : "ink"} /></div>{task.blockerNote && <p className="mt-2 text-xs text-blocked">Blocked: {task.blockerNote}</p>}</div>)}{openTasks.length === 0 && <p className="px-[18px] py-6 text-sm text-muted">No open tasks assigned.</p>}</div></Panel><Panel title="Responsibilities"><div className="px-[18px] py-4"><ul className="list-disc space-y-2 pl-5 text-sm">{employee.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-5 text-xs text-muted">Projects</p><ul className="mt-2 space-y-2 text-sm">{employee.memberships.map((membership) => <li key={membership.project.name}>{membership.project.name}</li>)}</ul></div></Panel></div>
      <Panel title="Recent updates"><div className="divide-y divide-rule">{employee.dailyUpdates.map((update) => <div key={update.id} className="px-[18px] py-4"><p className="text-xs text-muted">{fmt(update.forDate, "EEEE d MMMM")}</p><p className="mt-2 text-sm">{update.didToday}</p>{update.planNext && <p className="mt-1 text-sm text-muted">Next: {update.planNext}</p>}{update.blockers && <p className="mt-1 text-sm text-blocked">Blocker: {update.blockers}</p>}</div>)}{employee.dailyUpdates.length === 0 && <p className="px-[18px] py-6 text-sm text-muted">No daily updates have been posted.</p>}</div></Panel>
    </div>
  );
}
