import Image from "next/image";
import type { CSSProperties } from "react";
import { Reveal } from "@/components/motion/reveal";
import { about, site } from "@/lib/site";
import { NameMarquee } from "./name-marquee";

const i = (index: number) => ({ "--i": index }) as CSSProperties;

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-24 pb-24 pt-8 sm:pt-12">
      <Reveal className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 xl:px-16">
        {/* Divider between hero and About: a hairline that draws out from the centre. */}
        <div aria-hidden className="reveal-line mb-16 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent sm:mb-20" />

        <header className="text-center">
          <p className="reveal font-mono text-sm uppercase tracking-[0.4em] text-muted" style={i(0)}>
            Discover
          </p>
          <h2
            className="reveal mt-4 font-serif text-[clamp(3rem,7vw,5.5rem)] leading-[1.05] tracking-[0.01em]"
            style={i(1)}
          >
            About <em className="italic">Me</em>
          </h2>
        </header>

        <div className="mt-16 grid items-start gap-12 sm:mt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 xl:gap-24">
          <div className="reveal mx-auto w-full max-w-[520px] lg:sticky lg:top-28 lg:max-w-none" style={i(2)}>
            <div className="relative aspect-[5/6] overflow-hidden rounded-[28px] bg-neutral-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-foreground/10">
              {site.photo && (
                <Image
                  src={site.photo}
                  alt={`Portrait of ${site.name}`}
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover object-top grayscale"
                />
              )}
            </div>
          </div>

          <div>
            <div className="grid gap-10 sm:grid-cols-2 xl:gap-16">
              <div className="reveal" style={i(3)}>
                <h3 className="border-b border-foreground/10 pb-5 text-2xl font-semibold sm:text-3xl">Who Am I</h3>
                <p className="mt-6 text-lg leading-relaxed text-muted">{about.whoAmI}</p>
              </div>
              <div className="reveal" style={i(4)}>
                <h3 className="border-b border-foreground/10 pb-5 text-2xl font-semibold sm:text-3xl">My Approach</h3>
                <p className="mt-6 text-lg leading-relaxed text-muted">{about.approach}</p>
              </div>
            </div>

            <div className="reveal mt-16 flex items-stretch gap-4" style={i(5)}>
              <span aria-hidden className="w-0.5 bg-foreground" />
              <h3 className="flex-1 border-b border-foreground/10 pb-5 text-2xl font-semibold sm:text-3xl">
                Personal Details
              </h3>
            </div>
            <dl className="mt-10 grid gap-x-16 gap-y-8 sm:grid-cols-2">
              {about.details.map(({ label, value }, index) => (
                <div key={label} className="reveal" style={i(6 + index)}>
                  <dt className="font-mono text-xs uppercase tracking-[0.25em] text-muted sm:text-[13px]">
                    {label}
                  </dt>
                  <dd className="mt-2 break-words text-lg font-medium sm:text-xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Reveal>

      <NameMarquee />
    </section>
  );
}
