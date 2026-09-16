import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { captureSchema } from "@/lib/validation";
import { handler, ok } from "@/lib/api";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";



type Classification = {
  type: "IDEA" | "TASK" | "REMINDER" | "PROBLEM" | "GOAL";
  title: string;
  detail?: string;
  category?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  remindAt?: string;
};

/** Keyword fallback so the capture box still works without an API key. */
function guess(text: string): Classification {
  const t = text.toLowerCase();
  const title = text.length > 90 ? `${text.slice(0, 87)}…` : text;
  if (/(remind|remember to|at \d|tomorrow|tonight|next week)/.test(t)) return { type: "REMINDER", title };
  if (/(broken|issue|problem|failing|bug|delay|risk|churn|complaint)/.test(t)) return { type: "PROBLEM", title, severity: "MEDIUM" };
  if (/(idea|what if|we could|maybe we|concept)/.test(t)) return { type: "IDEA", title };
  if (/(goal|target|by q[1-4]|by 20\d\d|aim to)/.test(t)) return { type: "GOAL", title };
  return { type: "TASK", title };
}

async function classify(text: string): Promise<Classification> {
  if (!env.anthropicKey) return guess(text);
  try {
    const anthropic = new Anthropic({ apiKey: env.anthropicKey });
    const response = await anthropic.messages.create({
      model: env.anthropicModel,
      max_tokens: 400,
      system:
        "Classify one line of CEO shorthand. Reply with JSON only, no prose and no code fences. " +
        'Shape: {"type":"IDEA|TASK|REMINDER|PROBLEM|GOAL","title":"short title","detail":"optional","category":"optional",' +
        '"priority":"LOW|MEDIUM|HIGH|CRITICAL","severity":"LOW|MEDIUM|HIGH|CRITICAL","remindAt":"ISO datetime if a time was implied"}. ' +
        `Today is ${new Date().toISOString()}. A GOAL is a longer-term outcome and is stored as an idea.`,
      messages: [{ role: "user", content: text }],
    });
    const raw = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();
    return { ...guess(text), ...(JSON.parse(raw) as Classification) };
  } catch {
    return guess(text);
  }
}

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = captureSchema.parse(await req.json());
  const classified = input.type === "AUTO" ? await classify(input.text) : { ...guess(input.text), type: input.type };

  let created: { kind: string; id: string; title: string; where: string };

  switch (classified.type) {
    case "REMINDER": {
      const remindAt = classified.remindAt ? new Date(classified.remindAt) : new Date(Date.now() + 86_400_000);
      const reminder = await prisma.reminder.create({
        data: { message: classified.title, remindAt, userId: user.id },
      });
      created = { kind: "Reminder", id: reminder.id, title: reminder.message, where: "My schedule" };
      break;
    }
    case "PROBLEM": {
      const problem = await prisma.problem.create({
        data: {
          title: classified.title,
          description: classified.detail ?? input.text,
          category: classified.category ?? null,
          severity: classified.severity ?? "MEDIUM",
          reportedById: user.id,
        },
      });
      created = { kind: "Problem", id: problem.id, title: problem.title, where: "Problems & solutions" };
      break;
    }
    case "TASK": {
      const task = await prisma.task.create({
        data: {
          title: classified.title,
          description: classified.detail ?? null,
          kind: user.role === "CEO" ? "CEO_PERSONAL" : "TEAM",
          assigneeId: user.role === "CEO" ? null : user.employeeId,
          priority: classified.priority ?? "MEDIUM",
          createdById: user.id,
          approvalState: "APPROVED",
        },
      });
      created = { kind: "Task", id: task.id, title: task.title, where: "My tasks" };
      break;
    }
    default: {
      const idea = await prisma.idea.create({
        data: {
          title: classified.title,
          description: classified.detail ?? input.text,
          category: classified.category ?? (classified.type === "GOAL" ? "Goal" : null),
          priority: classified.priority ?? "MEDIUM",
          authorId: user.id,
        },
      });
      created = { kind: "Idea", id: idea.id, title: idea.title, where: "My ideas" };
    }
  }

  await audit({ actorId: user.id, action: "capture", entityType: created.kind, entityId: created.id });
  return ok({ classifiedAs: classified.type, created }, 201);
});
