import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { TaskBoard, type BoardTask } from "@/components/TaskBoard";
import { DailyUpdateForm } from "@/components/DailyUpdateForm";
import { Panel } from "@/components/ui";
import { localDateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const user = await requireUser();

  const where =
    user.role === "CEO"
      ? { OR: [{ kind: "CEO_PERSONAL" as const }, { assigneeId: user.employeeId ?? "none" }] }
      : { assigneeId: user.employeeId ?? "none", approvalState: "APPROVED" as const };

  const [tasks, todayUpdate] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
      take: 100,
      skip: 1
    }),
    user.employeeId
      ? prisma.dailyUpdate.findUnique({
        where: { employeeId_forDate: { employeeId: user.employeeId, forDate: localDateOnly() } },
      })
      : null,
  ]);

  const board: BoardTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    project: task.project?.name ?? null,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    dueDate: task.dueDate?.toISOString() ?? null,
    blockerNote: task.blockerNote,
    overdue: Boolean(task.dueDate && task.dueDate < new Date() && task.status !== "COMPLETED"),
  }));

  const open = board.filter((t) => t.status !== "COMPLETED");
  const done = board.filter((t) => t.status === "COMPLETED");

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

        <Panel title="Today's update">
          <DailyUpdateForm
            existing={
              todayUpdate
                ? { didToday: todayUpdate.didToday, planNext: todayUpdate.planNext, blockers: todayUpdate.blockers }
                : null
            }
          />
        </Panel>
      </div>
    </div>
  );
}
