"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface HeaderBarProps {
  userName: string;
  userRole: string;
  unreadCount: number;
  links: { href: string; label: string }[];
  companyName: string;
  companyLogoSrc?: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function HeaderBar({
  userName,
  userRole,
  unreadCount: initialUnread,
  links,
  companyName,
  companyLogoSrc,
}: HeaderBarProps) {
  const router = useRouter();

  // Profile dropdown
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Notification dropdown
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      const unread = (data.notifications ?? []).filter((n: Notification) => !n.readAt).length;
      setUnreadCount(unread);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const toggleNotif = () => {
    if (!notifOpen) fetchNotifications();
    setNotifOpen((v) => !v);
    setProfileOpen(false);
  };

  const toggleProfile = () => {
    setProfileOpen((v) => !v);
    setNotifOpen(false);
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel =
    userRole === "CEO" ? "CEO" : userRole === "MANAGER" ? "Manager" : "Team";

  return (
    <header className="app-header">
      <div className="app-header-left">
        {/* Logo + Company */}
        <Link href="/my-tasks" className="app-header-brand">
          {companyLogoSrc && (
            <img src={companyLogoSrc} alt="" className="app-brand-mark" />
          )}
          <span className="app-header-company">{companyName}</span>
        </Link>

        {/* Nav Links */}
        <nav className="app-header-nav">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="app-header-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="app-header-right">
        {/* Notification Bell */}
        <div className="app-header-icon-wrap" ref={notifRef}>
          <button
            id="notif-bell-btn"
            className="app-header-icon-btn"
            onClick={toggleNotif}
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="app-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="app-dropdown notif-dropdown" id="notif-dropdown">
              <div className="notif-dropdown-head">
                <span className="notif-dropdown-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>

              {notifLoading ? (
                <div className="notif-empty">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="notif-empty">No notifications yet.</div>
              ) : (
                <ul className="notif-list">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`notif-item ${!n.readAt ? "notif-unread" : ""}`}
                      onClick={() => {
                        if (!n.readAt) markRead(n.id);
                        if (n.link) router.push(n.link);
                      }}
                    >
                      <div className="notif-item-top">
                        <span className="notif-item-title">{n.title}</span>
                        {!n.readAt && <span className="notif-dot" />}
                      </div>
                      {n.body && <p className="notif-item-body">{n.body}</p>}
                      <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="app-header-icon-wrap" ref={profileRef}>
          <button
            id="profile-avatar-btn"
            className="app-avatar-btn"
            onClick={toggleProfile}
            aria-label="Profile menu"
          >
            <span>{initials}</span>
          </button>

          {profileOpen && (
            <div className="app-dropdown profile-dropdown" id="profile-dropdown">
              <div className="profile-dropdown-head">
                <div className="profile-avatar-lg">{initials}</div>
                <div>
                  <p className="profile-name">{userName}</p>
                  <p className="profile-role">{roleLabel}</p>
                </div>
              </div>
              <div className="profile-dropdown-divider" />
              <button className="profile-signout-btn" onClick={signOut}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
