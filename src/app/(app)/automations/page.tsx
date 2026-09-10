import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Panel, Status } from "@/components/ui";
import { fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const user = await requireUser();
  if (user.role !== "CEO") redirect("/my-tasks");
  const [rules, jobs] = await Promise.all([prisma.automationRule.findMany({ orderBy: { name: "asc" } }), prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 })]);
  return (
    <div className="space-y-6">
      <header><p className="eyebrow">Operations control</p><h1 className="page-title">Automation center</h1><p className="mt-1 text-sm text-muted">Review the routines that keep briefings, reminders, and escalations moving.</p></header>
      <Panel title="Automation rules"><div className="divide-y divide-rule">{rules.map((rule) => <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-4"><div><p className="font-medium">{rule.name}</p><p className="mt-1 text-xs text-muted">{rule.description ?? rule.key}</p></div><div className="text-right text-xs"><p className={rule.enabled ? "text-ontrack" : "text-muted"}>{rule.enabled ? "Enabled" : "Paused"}</p><p className="mt-1 text-muted">{rule.autoAssign ? "Auto assignment on" : "Approval required"}</p></div></div>)}{rules.length === 0 && <p className="px-[18px] py-5 text-sm text-muted">No automation rules configured.</p>}</div></Panel>
      <Panel title="Recent job history"><div className="divide-y divide-rule">{jobs.map((job) => <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3"><div><p className="font-medium">{job.jobKey}</p><p className="text-xs text-muted">{job.runKey} · started {fmt(job.startedAt, "d MMM HH:mm")}</p></div><Status value={job.ok ? "COMPLETED" : "BLOCKED"} /></div>)}{jobs.length === 0 && <p className="px-[18px] py-5 text-sm text-muted">No automation runs recorded yet.</p>}</div></Panel>
    </div>
  );
}
