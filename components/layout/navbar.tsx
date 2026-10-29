"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useState } from "react";
import { navLinks, navSections, site } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";
import { useActiveSection } from "./use-active-section";
import "./navbar.css";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const section = useActiveSection(navSections, pathname === "/");
  const isActive = (link: (typeof navLinks)[number]) =>
    "section" in link ? section === link.section : pathname === link.href;

  // On the home page, scroll to the section ourselves: a link whose hash is
  // already in the URL would otherwise do nothing on a second click.
  const goTo = (event: MouseEvent<HTMLAnchorElement>, link: (typeof navLinks)[number]) => {
    setOpen(false);
    if (pathname !== "/" || !("section" in link)) return;
    const target = document.getElementById(link.section);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView();
    history.replaceState(null, "", link.href);
  };

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:top-6 sm:px-6">
      <nav
        aria-label="Main"
        className="mx-auto max-w-7xl rounded-[2.75rem] border border-foreground/[0.06] bg-surface/80 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.18)] backdrop-blur-xl"
      >
        <div className="grid h-[72px] grid-cols-[1fr_auto] items-center px-6 sm:h-[88px] sm:px-10 xl:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/#home"
            onClick={(event) => goTo(event, navLinks[0])}
            className="justify-self-start text-2xl font-bold uppercase tracking-[-0.01em] sm:text-[28px]"
          >
            {site.name}.
          </Link>

          <ul className="hidden items-center justify-self-center gap-9 xl:flex 2xl:gap-12">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  label={link.label}
                  active={isActive(link)}
                  onNavigate={(event) => goTo(event, link)}
                />
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
              className="grid size-10 place-items-center rounded-full transition-[background-color,transform] duration-150 ease-out hover:bg-foreground/5 active:scale-95 xl:hidden"
            >
              {/* Two bars that rotate into an X. */}
              <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 8h16" className={`origin-[12px_12px] transition-transform duration-200 ease-out [transform-box:view-box] ${open ? "[transform:rotate(45deg)_translateY(4px)]" : ""}`} />
                <path d="M4 16h16" className={`origin-[12px_12px] transition-transform duration-200 ease-out [transform-box:view-box] ${open ? "[transform:rotate(-45deg)_translateY(-4px)]" : ""}`} />
              </svg>
            </button>
          </div>
        </div>

        {/* Rows animate 0fr to 1fr so the menu grows to its own height. */}
        <div
          id="mobile-nav"
          inert={!open}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] xl:hidden ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <ul className="flex flex-col border-t border-foreground/[0.06] px-6 py-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <NavLink
                    href={link.href}
                    label={link.label}
                    active={isActive(link)}
                    onNavigate={(event) => goTo(event, link)}
                    block
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
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
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "location" : undefined}
      className={`relative text-[19px] tracking-wide transition-colors duration-200 ${block ? "block py-2.5 text-xl" : ""} ${
        active ? "text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
      {/* Dot under the active link. Colour only, so the bar never reflows. */}
      {!block && (
        <span
          aria-hidden
          className={`absolute -bottom-2 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground transition-[opacity,scale] duration-200 ease-out ${
            active ? "scale-100 opacity-100" : "scale-0 opacity-0"
          }`}
        />
      )}
    </Link>
  );
}
