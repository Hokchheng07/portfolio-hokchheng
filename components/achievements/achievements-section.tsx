"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useRef } from "react";
import { Reveal } from "@/components/motion/reveal";
import { achievements } from "@/lib/site";
import { bindGallery } from "./achievements-motion";
import "./achievements.css";

/*
 * Red thread and hanko seal. On large screens the section pins and vertical
 * scroll moves the photos sideways along a red thread; small screens swipe.
 * Each photo holds at centre for part of its scroll, so nobody skims past it:
 * its seal stamps there and its description fades in. Titles always show.
 * All three layouts, including the plain list for reduced motion, share this
 * markup: achievements.css picks one by media query, so nothing shifts on load.
 */
export function AchievementsSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => (ref.current ? bindGallery(ref.current) : undefined), []);

  return (
    <section
      ref={ref}
      id="achievements"
      aria-labelledby="achievements-heading"
      data-no-symbiote=""
      className="ach"
      style={{ "--n": achievements.length } as CSSProperties}
    >
      <SealArt />

      <div data-stage="" role="group" aria-label="Achievements gallery. Use the arrow keys to move between frames." className="ach-stage">
        <Reveal className="ach-heading">
          <h2 id="achievements-heading" className="reveal font-display font-medium leading-none">
            Achievements
          </h2>
        </Reveal>

        <div data-track="" className="ach-track">
          <div aria-hidden className="ach-thread" />
          <div data-fill="" aria-hidden className="ach-fill" />

          <ol className="ach-frames">
            {achievements.map(({ title, programme, period, photo, alt, text, seal, kanji }, index) => (
              <li
                key={title}
                data-frame=""
                data-side={index % 2 === 0 ? "up" : "down"}
                className="ach-frame"
                style={{ "--i": index } as CSSProperties}
              >
                <div className="ach-media">
                  <figure data-card="" className="ach-card">
                    <div className="ach-photo-frame">
                      <div data-photo="" className="ach-photo">
                        <Image src={photo} alt={alt} fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover" />
                      </div>
                    </div>
                    {seal && (
                      <div data-seal="" aria-hidden className="ach-seal">
                        <div data-ink="" className="ach-ink" />
                        <svg viewBox="0 0 100 100" className="ach-seal-art">
                          <use href="#ach-seal-art" />
                        </svg>
                      </div>
                    )}
                  </figure>
                  <div aria-hidden className="ach-kanji">
                    {kanji}
                  </div>
                </div>

                <div aria-hidden className="ach-link">
                  <div className="ach-link-line" />
                  <div data-frame-fill="" className="ach-link-fill" />
                  <span data-node="" className="ach-node" />
                </div>

                <div className="ach-text">
                  <h3 className="ach-title font-display font-semibold">{title}</h3>
                  <p className="ach-meta font-mono font-semibold uppercase">
                    {programme} · {period}
                  </p>
                  <p data-body="" className="ach-body">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// White-letter seal: 賞 and an inner border are cut out of the red, so the photo
// shows through. One definition, reused by every frame.
function SealArt() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <filter id="ach-seal-ink" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={2.4} />
        </filter>
        <mask id="ach-seal-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <rect x="11" y="11" width="78" height="78" rx="6" fill="none" stroke="#000" strokeWidth="2.6" />
          <text x="50" y="53" textAnchor="middle" dominantBaseline="central" fontWeight="900" fontSize="58" fill="#000" className="ach-seal-glyph">
            賞
          </text>
        </mask>
        <g id="ach-seal-art" filter="url(#ach-seal-ink)">
          <rect x="4" y="4" width="92" height="92" rx="11" fill="currentColor" mask="url(#ach-seal-mask)" />
        </g>
      </defs>
    </svg>
  );
}
