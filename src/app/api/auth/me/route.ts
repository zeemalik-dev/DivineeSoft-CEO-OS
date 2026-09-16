import { currentUser } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";



export const GET = handler(async () => ok({ user: await currentUser() }));
