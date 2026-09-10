import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/client";
import { reminderEmail, overdueEmail } from "@/lib/email/templates";
import { addDays } from "@/lib/dates";

export async function runDueReminders() {
  const due = await prisma.reminder.findMany({
    where: { sentAt: null, remindAt: { lte: new Date() } },
    include: { user: { select: { email: true, name: true } } },
    take: 200,
  });

  for (const reminder of due) {
    const { subject, html } = reminderEmail({ message: reminder.message, when: reminder.remindAt });
    const result = await sendMail({ to: reminder.user.email, subject, html, template: "reminder" });
    if (result.delivered) {
      await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: new Date() } });
    }
  }
  return { sent: due.length };
}

/** Deadline warnings for anything due in the next 24 hours, once per task per day. */
export async function runDeadlineWarnings() {
  const soon = await prisma.task.findMany({
    where: {
      status: { not: "COMPLETED" },
      approvalState: "APPROVED",
      dueDate: { gte: new Date(), lte: addDays(new Date(), 1) },
      assigneeId: { not: null },
    },
    include: { assignee: { include: { user: { select: { email: true, name: true } } } }, project: { select: { name: true } } },
  });

  let sent = 0;
  for (const task of soon) {
    const alreadyWarned = await prisma.notification.findFirst({
      where: {
        userId: task.assignee!.userId,
        title: { startsWith: "Due soon:" },
        body: task.id,
        createdAt: { gte: addDays(new Date(), -1) },
      },
    });
    if (alreadyWarned) continue;
    const { subject, html } = overdueEmail({
      name: task.assignee!.user.name,
      tasks: [{ title: task.title, project: task.project?.name ?? null, dueDate: task.dueDate, priority: task.priority }],
    });
    const result = await sendMail({ to: task.assignee!.user.email, subject: subject.replace("past due", "due within a day"), html, template: "deadline_warning" });
    if (result.delivered) {
      await prisma.notification.create({
        data: { userId: task.assignee!.userId, title: `Due soon: ${task.title}`, body: task.id, link: "/my-tasks" },
      });
      sent += 1;
    }
  }
  return { warned: sent };
}

export async function runOverdueSweep() {
  const overdue = await prisma.task.findMany({
    where: {
      status: { not: "COMPLETED" },
      approvalState: "APPROVED",
      dueDate: { lt: new Date() },
      assigneeId: { not: null },
    },
    include: { assignee: { include: { user: { select: { email: true, name: true } } } }, project: { select: { name: true } } },
  });

  const byEmployee = new Map<string, { email: string; name: string; tasks: typeof overdue }>();
  for (const task of overdue) {
    const key = task.assigneeId!;
    const entry = byEmployee.get(key) ?? {
      email: task.assignee!.user.email,
      name: task.assignee!.user.name,
      tasks: [] as typeof overdue,
    };
    entry.tasks.push(task);
    byEmployee.set(key, entry);
  }

  for (const [, entry] of byEmployee) {
    const { subject, html } = overdueEmail({
      name: entry.name,
      tasks: entry.tasks.map((t) => ({
        title: t.title,
        project: t.project?.name ?? null,
        dueDate: t.dueDate,
        priority: t.priority,
      })),
    });
    await sendMail({ to: entry.email, subject, html, template: "overdue" });
  }
  return { people: byEmployee.size, tasks: overdue.length };
}
