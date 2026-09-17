import { requireUser } from "@/lib/auth/session";
import { MyTasksClient } from "@/components/MyTasksClient";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const user = await requireUser();

  // Data fetching is now handled by RTK Query (MyTasksClient)
  return <MyTasksClient employeeId={user.employeeId ?? null} role={user.role} />;
}
