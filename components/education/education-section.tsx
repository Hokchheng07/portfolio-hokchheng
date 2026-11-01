import type { CSSProperties } from "react";
import { Reveal } from "@/components/motion/reveal";
import { Timeline } from "@/components/ui/timeline";
import { education } from "@/lib/site";
import { EducationCard } from "./education-card";

const i = (index: number) => ({ "--i": index }) as CSSProperties;

export function EducationSection() {
  return (
    <section id="education" className="scroll-mt-24 pb-24">
      <Reveal className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 xl:px-16">
        <div aria-hidden className="reveal-line mb-16 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent sm:mb-20" />
        {/* Centred to sit on the axis of the timeline below. */}
        <h2
          className="reveal text-center font-display text-[clamp(2.75rem,5vw,4.5rem)] font-medium leading-none"
          style={i(0)}
        >
          Education
        </h2>
      </Reveal>

      <div className="mx-auto mt-16 w-full max-w-[1760px] px-6 sm:mt-20 sm:px-10 xl:px-16">
        <Timeline
          entries={education.map((entry) => ({
            key: entry.title,
            aside: (
              <p className="font-display text-[clamp(2.5rem,4vw,4rem)] italic leading-[1.05] tracking-[0.01em] text-foreground/25">
                {entry.period}
              </p>
            ),
            content: <EducationCard entry={entry} />,
          }))}
        />
      </div>
    </section>
  );
}
