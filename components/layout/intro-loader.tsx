"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { hasLiveScene, kageReady } from "@/components/hero/kage-backdrop";
import { site } from "@/lib/site";
import { CUES, KatanaScene, LoaderCard } from "./katana-scene";
import "./intro-loader.css";

// Never held longer than this, even if something is still loading.
const MAX_MS = 8000;
// The CSS hold: intro and bar run this long before Ready (see intro-loader.css).
const HOLD_MS = 1760;
// Once ready, the strike timeline starts here, giving the bar 0.3s to fill.
const STRIKE_FROM = CUES.Ready - 0.3;

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

type Size = { W: number; H: number };

/*
 * The katana intro. The loader card animates in CSS while the page loads (see
 * LoaderCard), so it stays smooth however busy the main thread is. It holds
 * until the page has loaded and, on a page with the temple backdrop, until the
 * scene has booted; then the strike plays from a requestAnimationFrame
 * timeline (see KatanaScene). The page is released when the halves start to
 * part, so the hero rises in behind them, and the loader unmounts once they
 * are off screen. Reduced motion skips the sword and crossfades instead.
 */
export function IntroLoader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [reduced, setReduced] = useState(false);
  const [T, setT] = useState<number | null>(null);
  const [released, setReleased] = useState(false);
  const [gone, setGone] = useState(false);
  // One card element, so the three copies never re-render during the strike.
  const card = useMemo(() => <LoaderCard name={site.name} />, []);

  useEffect(() => {
    // Root layout persists across client navigation, so this runs once per
    // full page load.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const release = prefersReduced ? CUES.Ready + 0.15 : CUES.Split;
    const end = prefersReduced ? CUES.Ready + 0.6 : CUES.Done;
    // The root's client box is exactly the area the fixed loader covers.
    const measure = () => {
      const root = document.documentElement;
      setSize({ W: root.clientWidth, H: root.clientHeight });
    };
    let cancelled = false;
    let raf = requestAnimationFrame(() => {
      setReduced(prefersReduced);
      measure();
    });
    window.addEventListener("resize", measure);

    const scene = hasLiveScene() ? kageReady : Promise.resolve();
    Promise.race([Promise.all([pageReady(), scene, wait(HOLD_MS)]), wait(MAX_MS)]).then(() => {
      if (cancelled) return;
      // The bar fills from wherever its CSS hold left it.
      const bar = rootRef.current?.querySelector(".kl-fill");
      if (bar) rootRef.current?.style.setProperty("--from", String(new DOMMatrix(getComputedStyle(bar).transform).a));
      const start = performance.now();
      let isReleased = false;
      const tick = (now: number) => {
        if (cancelled) return;
        const t = STRIKE_FROM + (now - start) / 1000;
        if (!isReleased && t >= release) {
          isReleased = true;
          finishIntro();
          setReleased(true);
        }
        if (t >= end) {
          setGone(true);
          return;
        }
        setT(t);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-phase={T === null ? "hold" : "strike"}
      className={`intro-loader fixed inset-0 z-[70] ${released ? "pointer-events-none" : ""}`}
      // Once JS is drawing, the timeline owns the exit and the CSS safety net stands down.
      style={size ? { animation: "none" } : { background: "#0a0a0a" }}
    >
      {size && <KatanaScene T={T ?? 0} W={size.W} H={size.H} reduced={reduced} card={card} />}
    </div>
  );
}
