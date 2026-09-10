import { z } from "zod";

export const taskStatus = z.enum([
  "NOT_STARTED",
  "STARTED",
  "IN_PROGRESS",
  "WAITING_FOR_REVIEW",
  "BLOCKED",
  "COMPLETED",
]);
export const priority = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const severity = priority;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const createTaskSchema = z.object({
  title: z.string().min(3, "Give the task a title of at least 3 characters.").max(200),
  description: z.string().max(5000).optional(),
  projectId: z.string().cuid().nullish(),
  assigneeId: z.string().cuid().nullish(),
  priority: priority.default("MEDIUM"),
  dueDate: z.coerce.date().nullish(),
  scheduledFor: z.coerce.date().nullish(),
  estimatedMinutes: z.number().int().min(5).max(2400).nullish(),
  kind: z.enum(["TEAM", "CEO_PERSONAL"]).default("TEAM"),
  tags: z.array(z.string().max(30)).max(10).default([]),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().max(40).nullish(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).nullish(),
  status: taskStatus.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  priority: priority.optional(),
  dueDate: z.coerce.date().nullish(),
  scheduledFor: z.coerce.date().nullish(),
  assigneeId: z.string().cuid().nullish(),
  projectId: z.string().cuid().nullish(),
  blockerNote: z.string().max(1000).nullish(),
  comment: z.string().max(2000).optional(),
});

export const dailyUpdateSchema = z.object({
  didToday: z.string().min(5, "Say a little more about today."),
  planNext: z.string().max(2000).optional(),
  blockers: z.string().max(2000).optional(),
  moodScore: z.number().int().min(1).max(5).optional(),
});

export const ideaSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().max(60).optional(),
  priority: priority.default("MEDIUM"),
});

export const problemSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().max(60).optional(),
  severity: severity.default("MEDIUM"),
  ownerId: z.string().cuid().nullish(),
});

export const solutionSchema = z.object({
  problemId: z.string().cuid(),
  description: z.string().min(3).max(5000),
  isChosen: z.boolean().default(false),
});

export const eventSchema = z.object({
  title: z.string().min(3).max(200),
  notes: z.string().max(2000).optional(),
  type: z.enum(["MEETING", "PROJECT_REVIEW", "DEADLINE", "FOCUS_BLOCK", "OTHER"]).default("MEETING"),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullish(),
  location: z.string().max(200).optional(),
});

export const reminderSchema = z.object({
  message: z.string().min(3).max(500),
  remindAt: z.coerce.date(),
  taskId: z.string().cuid().nullish(),
});

export const captureSchema = z.object({
  text: z.string().min(3).max(2000),
  type: z.enum(["AUTO", "IDEA", "TASK", "REMINDER", "PROBLEM", "GOAL"]).default("AUTO"),
});
