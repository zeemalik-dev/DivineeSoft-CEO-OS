import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { solutionSchema } from "@/lib/validation";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = solutionSchema.parse(await req.json());
  const solution = await prisma.solution.create({ data: { ...input, authorId: user.id } });
  if (input.isChosen) {
    await prisma.solution.updateMany({
      where: { problemId: input.problemId, id: { not: solution.id } },
      data: { isChosen: false },
    });
    await prisma.problem.update({ where: { id: input.problemId }, data: { status: "IN_PROGRESS" } });
  }
  return ok({ solution }, 201);
});
