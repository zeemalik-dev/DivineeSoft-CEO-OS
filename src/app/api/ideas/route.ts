import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ideaSchema } from "@/lib/validation";
import { handler, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireUser();
  const ideas = await prisma.idea.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return ok({ ideas });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = ideaSchema.parse(await req.json());
  const idea = await prisma.idea.create({ data: { ...input, authorId: user.id } });
  await audit({ actorId: user.id, action: "idea.create", entityType: "Idea", entityId: idea.id });
  return ok({ idea }, 201);
});
