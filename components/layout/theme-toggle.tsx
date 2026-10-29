"use client";

/*
 * Theme switching, ported from Visora's src/theme (ThemeProvider/ThemeToggle):
 * a 650ms band sweeping at 45 degrees from the upper right to the lower left,
 * a 180ms cross-fade for keyboard use and reduced motion, repeat clicks
 * ignored while a switch runs, and the preference synced across tabs and with
 * the system setting when nothing is saved.
 */
import { type MouseEvent, useEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import "./theme-toggle.css";

type Theme = "light" | "dark";

const KEY = "theme";
const listeners = new Set<() => void>();
let busy = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

const systemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  emit();
}

async function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
  if (busy) return;
  busy = true;
  emit();

  const root = document.documentElement;
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  const commit = () => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // The theme still works without storage.
    }
    // Synchronous, so the icon is already swapped in the new snapshot.
    flushSync(() => apply(next));
  };
  // Keyboard activation (detail 0) gets the calm fade, like reduced motion.
  const reduce =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches || event.detail === 0;
  let committed = false;
  let transition: ViewTransition | null = null;

  try {
    if (!document.startViewTransition) {
      commit();
      return;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const distance = (width + height) / (2 * Math.SQRT2) + 80;
    root.dataset.themeTransition = reduce ? "fade" : "diagonal";
    transition = document.startViewTransition(() => {
      commit();
      committed = true;
    });
    await transition.ready;

    if (!reduce) {
      // The new theme is everything right of a 45 degree line x = k + y.
      // k runs from past the right edge to past the left edge.
      const start = (width - height) / 2 + Math.SQRT2 * distance;
      const end = (width - height) / 2 - Math.SQRT2 * distance;
      // Percentages keep WebKit's high-DPI snapshots in CSS space.
      const polygon = (k: number) =>
        `polygon(${(k / width) * 100}% 0%, 100% 0%, 100% 100%, ${((height + k) / width) * 100}% 100%)`;
      await root.animate(
        { clipPath: [polygon(start), polygon(end)] },
        {
          duration: 650,
          easing: "cubic-bezier(0.77, 0, 0.175, 1)",
          fill: "both",
          pseudoElement: "::view-transition-new(root)",
        },
      ).finished;
    }
    await transition.finished;
  } catch {
    transition?.skipTransition();
    if (!committed) commit();
  } finally {
    delete root.dataset.themeTransition;
    busy = false;
    emit();
  }
}

// Runs in <head> before paint so the stored theme applies without a flash.
export const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})()`;

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");
  const isBusy = useSyncExternalStore(subscribe, () => busy, () => false);
  const dark = theme === "dark";

  useEffect(() => {
    // Follow the system setting until the visitor picks a theme.
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = () => {
      if (!storedTheme()) apply(systemTheme());
    };
    // Another tab changed the theme.
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY && event.key !== null) return;
      apply(storedTheme() ?? systemTheme());
    };
    query.addEventListener("change", followSystem);
    window.addEventListener("storage", sync);
    return () => {
      query.removeEventListener("change", followSystem);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-disabled={isBusy}
      aria-pressed={dark}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      className="theme-toggle grid size-11 place-items-center rounded-full text-foreground hover:bg-foreground/5 aria-disabled:cursor-wait"
    >
      {/* Moon offers dark mode, sun offers light mode. */}
      <span aria-hidden className="theme-toggle-icons">
        <svg viewBox="0 0 24 24" className={dark ? "theme-icon-hidden" : ""} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        <svg viewBox="0 0 24 24" className={dark ? "" : "theme-icon-hidden"} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </span>
    </button>
  );
}
