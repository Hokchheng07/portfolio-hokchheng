"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { site } from "@/lib/site";
import "./intro-loader.css";

// Always shown for at least this long, so fast connections still get the intro.
const MIN_MS = 2000;
// Never held longer than this, even if some asset is still loading.
const MAX_MS = 6000;
const EXIT_MS = 700;

/*
 * Intro state lives on <html data-intro="loading">. The attribute is in the
 * server-rendered HTML, so the loader covers the page before any JS runs, and
 * CSS keys off it to pause the hero entrance and lock scrolling.
 */
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function isIntroDone() {
  return document.documentElement.dataset.intro !== "loading";
}

function finishIntro() {
  delete document.documentElement.dataset.intro;
  listeners.forEach((listener) => listener());
}

// For components that should wait for the intro, like the typing roles.
export function useIntroDone() {
  return useSyncExternalStore(subscribe, isIntroDone, () => false);
}

function pageReady() {
  const loaded =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((resolve) =>
          window.addEventListener("load", () => resolve(), { once: true }),
        );
  return Promise.all([loaded, document.fonts?.ready]);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function IntroLoader() {
  const [phase, setPhase] = useState<"loading" | "ready" | "exit" | "gone">("loading");
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Root layout persists across client navigation, so this runs once per
    // full page load.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Counted from navigation start, not hydration, so slow JS does not stretch it.
    const minMs = Math.max(0, (reduced ? 600 : MIN_MS) - performance.now());
    let cancelled = false;

    Promise.race([Promise.all([pageReady(), wait(minMs)]), wait(MAX_MS)]).then(async () => {
      if (cancelled) return;
      // The bar fills in CSS from first paint; finish it from wherever it is.
      const bar = barRef.current;
      if (bar) {
        const scale = new DOMMatrix(getComputedStyle(bar).transform).a;
        bar.style.setProperty("--from", String(scale));
      }
      setPhase("ready");
      await wait(450);
      if (cancelled) return;
      setPhase("exit");
      finishIntro();
      await wait(reduced ? 300 : EXIT_MS);
      if (!cancelled) setPhase("gone");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      data-phase={phase}
      className="intro-loader fixed inset-0 z-[70] grid place-items-center bg-background text-foreground"
    >
      <div className="intro-content flex flex-col items-center">
        <p className="overflow-hidden pb-1 text-[clamp(3rem,9vw,7rem)] font-bold uppercase leading-none tracking-[-0.01em]">
          <span className="intro-name block">{site.name}.</span>
        </p>
        <p className="intro-label mt-5 font-mono text-xs uppercase tracking-[0.45em] text-muted sm:text-sm">
          Portfolio loading
        </p>
        <span className="relative mt-8 block h-1 w-64 overflow-hidden rounded-full bg-foreground/10 sm:w-96">
          <span
            ref={barRef}
            className="intro-bar absolute inset-0 origin-left bg-foreground"
          />
        </span>
      </div>
    </div>
  );
}
