"use client";

/* eslint-disable @next/next/no-img-element -- gallery size is set by the frame, not the file */
import { createTimeline, utils } from "animejs";
import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EducationEntry } from "@/lib/site";
import "./education-modal.css";

type Details = NonNullable<EducationEntry["details"]>;

// How long each photo holds before the next one slides in.
const HOLD_MS = 3800;
// Placeholder slides shown until real photos are listed in lib/site.ts.
const PLACEHOLDERS = 3;

/*
 * Achievements pop-up. It flies out of the card it was opened from (FLIP:
 * start at the card's box, animate to the centred panel) and flies back on
 * close. Left: a gallery that holds each photo, then moves on. Right: the
 * current photo's own title and paragraph, the subjects and a thumbnail strip
 * that scrolls when it overflows.
 */
export function EducationModal({
  entry,
  details,
  originRef,
  onClosed,
}: {
  entry: EducationEntry;
  details: Details;
  originRef: RefObject<HTMLElement | null>;
  onClosed: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const titleId = `achievements-${details.subject.toLowerCase().replace(/\W+/g, "-")}`;

  // The card's box relative to the panel's, as a transform from the panel.
  const fromCard = useCallback(() => {
    const panel = panelRef.current;
    const card = originRef.current;
    if (!panel || !card) return null;
    // The panel's resting box: centred in the viewport at its layout size.
    // offsetWidth/Height ignore transforms, so this stays right even when the
    // panel is mid-animation (or the effect runs twice in development).
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const c = card.getBoundingClientRect();
    return {
      translateX: c.left + c.width / 2 - window.innerWidth / 2,
      translateY: c.top + c.height / 2 - window.innerHeight / 2,
      scaleX: c.width / width,
      scaleY: c.height / height,
    };
  }, [originRef]);

  // Open: backdrop blurs in while the panel grows from the card into place.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const content = contentRef.current;
    const backdrop = backdropRef.current;
    const start = fromCard();
    if (!panel || !content || !backdrop || !start) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      createTimeline().add([backdrop, panel], { opacity: [0, 1], duration: 200, ease: "linear" });
    } else {
      utils.set(panel, { ...start, rotateY: 0 });
      utils.set(content, { opacity: 0 });
      // Exact mirror of the close: same curves and timing, played forwards.
      createTimeline()
        .add(backdrop, { opacity: [0, 1], duration: 450, ease: "outQuad" })
        .add(
          panel,
          {
            translateX: 0,
            translateY: 0,
            scaleX: 1,
            scaleY: 1,
            rotateY: { from: 0, to: 360, ease: "inOutCubic" },
            duration: 700,
            ease: "inOutQuart",
          },
          0,
        )
        .add(content, { opacity: [0, 1], duration: 160, ease: "outQuad" }, 640);
    }

    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [fromCard]);

  // Close: the reverse, landing back on the card.
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const panel = panelRef.current;
    const content = contentRef.current;
    const backdrop = backdropRef.current;
    const end = fromCard();
    if (!panel || !content || !backdrop || !end || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (backdrop && panel) {
        createTimeline()
          .add([backdrop, panel], { opacity: 0, duration: 180, ease: "linear" })
          .then(onClosed);
      } else onClosed();
      return;
    }
    createTimeline()
      .add(content, { opacity: 0, duration: 160, ease: "inQuad" })
      .add(panel, { ...end, rotateY: { from: 360, to: 0, ease: "inOutCubic" }, duration: 700, ease: "inOutQuart" }, 100)
      .add(backdrop, { opacity: 0, duration: 450, ease: "inQuad" }, 150)
      .then(onClosed);
  }, [fromCard, onClosed]);

  // Escape closes; Tab stays inside the dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return createPortal(
    <div className="fixed inset-0 z-[80] grid grid-cols-[minmax(0,1fr)] place-items-center p-3 [perspective:2400px] sm:p-5">
      <div
        ref={backdropRef}
        onClick={close}
        className="absolute inset-0 bg-background/40 opacity-0 backdrop-blur-xl"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-[min(1040px,94svh)] w-[min(1720px,100%)] flex-col overflow-hidden rounded-[32px] border border-foreground/[0.08] bg-surface shadow-[0_60px_120px_-40px_rgba(0,0,0,0.5)]"
      >
        <div
          ref={contentRef}
          className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:overflow-hidden lg:p-10"
        >
          <Gallery details={details} />

          <div className="flex min-h-0 min-w-0 flex-col">
            <header className="flex items-start justify-between gap-6">
              {/* Sized by the column (cqi) so the title never wraps. */}
              <div className="@container min-w-0 flex-1">
                <h2
                  id={titleId}
                  className="whitespace-nowrap pt-1 font-serif text-[min(5rem,8.4cqi)] leading-[1.1] tracking-[0.01em]"
                >
                  Achievements in <em className="italic">{details.subject}</em>
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-foreground/10 transition-[background-color,transform] duration-150 ease-out hover:bg-foreground/5 active:scale-95"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <Story details={details} />

            <ul className="mt-6 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-lg border border-foreground/[0.08] bg-background px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70"
                >
                  {tag}
                </li>
              ))}
            </ul>

            <Thumbnails details={details} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Gallery state shared by the big frame and the thumbnails ---------- */

const listeners = new Set<(index: number) => void>();
let current = 0;

function select(index: number) {
  current = index;
  listeners.forEach((listener) => listener(index));
}

function useSlide() {
  const [index, setIndex] = useState(current);
  useEffect(() => {
    listeners.add(setIndex);
    return () => {
      listeners.delete(setIndex);
    };
  }, []);
  return index;
}

function slidesOf(details: Details) {
  return details.gallery.length
    ? details.gallery
    : Array.from({ length: PLACEHOLDERS }, (_, n) => ({
        src: null,
        title: `Photo ${n + 1}`,
        text: "Photos and their stories are coming soon.",
      }));
}

// The current photo's title and paragraph. All stories share one grid cell,
// so the block keeps the height of the longest and never jumps.
function Story({ details }: { details: Details }) {
  const slides = slidesOf(details);
  const index = useSlide();

  return (
    <div className="mt-8 grid min-h-0 flex-1 content-start overflow-y-auto lg:pr-2">
      {slides.map(({ title, text }, n) => (
        <div
          key={n}
          aria-hidden={n !== index}
          className="story col-start-1 row-start-1"
          data-active={n === index || undefined}
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
            {String(n + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </p>
          <h3 className="mt-3 text-2xl font-semibold sm:text-3xl">{title}</h3>
          <p className="mt-4 text-lg leading-relaxed text-muted xl:text-xl">{text}</p>
        </div>
      ))}
    </div>
  );
}

function Slide({ src, n, subject }: { src: string | null; n: number; subject: string }) {
  if (src) return <img src={src} alt={`${subject} photo ${n}`} className="size-full object-cover" />;
  return (
    <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--foreground)_10%,transparent),transparent_60%),linear-gradient(160deg,color-mix(in_oklab,var(--foreground)_6%,var(--background)),color-mix(in_oklab,var(--foreground)_16%,var(--background)))]">
      <span className="font-serif text-[clamp(2rem,6vw,5rem)] italic text-foreground/20">{String(n).padStart(2, "0")}</span>
    </div>
  );
}

function Gallery({ details }: { details: Details }) {
  const slides = slidesOf(details);
  const index = useSlide();
  const [paused, setPaused] = useState(false);

  // Each pop-up starts from the first photo.
  useEffect(() => select(0), []);

  return (
    <div
      className="relative aspect-[4/5] min-h-0 overflow-hidden rounded-[24px] bg-background lg:aspect-auto lg:h-full"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      {slides.map(({ src }, n) => (
        <div
          key={n}
          aria-hidden={n !== index}
          className="gallery-slide absolute inset-0"
          data-active={n === index || undefined}
        >
          <Slide src={src} n={n + 1} subject={details.subject} />
        </div>
      ))}

      {/* Story-style progress: the active bar fills over HOLD_MS, then advances. */}
      <div className="absolute inset-x-4 top-4 flex gap-1.5">
        {slides.map((_, n) => (
          <span key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
            <span
              key={n === index ? `on-${index}` : "off"}
              className="gallery-bar block h-full rounded-full bg-white"
              data-state={n < index ? "done" : n === index ? "active" : "todo"}
              data-paused={paused || undefined}
              style={{ animationDuration: `${HOLD_MS}ms` }}
              onAnimationEnd={() => select((index + 1) % slides.length)}
            />
          </span>
        ))}
      </div>

      {!details.gallery.length && (
        <p className="absolute inset-x-0 bottom-4 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/40">
          Photos coming soon
        </p>
      )}
    </div>
  );
}

function Thumbnails({ details }: { details: Details }) {
  const slides = slidesOf(details);
  const index = useSlide();
  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the active thumbnail in view without scrolling the page.
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
    strip.scrollTo({ left, behavior: "smooth" });
  }, [index]);

  return (
    <div
      ref={stripRef}
      className="thumb-strip -mx-1 mt-6 flex shrink-0 snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    >
      {slides.map(({ src }, n) => (
        <button
          key={n}
          type="button"
          onClick={() => select(n)}
          aria-label={`Show photo ${n + 1}`}
          aria-current={n === index || undefined}
          className={`relative aspect-square w-24 shrink-0 snap-start overflow-hidden rounded-2xl sm:w-28 xl:w-36 transition-[opacity,box-shadow,transform] duration-300 ease-out active:scale-95 sm:w-24 ${
            n === index ? "opacity-100 ring-2 ring-foreground ring-offset-2 ring-offset-surface" : "opacity-55 hover:opacity-90"
          }`}
        >
          <Slide src={src} n={n + 1} subject={details.subject} />
        </button>
      ))}
    </div>
  );
}
