import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { SignOutButton } from "@/components/SignOutButton";
import { fmt } from "@/lib/dates";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <div className="mx-auto flex min-h-screen w-full max-w-[1360px] flex-col md:flex-row">
      <aside className="border-b border-rule bg-surface md:min-h-screen md:w-[212px] md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <div>
            <div className="app-brand">
              <img src="/assets/divineesoft-mark.png" alt="" className="app-brand-mark" />
              <p className="text-[15px] font-semibold leading-tight tracking-tight">{env.companyName}</p>
            </div>
            <p className="text-xs text-muted">{fmt(new Date(), "EEEE d MMMM")}</p>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-0 md:pb-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-xs px-2 py-2 text-sm text-ink hover:bg-sunk md:px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-rule px-5 py-4 text-xs text-muted md:mt-6">
          <p className="text-ink">{user.name}</p>
          <p>{user.role === "CEO" ? "CEO" : user.role === "MANAGER" ? "Manager" : "Team"}</p>
          {unread > 0 && <p className="mt-1 text-risk">{unread} unread notification{unread === 1 ? "" : "s"}</p>}
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-7 md:px-8">{children}</main>
    </div>
  );
}
