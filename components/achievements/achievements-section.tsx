"use client";

import Image from "next/image";
import { type CSSProperties, type SVGProps, useEffect, useRef } from "react";
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
          <ThreadWave className="ach-thread" />
          <ThreadWave className="ach-fill" data-fill="" />

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
                  <LinkWave className="ach-link-line" up={index % 2 === 0} />
                  <LinkWave className="ach-link-fill" up={index % 2 === 0} data-frame-fill="" />
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

// The pinned thread: crest to trough and back, so each node sits on a turn and the
// line always leaves on the side away from that frame's text. Each turn finishes
// in the first 40% of its span, so the whole curve shows beside the centred frame;
// the rest of the span runs level behind the next photo. It stretches to fit (see
// achievements.css), so nothing needs measuring. The tail runs off the track's end.
const WAVE_SEGMENTS = achievements.length - 1;
const WAVE_PATH =
  "M0 0" +
  Array.from({ length: WAVE_SEGMENTS }, (_, i) => {
    const x = i * 100;
    const [from, to] = i % 2 === 0 ? [0, 100] : [100, 0];
    return ` C${x + 20} ${from} ${x + 20} ${to} ${x + 40} ${to} H${x + 100}`;
  }).join("") +
  ` H${WAVE_SEGMENTS * 100 + 100}`;

function ThreadWave(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden viewBox={`0 0 ${WAVE_SEGMENTS * 100} 100`} preserveAspectRatio="none" {...props}>
      <path d={WAVE_PATH} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// The swipe layout's piece of the same wave: mid-height to this frame's turn and
// back, split at the midpoints of the S-curve so neighbouring frames join smoothly.
function LinkWave({ up, ...props }: SVGProps<SVGSVGElement> & { up: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" {...props}>
      <path
        d={up ? "M0 50 C12.5 25 25 0 50 0 C75 0 87.5 25 100 50" : "M0 50 C12.5 75 25 100 50 100 C75 100 87.5 75 100 50"}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
