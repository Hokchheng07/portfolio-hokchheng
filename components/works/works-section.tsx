import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowRightIcon, GithubIcon } from "@/components/icons";
import { Reveal } from "@/components/motion/reveal";
import { moreProjectsUrl, projects } from "@/lib/site";

const i = (index: number) => ({ "--i": index }) as CSSProperties;

/*
 * Selected Works: a card per project with a screenshot, a short description,
 * tags, and links to the live site and the source. Cards fill a responsive
 * grid, so adding a project in lib/site.ts is all it takes.
 */
export function WorksSection() {
  return (
    <section id="works" className="scroll-mt-24 pb-32">
      <Reveal className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 xl:px-16">
        <div aria-hidden className="reveal-line mb-16 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent sm:mb-20" />
        <header className="text-center">
          <p className="reveal font-mono text-sm uppercase tracking-[0.4em] text-muted" style={i(0)}>
            Portfolio
          </p>
          <h2
            className="reveal mt-4 font-serif text-[clamp(3rem,7vw,5.5rem)] leading-[1.05] tracking-[0.01em]"
            style={i(1)}
          >
            Selected <em className="italic">Works</em>
          </h2>
        </header>
      </Reveal>

      <Reveal className="mx-auto mt-16 w-full max-w-[1760px] px-6 sm:mt-20 sm:px-10 xl:px-16">
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
          {projects.map((project, index) => (
            // Reveal on the <li>, hover on the card inside it.
            <li key={project.title} className="reveal" style={i(index)}>
              <article className="group flex h-full flex-col rounded-[28px] border border-foreground/[0.06] bg-surface/70 p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-[border-color,translate,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/15 hover:shadow-[0_34px_70px_-30px_rgba(0,0,0,0.35)]">
                <a
                  href={project.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={-1}
                  aria-hidden
                  className="relative block aspect-[16/10] overflow-hidden rounded-[20px] bg-background"
                >
                  <Image
                    src={project.image}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover object-top transition-[scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                  />
                </a>

                <div className="flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-5">
                  <h3 className="text-2xl font-bold uppercase leading-snug tracking-[0.02em] sm:text-3xl">{project.title}</h3>
                  <p className="mt-3 flex-1 text-lg leading-relaxed text-muted">{project.description}</p>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-lg border border-foreground/[0.06] bg-background px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 grid grid-cols-[1fr_auto] gap-3">
                    <a
                      href={project.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/live inline-flex h-11 items-center justify-center gap-2.5 rounded-full bg-ink font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-on-ink transition-transform duration-150 ease-out active:scale-[0.97]"
                    >
                      Visit site
                      <ArrowRightIcon className="size-4 -rotate-45 transition-transform duration-200 ease-out group-hover/live:translate-x-0.5 group-hover/live:-translate-y-0.5" />
                    </a>
                    <a
                      href={project.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${project.title} source code on GitHub`}
                      className="grid size-11 place-items-center rounded-full border border-foreground/15 transition-[border-color,transform] duration-150 ease-out hover:border-foreground/35 active:scale-[0.97]"
                    >
                      <GithubIcon className="size-[18px]" />
                    </a>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="reveal mt-14 flex justify-center" style={i(projects.length)}>
          <a
            href={moreProjectsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-11 items-center gap-2.5 rounded-full border border-foreground/15 bg-surface/60 px-6 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur-sm transition-[border-color,transform] duration-150 ease-out hover:border-foreground/35 active:scale-[0.97]"
          >
            View more projects
            <ArrowRightIcon className="size-4 -rotate-45 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}
