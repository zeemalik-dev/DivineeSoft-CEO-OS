import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { fmt } from "@/lib/dates";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderBar } from "@/components/HeaderBar";
import Link from "next/link";

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
      <HeaderBar
        userName={user.name}
        userRole={user.role}
        unreadCount={unread}
        links={links}
        companyName={env.companyName}
        companyLogoSrc="/assets/divineesoft-mark.png"
      />
      <div className="app-body">
        {/* Slim sidebar — only date + theme toggle remain */}
        <aside className="app-sidebar">
          <div className="app-sidebar-inner">
            <p className="text-xs text-muted mt-1">{fmt(new Date(), "EEEE d MMMM")}</p>
            <ThemeToggle />
          </div>
        </aside>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
