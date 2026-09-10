import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { dailyUpdateSchema } from "@/lib/validation";
import { handler, ok, fail } from "@/lib/api";
import { emitActivity, audit } from "@/lib/audit";
import { localDateOnly } from "@/lib/dates";
import { canSeeEmployee } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  if (!user.employeeId) {
    logger.warn("Daily update rejected: employee record missing", { userId: user.id });
    return fail(400, "This account has no employee record to post updates against.");
  }

  const input = dailyUpdateSchema.parse(await req.json());
  const forDate = localDateOnly();

  logger.info("Daily update save started", {
    userId: user.id,
    employeeId: user.employeeId,
    forDate,
  });

  const update = await prisma.dailyUpdate.upsert({
    where: { employeeId_forDate: { employeeId: user.employeeId, forDate } },
    create: { employeeId: user.employeeId, forDate, ...input },
    update: { ...input },
  });

  await audit({ actorId: user.id, action: "daily_update.save", entityType: "DailyUpdate", entityId: update.id });
  await emitActivity({
    type: "daily_update.created",
    actorName: user.name,
    summary: `${user.name} posted today's update${input.blockers ? " and flagged a blocker" : ""}`,
    entityType: "DailyUpdate",
    entityId: update.id,
  });

  logger.success("Daily update saved", {
    userId: user.id,
    employeeId: user.employeeId,
    forDate,
    updateId: update.id,
  });
  return ok({ update }, 201);
});

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId") ?? user.employeeId;

  logger.info("Daily update lookup requested", {
    userId: user.id,
    employeeId,
  });

  if (!employeeId) return ok({ updates: [] });
  if (!(await canSeeEmployee(user, employeeId))) {
    logger.warn("Daily update access denied", {
      userId: user.id,
      employeeId,
    });
    return fail(403, "You cannot view updates for this employee.");
  }

  const updates = await prisma.dailyUpdate.findMany({
    where: { employeeId },
    orderBy: { forDate: "desc" },
    take: 30,
  });

  logger.success("Daily update lookup succeeded", {
    userId: user.id,
    employeeId,
    count: updates.length,
  });
  return ok({ updates });
});
