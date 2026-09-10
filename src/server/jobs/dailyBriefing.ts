import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/email/client";
import { ceoDailyEmail, employeeDailyEmail } from "@/lib/email/templates";
import { ceoBriefingData, employeeDailyPayload } from "@/server/reports";
import { ceoFocus } from "@/lib/ai/focus";
import { emitActivity } from "@/lib/audit";
import { localDateKey, addDays } from "@/lib/dates";

/** Materialises today's copy of every recurring task. */
export async function spawnRecurringTasks() {
  const templates = await prisma.task.findMany({
    where: { isRecurring: true, approvalState: "APPROVED" },
  });
  const today = new Date();
  const key = localDateKey(today);
  const weekday = today.getUTCDay();
  let created = 0;

  for (const template of templates) {
    const rule = (template.recurrenceRule ?? "DAILY").toUpperCase();
    const dueToday =
      rule === "DAILY" ||
      (rule === "WEEKDAYS" && weekday >= 1 && weekday <= 5) ||
      (rule.startsWith("WEEKLY:") && rule.split(":")[1] === ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][weekday]) ||
      (rule.startsWith("MONTHLY:") && Number(rule.split(":")[1]) === today.getUTCDate());
    if (!dueToday) continue;
    if (template.lastSpawnedAt && localDateKey(template.lastSpawnedAt) === key) continue;

    await prisma.task.create({
      data: {
        title: template.title,
        description: template.description,
        projectId: template.projectId,
        assigneeId: template.assigneeId,
        createdById: template.createdById,
        priority: template.priority,
        estimatedMinutes: template.estimatedMinutes,
        scheduledFor: new Date(),
        dueDate: addDays(new Date(), 1),
        kind: template.kind,
        tags: template.tags,
        source: "AUTOMATION",
      },
    });
    await prisma.task.update({ where: { id: template.id }, data: { lastSpawnedAt: new Date() } });
    created += 1;
  }
  return created;
}

export async function runDailyBriefing() {
  const rule = await prisma.automationRule.findUnique({ where: { key: "daily_briefing" } });
  if (rule && !rule.enabled) return { skipped: "daily_briefing automation is switched off" };

  const recurringCreated = await spawnRecurringTasks();

  // ── employees ──
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: { user: { select: { name: true, email: true, isActive: true } } },
  });

  let employeeEmails = 0;
  const workload: { name: string; items: number }[] = [];

  for (const employee of employees) {
    if (!employee.user.isActive) continue;
    const payload = await employeeDailyPayload(employee.id);
    workload.push({ name: employee.user.name, items: payload.workload });
    const { subject, html } = employeeDailyEmail({
      name: employee.user.name.split(" ")[0],
      today: payload.today,
      overdue: payload.overdue,
      blocked: payload.blocked,
      upcoming: payload.upcoming,
    });
    await sendMail({ to: employee.user.email, subject, html, template: "employee_daily" });
    employeeEmails += 1;
  }

  // ── CEO ──
  const data = await ceoBriefingData();
  const focus = await ceoFocus(data);
  const ceos = await prisma.user.findMany({ where: { systemRole: "CEO", isActive: true } });

  for (const ceo of ceos) {
    const { subject, html } = ceoDailyEmail({
      overview: data.overview as unknown as Record<string, number>,
      team: data.team.map((t) => ({
        name: t.name,
        currentTask: t.currentTask,
        openTasks: t.openTasks,
        overdueTasks: t.overdueTasks,
        blocker: t.blocker,
      })),
      delayedProjects: data.delayedProjects,
      risks: data.risks,
      focus,
      newActivity: data.newActivity,
    });
    await sendMail({ to: ceo.email, subject, html, template: "ceo_daily" });
    await prisma.notification.create({
      data: { userId: ceo.id, title: "Morning briefing ready", body: focus[0] ?? null, link: "/dashboard" },
    });
  }

  await emitActivity({
    type: "briefing.sent",
    actorName: "Automation",
    summary: `Morning briefing sent to ${employeeEmails} employees and ${ceos.length} CEO account(s)`,
  });

  return {
    date: localDateKey(),
    timezone: env.companyTimezone,
    employeeEmails,
    ceoEmails: ceos.length,
    recurringCreated,
    workload,
    focus,
  };
}
