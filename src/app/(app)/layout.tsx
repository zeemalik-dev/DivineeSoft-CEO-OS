import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { fmt } from "@/lib/dates";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderBar } from "@/components/HeaderBar";
import { SidebarNav } from "@/components/SidebarNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  const isCeo = user.role === "CEO";

  const links = [
    ...(isCeo ? [{ href: "/dashboard", label: "Command centre" }] : []),
    { href: "/my-tasks", label: "My tasks" },
    { href: "/tasks", label: "Tasks" },
    { href: "/projects", label: "Projects" },
    { href: "/team", label: "Team" },
    { href: "/calendar", label: "Calendar" },
    ...(isCeo ? [{ href: "/workspace", label: "My workspace" }] : []),
    ...(isCeo ? [{ href: "/reports", label: "Reports" }] : []),
    ...(isCeo ? [{ href: "/automations", label: "Automations" }] : []),
    { href: "/assistant", label: "Assistant" },
  ];

  return (
    <div className="app-shell">
      {/* Header — only brand + notifications + avatar, no nav */}
      <HeaderBar
        userName={user.name}
        userRole={user.role}
        unreadCount={unread}
        links={[] /* nav moved to sidebar */}
        companyName={env.companyName}
        companyLogoSrc="/assets/divineesoft-mark.png"
      />
      <div className="app-body">
        {/* Sidebar — nav + date + theme toggle */}
        <aside className="app-sidebar">
          <div className="app-sidebar-inner">
            {/* Nav links */}
            <SidebarNav links={links} />
            {/* Divider */}
            <div className="app-sidebar-divider" />
            {/* Date */}
            <p className="app-sidebar-date">{fmt(new Date(), "EEEE d MMMM")}</p>
            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </aside>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
