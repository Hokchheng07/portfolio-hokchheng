import type { CSSProperties } from "react";
import { Reveal } from "@/components/motion/reveal";
import { Timeline } from "@/components/ui/timeline";
import { education } from "@/lib/site";
import { EducationCard } from "./education-card";

const i = (index: number) => ({ "--i": index }) as CSSProperties;

export function EducationSection() {
  return (
    <section id="education" className="scroll-mt-24 pb-32">
      <Reveal className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 xl:px-16">
        <div aria-hidden className="reveal-line mb-16 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent sm:mb-20" />
        <header className="text-center">
          <p className="reveal font-mono text-sm uppercase tracking-[0.4em] text-muted" style={i(0)}>
            Learning path
          </p>
          <h2
            className="reveal mt-4 font-serif text-[clamp(3rem,7vw,5.5rem)] leading-[1.05] tracking-[0.01em]"
            style={i(1)}
          >
            <em className="italic">Education</em>
          </h2>
        </header>
      </Reveal>

      <div className="mx-auto mt-20 w-full max-w-[1760px] px-6 sm:mt-24 sm:px-10 xl:px-16">
        <Timeline
          entries={education.map((entry) => ({
            key: entry.title,
            aside: (
              <p className="font-serif text-[clamp(2.5rem,4vw,4rem)] italic leading-[1.05] tracking-[0.01em] text-foreground/25">
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
