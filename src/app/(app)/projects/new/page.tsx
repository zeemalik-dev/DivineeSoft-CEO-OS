import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageProject } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { ProjectForm } from "@/components/ProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const user = await requireUser();
  if (!canManageProject(user)) {
    redirect("/projects");
  }

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const employeeOptions = employees.map((emp) => ({
    id: emp.id,
    name: emp.user.name,
    title: emp.title,
  }));

  return <ProjectForm employees={employeeOptions} isEdit={false} />;
}
