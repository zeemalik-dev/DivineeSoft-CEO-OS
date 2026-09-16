import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// GET /api/notifications — fetch last 20 notifications for current user
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ notifications });
}

// PATCH /api/notifications — mark one or all as read
// Body: { id?: string } — if id omitted, marks all as read
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const now = new Date();

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { readAt: now },
    });
  } else {
    // mark all unread as read
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: now },
    });
  }

  return NextResponse.json({ ok: true });
}
