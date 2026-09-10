import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { eventSchema } from "@/lib/validation";
import { handler, ok } from "@/lib/api";
import { addDays } from "@/lib/dates";

export const runtime = "nodejs";

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? 14);

  const [events, deadlines] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { ownerId: user.id, startsAt: { gte: addDays(new Date(), -1), lte: addDays(new Date(), days) } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.task.findMany({
      where: {
        dueDate: { gte: new Date(), lte: addDays(new Date(), days) },
        status: { not: "COMPLETED" },
        OR: [{ assigneeId: user.employeeId ?? undefined }, { createdById: user.id }],
      },
      select: { id: true, title: true, dueDate: true, priority: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);
  return ok({ events, deadlines });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = eventSchema.parse(await req.json());
  const event = await prisma.calendarEvent.create({
    data: {
      title: input.title,
      notes: input.notes ?? null,
      type: input.type,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      location: input.location ?? null,
      ownerId: user.id,
    },
  });
  return ok({ event }, 201);
});
