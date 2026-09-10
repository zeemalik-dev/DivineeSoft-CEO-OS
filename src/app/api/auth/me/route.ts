import { currentUser } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

export const GET = handler(async () => ok({ user: await currentUser() }));
