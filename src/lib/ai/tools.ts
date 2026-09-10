import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit, emitActivity } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/rbac";
import { companyOverview, teamActivity, projectHealth, openRisks } from "@/server/dashboard";
import { ceoBriefingData, heuristicFocus, employeeDailyPayload } from "@/server/reports";
import { applyTaskChange } from "@/server/tasks";
import { addDays, fmt, localDayBounds } from "@/lib/dates";
import type { SystemRole } from "@prisma/client";

/**
 * The model never touches the database. It may only call the functions below,
 * each of which re-checks the caller's permissions and logs what it did.
 */
export type ToolContext = { user: SessionUser; conversationId: string | null };

export type Tool = {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  jsonSchema: Record<string, unknown>;
  roles: SystemRole[];
  mutating: boolean;
  run: (ctx: ToolContext, input: any) => Promise<unknown>;
};

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object" as const,
  properties,
  required,
});
const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });
const enum_ = (values: string[], description: string) => ({ type: "string", enum: values, description });

const ALL: SystemRole[] = ["CEO", "MANAGER", "EMPLOYEE"];
const LEADS: SystemRole[] = ["CEO", "MANAGER"];
const CEO_ONLY: SystemRole[] = ["CEO"];

async function resolveEmployee(nameOrId: string) {
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { id: nameOrId },
        { user: { name: { contains: nameOrId, mode: "insensitive" } } },
        { user: { email: { equals: nameOrId, mode: "insensitive" } } },
      ],
    },
    include: { user: { select: { name: true, email: true, id: true } } },
  });
  if (!employee) throw new Error(`No employee matches "${nameOrId}".`);
  return employee;
}

async function resolveProject(nameOrId: string) {
  const project = await prisma.project.findFirst({
    where: { OR: [{ id: nameOrId }, { name: { contains: nameOrId, mode: "insensitive" } }, { slug: nameOrId }] },
  });
  if (!project) throw new Error(`No project matches "${nameOrId}".`);
  return project;
}

async function autoAssignEnabled() {
  const rule = await prisma.automationRule.findUnique({ where: { key: "ai_task_autoassign" } });
  return Boolean(rule?.enabled && rule.autoAssign);
}

export const tools: Tool[] = [
  {
    name: "get_dashboard_summary",
    description:
      "Company-wide snapshot: headcount, task counters, project health and the current risk list. Use this first for broad questions such as 'how are we doing today'.",
    schema: z.object({}),
    jsonSchema: obj({}),
    roles: LEADS,
    mutating: false,
    run: async () => {
      const [overview, projects, risks] = await Promise.all([companyOverview(), projectHealth(), openRisks()]);
      return {
        overview,
        projects,
        blocked: risks.blockedTasks.map((t) => ({
          task: t.title,
          who: t.assignee?.user.name ?? null,
          project: t.project?.name ?? null,
          blocker: t.blockerNote,
        })),
        dueSoon: risks.dueSoon.map((t) => ({ task: t.title, who: t.assignee?.user.name ?? null, due: fmt(t.dueDate) })),
        openProblems: risks.openProblems.map((p) => ({ title: p.title, severity: p.severity, status: p.status })),
      };
    },
  },
  {
    name: "get_employee_status",
    description:
      "What each person is working on right now, derived from their task activity and updates. Omit 'employee' for the whole team.",
    schema: z.object({ employee: z.string().optional() }),
    jsonSchema: obj({ employee: str("Name, email or id. Leave empty for everyone.") }),
    roles: ALL,
    mutating: false,
    run: async (ctx, input: { employee?: string }) => {
      const scope = await visibleEmployeeIds(ctx.user);
      let ids = scope === "ALL" ? undefined : scope;
      if (input.employee) {
        const employee = await resolveEmployee(input.employee);
        if (scope !== "ALL" && !scope.includes(employee.id)) throw new Error("You are not authorised to view that person.");
        ids = [employee.id];
      }
      const rows = await teamActivity(ids);
      return rows.map((r) => ({
        name: r.name,
        role: r.title,
        project: r.currentProject,
        task: r.currentTask,
        status: r.taskStatus,
        progress: r.progress,
        openTasks: r.openTasks,
        overdue: r.overdueTasks,
        blocker: r.blocker,
        lastUpdate: r.lastUpdateAt ? fmt(r.lastUpdateAt) : "no updates recorded",
      }));
    },
  },
  {
    name: "get_employee_tasks",
    description: "The task list for one person, optionally filtered by status.",
    schema: z.object({
      employee: z.string(),
      status: z
        .enum(["NOT_STARTED", "STARTED", "IN_PROGRESS", "WAITING_FOR_REVIEW", "BLOCKED", "COMPLETED", "OVERDUE", "ALL"])
        .default("ALL"),
    }),
    jsonSchema: obj(
      {
        employee: str("Name, email or id."),
        status: enum_(
          ["NOT_STARTED", "STARTED", "IN_PROGRESS", "WAITING_FOR_REVIEW", "BLOCKED", "COMPLETED", "OVERDUE", "ALL"],
          "Filter. OVERDUE means past its due date and unfinished.",
        ),
      },
      ["employee"],
    ),
    roles: ALL,
    mutating: false,
    run: async (ctx, input: { employee: string; status: string }) => {
      const employee = await resolveEmployee(input.employee);
      const scope = await visibleEmployeeIds(ctx.user);
      if (scope !== "ALL" && !scope.includes(employee.id)) throw new Error("You are not authorised to view that person.");
      const where: any = { assigneeId: employee.id };
      if (input.status === "OVERDUE") {
        where.dueDate = { lt: new Date() };
        where.status = { not: "COMPLETED" };
      } else if (input.status && input.status !== "ALL") {
        where.status = input.status;
      }
      const tasks = await prisma.task.findMany({
        where,
        include: { project: { select: { name: true } } },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        take: 50,
      });
      return tasks.map((t) => ({
        id: t.id,
        title: t.title,
        project: t.project?.name ?? null,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        due: t.dueDate ? fmt(t.dueDate, "d MMM") : null,
        blocker: t.blockerNote,
        approval: t.approvalState,
      }));
    },
  },
  {
    name: "get_project_status",
    description: "Progress, health and open work for one project, or all projects when no name is given.",
    schema: z.object({ project: z.string().optional() }),
    jsonSchema: obj({ project: str("Project name or id. Leave empty for all projects.") }),
    roles: ALL,
    mutating: false,
    run: async (_ctx, input: { project?: string }) => {
      const rows = await projectHealth();
      if (!input.project) return rows;
      const match = rows.find((r) => r.name.toLowerCase().includes(input.project!.toLowerCase()));
      if (!match) throw new Error(`No project matches "${input.project}".`);
      const tasks = await prisma.task.findMany({
        where: { projectId: match.id, status: { not: "COMPLETED" } },
        include: { assignee: { select: { user: { select: { name: true } } } } },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      });
      return {
        ...match,
        openWork: tasks.map((t) => ({
          title: t.title,
          who: t.assignee?.user.name ?? null,
          status: t.status,
          due: t.dueDate ? fmt(t.dueDate, "d MMM") : null,
        })),
      };
    },
  },
  {
    name: "create_task",
    description:
      "Create a task. Only create work you were explicitly asked to create — never invent development work. Unless auto-assignment is switched on, the task is saved as a suggestion awaiting the CEO's approval.",
    schema: z.object({
      title: z.string().min(3),
      description: z.string().optional(),
      employee: z.string().optional(),
      project: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
      dueDate: z.string().optional(),
      scheduledFor: z.string().optional(),
      rationale: z.string().optional(),
      ceoPersonal: z.boolean().default(false),
    }),
    jsonSchema: obj(
      {
        title: str("Short imperative title."),
        description: str("What done looks like."),
        employee: str("Who it is for — name, email or id."),
        project: str("Project name."),
        priority: enum_(["LOW", "MEDIUM", "HIGH", "CRITICAL"], "Priority."),
        dueDate: str("ISO date or datetime."),
        scheduledFor: str("ISO date the person should work on it."),
        rationale: str("Why you are proposing this task."),
        ceoPersonal: { type: "boolean", description: "True for the CEO's own private task list." },
      },
      ["title"],
    ),
    roles: LEADS,
    mutating: true,
    run: async (ctx, input: any) => {
      const employee = input.employee ? await resolveEmployee(input.employee) : null;
      const project = input.project ? await resolveProject(input.project) : null;
      const auto = await autoAssignEnabled();
      const isCeoPersonal = Boolean(input.ceoPersonal) && ctx.user.role === "CEO";

      const task = await prisma.task.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          kind: isCeoPersonal ? "CEO_PERSONAL" : "TEAM",
          priority: input.priority ?? "MEDIUM",
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
          assigneeId: isCeoPersonal ? null : employee?.id ?? null,
          projectId: project?.id ?? null,
          createdById: ctx.user.id,
          source: "AI_ASSISTANT",
          aiRationale: input.rationale ?? null,
          approvalState: auto || isCeoPersonal ? "APPROVED" : "PENDING_APPROVAL",
          approvedById: auto || isCeoPersonal ? ctx.user.id : null,
          approvedAt: auto || isCeoPersonal ? new Date() : null,
        },
      });

      await audit({ actorId: ctx.user.id, action: "task.create.ai", entityType: "Task", entityId: task.id });
      await emitActivity({
        type: "task.created",
        actorName: `${ctx.user.name} (via assistant)`,
        summary: `${task.approvalState === "PENDING_APPROVAL" ? "Suggested" : "Created"} “${task.title}”${
          employee ? ` for ${employee.user.name}` : ""
        }`,
        entityType: "Task",
        entityId: task.id,
      });

      return {
        id: task.id,
        title: task.title,
        assignedTo: employee?.user.name ?? null,
        state: task.approvalState,
        note:
          task.approvalState === "PENDING_APPROVAL"
            ? "Saved as a suggestion. It appears in Pending approvals and is not visible to the assignee until approved."
            : "Created and assigned.",
      };
    },
  },
  {
    name: "update_task",
    description: "Change an existing task's status, progress, priority, dates or add a comment.",
    schema: z.object({
      taskId: z.string(),
      status: z
        .enum(["NOT_STARTED", "STARTED", "IN_PROGRESS", "WAITING_FOR_REVIEW", "BLOCKED", "COMPLETED"])
        .optional(),
      progress: z.number().min(0).max(100).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      dueDate: z.string().optional(),
      comment: z.string().optional(),
    }),
    jsonSchema: obj(
      {
        taskId: str("Task id from a previous lookup."),
        status: enum_(
          ["NOT_STARTED", "STARTED", "IN_PROGRESS", "WAITING_FOR_REVIEW", "BLOCKED", "COMPLETED"],
          "New status.",
        ),
        progress: num("0–100."),
        priority: enum_(["LOW", "MEDIUM", "HIGH", "CRITICAL"], "New priority."),
        dueDate: str("ISO date."),
        comment: str("Comment to append to the task history."),
      },
      ["taskId"],
    ),
    roles: LEADS,
    mutating: true,
    run: async (ctx, input: any) => {
      const task = await applyTaskChange(ctx.user, input.taskId, {
        status: input.status,
        progress: input.progress,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        comment: input.comment,
      });
      return { id: task.id, title: task.title, status: task.status, progress: task.progress };
    },
  },
  {
    name: "assign_task",
    description: "Move an existing task to a different person.",
    schema: z.object({ taskId: z.string(), employee: z.string() }),
    jsonSchema: obj({ taskId: str("Task id."), employee: str("Name, email or id.") }, ["taskId", "employee"]),
    roles: LEADS,
    mutating: true,
    run: async (ctx, input: any) => {
      const employee = await resolveEmployee(input.employee);
      const task = await applyTaskChange(ctx.user, input.taskId, { assigneeId: employee.id });
      return { id: task.id, title: task.title, assignedTo: employee.user.name };
    },
  },
  {
    name: "schedule_task",
    description: "Set the date a task is scheduled for and optionally its due date.",
    schema: z.object({ taskId: z.string(), scheduledFor: z.string(), dueDate: z.string().optional() }),
    jsonSchema: obj(
      { taskId: str("Task id."), scheduledFor: str("ISO date."), dueDate: str("ISO date.") },
      ["taskId", "scheduledFor"],
    ),
    roles: LEADS,
    mutating: true,
    run: async (ctx, input: any) => {
      const task = await applyTaskChange(ctx.user, input.taskId, {
        scheduledFor: new Date(input.scheduledFor),
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      });
      return { id: task.id, title: task.title, scheduledFor: fmt(task.scheduledFor), due: fmt(task.dueDate) };
    },
  },
  {
    name: "create_reminder",
    description: "Set a reminder for the current user. It is emailed at the requested time.",
    schema: z.object({ message: z.string(), remindAt: z.string() }),
    jsonSchema: obj({ message: str("What to remind about."), remindAt: str("ISO datetime.") }, ["message", "remindAt"]),
    roles: ALL,
    mutating: true,
    run: async (ctx, input: any) => {
      const reminder = await prisma.reminder.create({
        data: { message: input.message, remindAt: new Date(input.remindAt), userId: ctx.user.id },
      });
      await audit({ actorId: ctx.user.id, action: "reminder.create.ai", entityType: "Reminder", entityId: reminder.id });
      return { id: reminder.id, message: reminder.message, at: fmt(reminder.remindAt) };
    },
  },
  {
    name: "add_idea",
    description: "Capture an idea in the CEO workspace.",
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    }),
    jsonSchema: obj(
      {
        title: str("Short title."),
        description: str("Detail."),
        category: str("e.g. Product, Hiring, Sales."),
        priority: enum_(["LOW", "MEDIUM", "HIGH", "CRITICAL"], "Priority."),
      },
      ["title"],
    ),
    roles: ALL,
    mutating: true,
    run: async (ctx, input: any) => {
      const idea = await prisma.idea.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          category: input.category ?? null,
          priority: input.priority ?? "MEDIUM",
          authorId: ctx.user.id,
        },
      });
      return { id: idea.id, title: idea.title, status: idea.status };
    },
  },
  {
    name: "add_problem",
    description: "Log a company problem so it can be tracked to resolution.",
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
      owner: z.string().optional(),
    }),
    jsonSchema: obj(
      {
        title: str("Short title."),
        description: str("What is going wrong."),
        category: str("e.g. Delivery, Hiring, Cash."),
        severity: enum_(["LOW", "MEDIUM", "HIGH", "CRITICAL"], "Severity."),
        owner: str("Who owns it — name or email."),
      },
      ["title"],
    ),
    roles: ALL,
    mutating: true,
    run: async (ctx, input: any) => {
      const owner = input.owner ? await resolveEmployee(input.owner) : null;
      const problem = await prisma.problem.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          category: input.category ?? null,
          severity: input.severity ?? "MEDIUM",
          reportedById: ctx.user.id,
          ownerId: owner?.user.id ?? null,
        },
      });
      return { id: problem.id, title: problem.title, severity: problem.severity, owner: owner?.user.name ?? null };
    },
  },
  {
    name: "generate_daily_report",
    description: "The same data used for the morning briefing: counters, team, projects, risks and new activity.",
    schema: z.object({}),
    jsonSchema: obj({}),
    roles: LEADS,
    mutating: false,
    run: async () => {
      const data = await ceoBriefingData();
      return {
        overview: data.overview,
        team: data.team.map((t) => ({
          name: t.name,
          task: t.currentTask,
          open: t.openTasks,
          overdue: t.overdueTasks,
          blocker: t.blocker,
        })),
        projectsNeedingAttention: data.delayedProjects,
        risks: data.risks,
        newActivity: data.newActivity,
        suggestedFocus: heuristicFocus(data),
      };
    },
  },
  {
    name: "generate_weekly_report",
    description: "Seven-day view: what was completed, what slipped, and per-project movement.",
    schema: z.object({}),
    jsonSchema: obj({}),
    roles: LEADS,
    mutating: false,
    run: async () => {
      const since = addDays(new Date(), -7);
      const [completed, created, slipped, projects] = await Promise.all([
        prisma.task.findMany({
          where: { status: "COMPLETED", completedAt: { gte: since } },
          include: { assignee: { select: { user: { select: { name: true } } } }, project: { select: { name: true } } },
        }),
        prisma.task.count({ where: { createdAt: { gte: since } } }),
        prisma.task.findMany({
          where: { dueDate: { gte: since, lt: new Date() }, status: { not: "COMPLETED" } },
          include: { assignee: { select: { user: { select: { name: true } } } } },
        }),
        projectHealth(),
      ]);
      const byPerson: Record<string, number> = {};
      for (const t of completed) {
        const name = t.assignee?.user.name ?? "Unassigned";
        byPerson[name] = (byPerson[name] ?? 0) + 1;
      }
      return {
        window: `${fmt(since, "d MMM")} – ${fmt(new Date(), "d MMM")}`,
        completedCount: completed.length,
        createdCount: created,
        completedByPerson: byPerson,
        slipped: slipped.map((t) => ({ title: t.title, who: t.assignee?.user.name ?? null, due: fmt(t.dueDate, "d MMM") })),
        projects,
      };
    },
  },
  {
    name: "draft_email",
    description:
      "Draft an email for the CEO to review. This only returns text — it never sends anything.",
    schema: z.object({ to: z.string(), purpose: z.string(), tone: z.string().optional() }),
    jsonSchema: obj({ to: str("Recipient name or email."), purpose: str("What the email must achieve."), tone: str("e.g. direct, warm.") }, ["to", "purpose"]),
    roles: LEADS,
    mutating: false,
    run: async (_ctx, input: any) => ({
      to: input.to,
      instruction:
        "Write the draft yourself in your reply using the context you already gathered. Nothing has been sent; the CEO copies it from the chat.",
      purpose: input.purpose,
      tone: input.tone ?? "direct and warm",
    }),
  },
  {
    name: "get_my_day",
    description: "The signed-in person's own board: today, overdue, blocked and upcoming.",
    schema: z.object({}),
    jsonSchema: obj({}),
    roles: ALL,
    mutating: false,
    run: async (ctx) => {
      if (!ctx.user.employeeId) return { note: "This account has no employee record." };
      const payload = await employeeDailyPayload(ctx.user.employeeId);
      const { key } = localDayBounds();
      return { date: key, ...payload };
    },
  },
  {
    name: "approve_suggested_task",
    description: "Approve or reject a task that is awaiting approval.",
    schema: z.object({ taskId: z.string(), decision: z.enum(["APPROVE", "REJECT"]) }),
    jsonSchema: obj({ taskId: str("Task id."), decision: enum_(["APPROVE", "REJECT"], "Decision.") }, ["taskId", "decision"]),
    roles: CEO_ONLY,
    mutating: true,
    run: async (ctx, input: any) => {
      const task = await prisma.task.update({
        where: { id: input.taskId },
        data: {
          approvalState: input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
          approvedById: ctx.user.id,
          approvedAt: new Date(),
        },
      });
      await audit({ actorId: ctx.user.id, action: `task.${input.decision.toLowerCase()}`, entityType: "Task", entityId: task.id });
      return { id: task.id, title: task.title, state: task.approvalState };
    },
  },
];

export const toolsByName = new Map(tools.map((t) => [t.name, t]));

export function toolsFor(role: SystemRole) {
  return tools.filter((t) => t.roles.includes(role));
}

export function anthropicToolDefs(role: SystemRole) {
  return toolsFor(role).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.jsonSchema as { type: "object" },
  }));
}
