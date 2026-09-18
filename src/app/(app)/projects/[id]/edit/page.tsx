import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageProject } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { ProjectForm } from "@/components/ProjectForm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Ctx) {
  const user = await requireUser();
  if (!canManageProject(user)) {
    redirect("/projects");
  }

  const { id } = await params;

  const [project, employees] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        members: { select: { employeeId: true } },
      },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  if (!project) {
    notFound();
  }

  const employeeOptions = employees.map((emp) => ({
    id: emp.id,
    name: emp.user.name,
    title: emp.title,
  }));

  const initialData = {
    id: project.id,
    name: project.name,
    description: project.description,
    platforms: project.platforms,
    status: project.status,
    healthNote: project.healthNote,
    startedAt: project.startedAt ? project.startedAt.toISOString() : null,
    dueDate: project.dueDate ? project.dueDate.toISOString() : null,
    leadId: project.leadId,
    managerId: project.managerId,
    members: project.members,
  };

  return <ProjectForm initialData={initialData} employees={employeeOptions} isEdit={true} />;
}
