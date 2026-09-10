import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { reminderSchema } from "@/lib/validation";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const user = await requireUser();
  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id, sentAt: null },
    orderBy: { remindAt: "asc" },
    take: 50,
  });
  return ok({ reminders });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = reminderSchema.parse(await req.json());
  const reminder = await prisma.reminder.create({
    data: { message: input.message, remindAt: input.remindAt, taskId: input.taskId ?? null, userId: user.id },
  });
  return ok({ reminder }, 201);
});
