import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { SystemRole } from "@prisma/client";

export const SESSION_COOKIE = "divineesoft_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  employeeId: string | null;
};

function key() {
  return new TextEncoder().encode(env.authSecret());
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${env.sessionTtlHours}h`)
    .sign(key());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: env.sessionTtlHours * 3600,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as SystemRole,
      employeeId: (payload.employeeId as string | null) ?? null,
    };
  } catch (error) {
    logger.warn("SSR session token invalid", {
      error,
    });
    return null;
  }
}

/** Session plus a liveness check against the database (deactivated users lose access instantly). */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, isActive: true, systemRole: true, name: true, email: true, employee: { select: { id: true } } },
  });
  if (!user || !user.isActive) {
    logger.warn("SSR session rejected", {
      userId: session.id,
      reason: !user ? "missing-user" : "inactive-user",
    });
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.systemRole,
    employeeId: user.employee?.id ?? null,
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  return user;
}

export async function requireCeo(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "CEO") throw new HttpError(403, "This area is limited to the CEO.");
  return user;
}
