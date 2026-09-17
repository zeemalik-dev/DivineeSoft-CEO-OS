import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { fmt } from "@/lib/dates";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role !== "CEO") redirect("/my-tasks");

  const hour = Number(fmt(new Date(), "H"));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Data fetching is now handled by RTK Query (DashboardClient)
  return <DashboardClient userName={user.name} greeting={greeting} />;
}
