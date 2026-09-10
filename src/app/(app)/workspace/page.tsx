import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui";
import { CaptureBox } from "@/components/CaptureBox";
import { IdeaBoard, ProblemBoard, ScheduleForm } from "@/components/Workspace";
import { TaskBoard, type BoardTask } from "@/components/TaskBoard";
import { fmt, addDays } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await requireUser();
  if (user.role !== "CEO") redirect("/my-tasks");

  const [tasks, ideas, problems, events, reminders, deadlines] = await Promise.all([
    prisma.task.findMany({
      where: { kind: "CEO_PERSONAL" },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
      take: 50,
    }),
    prisma.idea.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.problem.findMany({
      include: { solutions: true, owner: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { severity: "desc" }],
      take: 40,
    }),
    prisma.calendarEvent.findMany({
      where: { ownerId: user.id, startsAt: { gte: addDays(new Date(), -1) } },
      orderBy: { startsAt: "asc" },
      take: 20,
    }),
    prisma.reminder.findMany({ where: { userId: user.id, sentAt: null }, orderBy: { remindAt: "asc" }, take: 20 }),
    prisma.task.findMany({
      where: { dueDate: { gte: new Date(), lte: addDays(new Date(), 14) }, status: { not: "COMPLETED" } },
      include: { assignee: { select: { user: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" },
      take: 15,
    }),
  ]);

  const board: BoardTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    project: null,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    dueDate: task.dueDate?.toISOString() ?? null,
    blockerNote: task.blockerNote,
    overdue: Boolean(task.dueDate && task.dueDate < new Date() && task.status !== "COMPLETED"),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">My workspace</h1>
        <p className="mt-1 text-sm text-muted">Your own tasks, schedule, ideas and the problems you are carrying.</p>
      </header>

      <Panel title="Capture anything">
        <CaptureBox />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="My tasks" aside={<span className="text-xs text-muted">{board.filter((t) => t.status !== "COMPLETED").length} open</span>}>
          <TaskBoard tasks={board} />
        </Panel>

        <Panel title="My schedule">
          <ScheduleForm />
          <ul className="divide-y divide-rule text-sm">
            {events.map((event) => (
              <li key={event.id} className="px-[18px] py-2.5">
                {event.title}
                <span className="block text-xs text-muted">{fmt(event.startsAt, "EEE d MMM, HH:mm")}</span>
              </li>
            ))}
            {reminders.map((reminder) => (
              <li key={reminder.id} className="px-[18px] py-2.5">
                Reminder — {reminder.message}
                <span className="block text-xs text-muted">{fmt(reminder.remindAt, "EEE d MMM, HH:mm")}</span>
              </li>
            ))}
            {deadlines.map((task) => (
              <li key={task.id} className="px-[18px] py-2.5">
                Deadline — {task.title}
                <span className="block text-xs text-muted">
                  {fmt(task.dueDate, "EEE d MMM")} · {task.assignee?.user.name ?? "unassigned"}
                </span>
              </li>
            ))}
            {events.length + reminders.length + deadlines.length === 0 && (
              <li className="px-[18px] py-5 text-muted">Nothing scheduled in the next two weeks.</li>
            )}
          </ul>
        </Panel>

        <Panel title="My ideas">
          <IdeaBoard
            ideas={ideas.map((idea) => ({
              id: idea.id,
              title: idea.title,
              description: idea.description,
              category: idea.category,
              status: idea.status,
              priority: idea.priority,
              createdAt: idea.createdAt.toISOString(),
            }))}
          />
        </Panel>

        <Panel title="Problems and solutions">
          <ProblemBoard
            problems={problems.map((problem) => ({
              id: problem.id,
              title: problem.title,
              description: problem.description,
              severity: problem.severity,
              status: problem.status,
              owner: problem.owner?.name ?? null,
              solutions: problem.solutions.map((s) => ({ id: s.id, description: s.description, isChosen: s.isChosen })),
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}
