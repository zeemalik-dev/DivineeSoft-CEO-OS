import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

export const POST = handler(async (req: Request) => {
  const ip = clientIp(req) ?? "unknown";
  rateLimit(`login:${ip}`, 10, 60_000);

  const body = loginSchema.parse(await req.json());
  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    include: { employee: { select: { id: true } } },
  });

  // Same message either way — never reveal which accounts exist.
  const wrong = () => fail(401, "That email and password combination did not work.");
  if (!user || !user.isActive) return wrong();
  if (!(await verifyPassword(body.password, user.passwordHash))) {
    await audit({ actorId: user.id, action: "auth.login.failed", entityType: "User", entityId: user.id, ip });
    return wrong();
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.systemRole,
    employeeId: user.employee?.id ?? null,
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id, ip });

  return ok({ id: user.id, name: user.name, role: user.systemRole });
});
