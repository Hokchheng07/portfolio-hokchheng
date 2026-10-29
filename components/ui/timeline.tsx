"use client";

/*
 * Scroll-linked timeline, adapted from Aceternity UI's Timeline
 * (https://ui.aceternity.com/components/timeline). Changes from the original:
 * a centred, alternating layout on large screens, site theme colours, a
 * scaleY beam instead of a measured height, and reduced-motion support.
 */
import { motion, useReducedMotion, useScroll } from "motion/react";
import { type ReactNode, useRef } from "react";

export type TimelineEntry = {
  key: string;
  // Shown large on the opposite side of the line (large screens only).
  aside: ReactNode;
  content: ReactNode;
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // The beam starts filling as the list enters and is full near its end.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });

  return (
    <div ref={ref} className="relative">
      {/* Track, faded at both ends */}
      <div
        aria-hidden
        className="absolute bottom-0 left-4 top-0 w-0.5 -translate-x-1/2 bg-foreground/10 [mask-image:linear-gradient(to_bottom,transparent,black_6%,black_94%,transparent)] lg:left-1/2"
      >
        <motion.div
          style={{ scaleY: reduced ? 1 : scrollYProgress }}
          className="absolute inset-0 origin-top rounded-full bg-gradient-to-b from-transparent via-foreground/70 to-foreground"
        />
      </div>

      <ol className="space-y-16 lg:space-y-28">
        {entries.map(({ key, aside, content }, index) => {
          const left = index % 2 === 0;
          return (
            <li key={key} className="relative grid pl-12 lg:grid-cols-2 lg:gap-24 lg:pl-0">
              {/* Dot on the line, level with the card's title */}
              <span
                aria-hidden
                className="absolute left-4 top-9 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-background ring-1 ring-foreground/15 lg:left-1/2"
              >
                <span className="size-2 rounded-full bg-foreground" />
              </span>

              <div className={left ? "lg:col-start-1" : "lg:col-start-2"}>{content}</div>
              <div
                className={`hidden pt-6 lg:row-start-1 lg:block ${
                  left ? "lg:col-start-2" : "lg:col-start-1 lg:text-right"
                }`}
              >
                {aside}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
