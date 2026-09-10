import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Panel, Status } from "@/components/ui";
import { fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireUser();
  const from = new Date();
  const to = new Date(Date.now() + 14 * 86400000);
  const [events, tasks, reminders] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { ownerId: user.id, startsAt: { gte: from, lte: to } }, orderBy: { startsAt: "asc" }, take: 40 }),
    prisma.task.findMany({ where: { OR: [{ assigneeId: user.employeeId ?? "none" }, { kind: user.role === "CEO" ? "CEO_PERSONAL" : "TEAM" }], scheduledFor: { gte: from, lte: to }, status: { not: "COMPLETED" } }, include: { project: { select: { name: true } } }, orderBy: { scheduledFor: "asc" }, take: 40 }),
    prisma.reminder.findMany({ where: { userId: user.id, sentAt: null, remindAt: { gte: from, lte: to } }, orderBy: { remindAt: "asc" }, take: 40 }),
  ]);
  return (
    <div className="space-y-6">
      <header><p className="eyebrow">Planning</p><h1 className="page-title">Calendar</h1><p className="mt-1 text-sm text-muted">The next fourteen days of commitments, scheduled work, and reminders.</p></header>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Scheduled work"><ul className="divide-y divide-rule">{tasks.map((task) => <li key={task.id} className="px-[18px] py-3"><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-muted">{task.project?.name ?? "Personal"} · {fmt(task.scheduledFor!, "EEE d MMM, HH:mm")}</p><Status value={task.status} /></li>)}{tasks.length === 0 && <li className="px-[18px] py-5 text-sm text-muted">No scheduled tasks.</li>}</ul></Panel>
        <Panel title="Meetings and events"><ul className="divide-y divide-rule">{events.map((event) => <li key={event.id} className="px-[18px] py-3"><p className="font-medium">{event.title}</p><p className="mt-1 text-xs text-muted">{fmt(event.startsAt, "EEE d MMM, HH:mm")} · {event.type.toLowerCase().replace(/_/g, " ")}</p>{event.location && <p className="text-xs text-muted">{event.location}</p>}</li>)}{events.length === 0 && <li className="px-[18px] py-5 text-sm text-muted">No events scheduled.</li>}</ul></Panel>
        <Panel title="Reminders"><ul className="divide-y divide-rule">{reminders.map((reminder) => <li key={reminder.id} className="px-[18px] py-3"><p className="font-medium">{reminder.message}</p><p className="mt-1 text-xs text-muted">{fmt(reminder.remindAt, "EEE d MMM, HH:mm")}</p></li>)}{reminders.length === 0 && <li className="px-[18px] py-5 text-sm text-muted">No upcoming reminders.</li>}</ul></Panel>
      </div>
    </div>
  );
}
