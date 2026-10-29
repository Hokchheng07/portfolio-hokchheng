/* eslint-disable @next/next/no-img-element -- tiny static SVGs, nothing to optimise */
import type { CSSProperties } from "react";
import { stack } from "@/lib/site";
import "./orbit-rings.css";

// Enough tiles on each ring that two or three are always on the visible arc.
// The stack repeats to fill them, so any stack length spaces out evenly.
const MIN_TILES = 12;

/*
 * Two large rings centred off-screen, one per side, so only their inner arcs
 * show. Tiles ride the inner ring and turn with it. Geometry comes from CSS
 * variables on the hero section (--ring-r, --ring-depth, --tile), which also
 * pad the hero content so nothing sits under the rings.
 */
export function OrbitRings() {
  const count = stack.length * Math.ceil(MIN_TILES / stack.length);
  const tiles = Array.from({ length: count }, (_, i) => ({
    ...stack[i % stack.length],
    angle: (360 / count) * i,
  }));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      <Ring side="left" tiles={tiles} />
      <Ring side="right" tiles={tiles} />
    </div>
  );
}

function Ring({
  side,
  tiles,
}: {
  side: "left" | "right";
  tiles: { name: string; icon: string; angle: number }[];
}) {
  return (
    <div className="orbit-ring" data-side={side}>
      {/* Outer decorative arc, nearer the page edge */}
      <span className="absolute inset-[var(--ring-gap)] rounded-full border border-foreground/[0.07]" />
      {/* Track the tiles ride on */}
      <span className="absolute inset-0 rounded-full border border-foreground/10 shadow-[0_0_0_6px_color-mix(in_oklab,var(--foreground)_2%,transparent)]" />

      <div className="orbit-spin absolute inset-0">
        {tiles.map(({ name, icon, angle }) => (
          <div
            key={angle}
            className="orbit-tile pointer-events-auto absolute left-1/2 top-1/2"
            style={{ "--angle": `${angle}deg` } as CSSProperties}
          >
            <div
              title={name}
              className="group grid size-[var(--tile)] place-items-center rounded-2xl border border-foreground/[0.06] bg-surface shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)]"
            >
              <img
                src={icon}
                alt=""
                className="size-[46%] opacity-55 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
