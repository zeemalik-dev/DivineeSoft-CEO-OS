import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/session";


export const dynamic = "force-dynamic";

/**
 * Server-Sent Events over the ActivityEvent table. Tailing a table rather than
 * an in-process emitter means every serverless instance sees the same feed.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  let cursor = BigInt(url.searchParams.get("since") ?? "0");
  if (cursor === 0n) {
    const latest = await prisma.activityEvent.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
    cursor = latest?.id ?? 0n;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("ready", { since: cursor.toString() });

      const tick = setInterval(async () => {
        try {
          const rows = await prisma.activityEvent.findMany({
            where: { id: { gt: cursor } },
            orderBy: { id: "asc" },
            take: 50,
          });
          if (rows.length) {
            cursor = rows[rows.length - 1].id;
            send("activity", rows.map((r) => ({ ...r, id: r.id.toString() })));
          } else {
            send("ping", { at: Date.now() });
          }
        } catch (error) {
          console.error("[sse]", error);
        }
      }, 4000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(tick);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
