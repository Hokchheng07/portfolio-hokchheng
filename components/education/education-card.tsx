"use client";

import { useRef, useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import type { EducationEntry } from "@/lib/site";
import { EducationModal } from "./education-modal";

export function EducationCard({ entry }: { entry: EducationEntry }) {
  const done = entry.status === "completed";
  const cardRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // The pop-up itself flies out of this card, flipping on the way.
  const openModal = () => {
    if (cardRef.current) setOpen(true);
  };

  return (
    <Reveal>
      <div className="[perspective:1600px]">
        <article
          ref={cardRef}
          style={{ visibility: open ? "hidden" : undefined }}
          className={`reveal group/card relative overflow-hidden rounded-[28px] border border-foreground/[0.06] bg-surface/70 p-7 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:p-9 ${
            entry.details ? "transition-[border-color,box-shadow] duration-200 hover:border-foreground/15 hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.35)]" : ""
          }`}
        >
          {/* Accent bar down the left edge */}
          <span aria-hidden className="absolute bottom-7 left-0 top-7 w-1 rounded-r-full bg-foreground" />

          <h3 className="text-2xl font-bold uppercase leading-snug tracking-[0.02em] sm:text-3xl">
            {entry.title}
          </h3>
          <p className="mt-2 text-lg font-medium text-muted">{entry.school}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="inline-flex h-10 items-center gap-2.5 rounded-full border border-foreground/10 bg-background px-5 font-mono text-xs font-semibold uppercase tracking-[0.2em] shadow-[inset_0_-2px_0_rgba(0,0,0,0.04),0_8px_20px_-12px_rgba(0,0,0,0.3)]">
              {done ? (
                <span className="size-2 rounded-full bg-foreground" />
              ) : (
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-foreground/50 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-foreground" />
                </span>
              )}
              {done ? "Completed" : "In progress"}
            </span>
            <span className="font-mono text-sm tracking-[0.1em] text-muted lg:hidden">{entry.period}</span>
          </div>

          <p className="mt-6 text-lg leading-relaxed text-muted">{entry.description}</p>

          <ul className="mt-7 flex flex-wrap gap-2.5">
            {entry.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-lg border border-foreground/[0.06] bg-background px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70"
              >
                {tag}
              </li>
            ))}
          </ul>

          {entry.details && (
            <>
              <p
                aria-hidden
                className="mt-8 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted transition-colors group-hover/card:text-foreground"
              >
                View achievements
                <span className="transition-transform duration-200 ease-out group-hover/card:translate-x-1">→</span>
              </p>
              {/* Whole card is the button; the visible text stays plain markup. */}
              <button
                ref={triggerRef}
                type="button"
                onClick={openModal}
                aria-haspopup="dialog"
                aria-label={`View achievements in ${entry.details.subject}`}
                className="absolute inset-0 cursor-pointer rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
              />
            </>
          )}
        </article>
      </div>

      {open && entry.details && (
        <EducationModal
          entry={entry}
          details={entry.details}
          originRef={cardRef}
          onClosed={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}
    </Reveal>
  );
}
