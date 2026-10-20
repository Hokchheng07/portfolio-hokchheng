"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navLinks, site } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:top-6 sm:px-6">
      <nav
        aria-label="Main"
        className="mx-auto max-w-7xl rounded-[2rem] border border-foreground/[0.06] bg-surface/80 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.18)] backdrop-blur-xl"
      >
        <div className="grid h-16 grid-cols-[1fr_auto] items-center px-6 sm:h-[72px] sm:px-8 md:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="justify-self-start text-xl font-bold uppercase tracking-[-0.04em] sm:text-2xl"
          >
            {site.name}.
          </Link>

          <ul className="hidden items-center gap-10 md:flex">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <NavLink href={href} label={label} active={pathname === href} />
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-end gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid size-10 place-items-center rounded-full transition-colors hover:bg-foreground/5 md:hidden"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <ul id="mobile-nav" className="flex flex-col border-t border-foreground/[0.06] px-6 py-3 md:hidden">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <NavLink
                  href={href}
                  label={label}
                  active={pathname === href}
                  onNavigate={() => setOpen(false)}
                  block
                />
              </li>
            ))}
          </ul>
        )}
      </nav>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
  block,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  block?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`text-[17px] tracking-wide transition-colors ${block ? "block py-2" : ""} ${
        active ? "font-semibold text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
