import { destroySession, readSession } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = handler(async () => {
  const session = await readSession();
  await destroySession();
  if (session) await audit({ actorId: session.id, action: "auth.logout", entityType: "User", entityId: session.id });
  return ok({ signedOut: true });
});
