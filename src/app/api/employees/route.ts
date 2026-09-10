import { prisma } from "@/lib/db";
import { requireUser, requireCeo } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/rbac";
import { handler, ok } from "@/lib/api";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { audit } from "@/lib/audit";
import { z } from "zod";
import { HttpError } from "@/lib/auth/session";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const user = await requireUser();
  const scope = await visibleEmployeeIds(user);
  const employees = await prisma.employee.findMany({
    where: scope === "ALL" ? undefined : { id: { in: scope } },
    include: {
      user: { select: { id: true, name: true, email: true, systemRole: true, isActive: true, lastLoginAt: true } },
      reportsTo: { select: { id: true, user: { select: { name: true } } } },
      _count: { select: { assignedTasks: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
  return ok({ employees });
});

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string(),
  title: z.string().min(2),
  department: z.string().optional(),
  systemRole: z.enum(["CEO", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  reportsToId: z.string().cuid().nullish(),
  responsibilities: z.array(z.string()).default([]),
});

export const POST = handler(async (req: Request) => {
  const user = await requireCeo();
  const input = createSchema.parse(await req.json());
  const problem = passwordProblem(input.password);
  if (problem) throw new HttpError(422, problem);

  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      systemRole: input.systemRole,
      employee: {
        create: {
          title: input.title,
          department: input.department ?? null,
          reportsToId: input.reportsToId ?? null,
          responsibilities: input.responsibilities,
        },
      },
    },
    include: { employee: true },
  });

  await audit({ actorId: user.id, action: "employee.create", entityType: "Employee", entityId: created.employee!.id });
  return ok({ employee: created.employee, user: { id: created.id, email: created.email } }, 201);
});
