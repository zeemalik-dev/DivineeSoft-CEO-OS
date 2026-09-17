"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

export function SidebarNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="app-sidebar-nav">
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(link.href + "/");

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-sidebar-link ${active ? "app-sidebar-link--active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
