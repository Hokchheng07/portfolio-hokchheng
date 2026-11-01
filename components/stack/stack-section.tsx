/* eslint-disable @next/next/no-img-element -- tiny static SVGs, nothing to optimise */
import type { CSSProperties } from "react";
import { Reveal } from "@/components/motion/reveal";
import { techStack } from "@/lib/site";

const i = (index: number) => ({ "--i": index }) as CSSProperties;

/*
 * One row per group: title and description on the left, logo tiles on the
 * right. Logos sit in grey like the hero orbit tiles and take their brand
 * colour on hover.
 */
export function StackSection() {
  return (
    <section id="stack" className="scroll-mt-24 pb-32">
      <Reveal className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 xl:px-16">
        {/* Part of Education, so no divider and a sub-heading rather than a title. */}
        <h2 className="reveal font-display text-3xl font-semibold sm:text-4xl" style={i(0)}>
          Tech stack
        </h2>
      </Reveal>

      <div className="mx-auto mt-6 w-full max-w-[1760px] px-6 sm:px-10 xl:px-16">
        {techStack.map((group) => (
          <Reveal
            key={group.title}
            className="grid gap-8 border-t border-foreground/10 py-10 first:border-t-0 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:py-14"
          >
            <div className="reveal" style={i(0)}>
              <h3 className="font-display text-2xl font-semibold sm:text-3xl">{group.title}</h3>
              <p className="mt-3 max-w-md text-lg leading-relaxed text-muted">{group.description}</p>
            </div>

            <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3 sm:gap-4">
              {group.items.map(({ name, icon }, index) => (
                // Reveal on the <li>, hover on the inner tile, so the two
                // transitions never fight over the same properties.
                <li key={name} className="reveal" style={i(1 + index)}>
                  <div className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-foreground/[0.06] bg-surface/70 px-3 py-6 shadow-[0_14px_36px_-24px_rgba(0,0,0,0.3)] transition-[border-color,translate] duration-300 ease-out hover:-translate-y-0.5 hover:border-foreground/15">
                    <img
                      src={icon}
                      alt=""
                      className="size-11 opacity-60 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                    />
                    <span className="text-center font-mono text-xs font-semibold uppercase tracking-[0.14em] text-foreground/75">
                      {name}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
