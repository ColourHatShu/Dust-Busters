"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";

export type NavLink = { href: string; label: string };

export default function NavClient({
  loggedIn,
  links,
  unreadCount,
}: {
  loggedIn: boolean;
  links: NavLink[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const Bubble = () =>
    unreadCount > 0 ? (
      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold leading-none text-white">
        {unreadCount > 9 ? "9+" : unreadCount}
      </span>
    ) : null;

  return (
    <nav className="navbar mx-auto flex w-full max-w-full items-center gap-4 px-6 py-4">
      <Link href="/" className="text-gradient-on-dark text-xl font-bold" onClick={() => setOpen(false)}>
        Dust Busters
      </Link>

      {/* Desktop links */}
      <div className="ml-auto hidden items-center gap-6 md:flex">
        {!loggedIn ? (
          <Link href="/login" className="text-sm font-medium transition hover:text-accent-light">
            Log in
          </Link>
        ) : (
          <>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition hover:text-accent-light ${
                  isActive(l.href) ? "text-accent-light" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}

            <Link
              href="/notifications"
              className="relative flex items-center text-current transition hover:text-accent-light"
              aria-label={
                unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "Notifications"
              }
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
              <Bubble />
            </Link>

            <form action="/auth/signout" method="post">
              <button type="submit" className="text-sm font-medium transition hover:text-red-300">
                Log out
              </button>
            </form>
          </>
        )}
      </div>

      {/* Mobile controls */}
      <div className="ml-auto flex items-center gap-4 md:hidden">
        {loggedIn && (
          <Link
            href="/notifications"
            className="relative flex items-center transition hover:text-accent-light"
            aria-label="Notifications"
            onClick={() => setOpen(false)}
          >
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            <Bubble />
          </Link>
        )}
        {loggedIn ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex items-center transition hover:text-accent-light"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        ) : (
          <Link href="/login" className="text-sm font-medium transition hover:text-accent-light">
            Log in
          </Link>
        )}
      </div>

      {/* Mobile dropdown panel */}
      {loggedIn && open && (
        <div className="absolute left-0 right-0 top-full border-t border-slate-700 bg-[#1e293b] px-6 py-4 shadow-elevation-lg md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-white/5 ${
                  isActive(l.href) ? "text-accent-light" : "text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <form action="/auth/signout" method="post" className="mt-1 border-t border-slate-700 pt-1">
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-white/5"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
