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
        {/* The page's lead section: largest heading, left-aligned, link alongside. */}
        <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <h2
            className="reveal font-display text-[clamp(3.5rem,9vw,8rem)] font-medium leading-[0.95]"
            style={i(0)}
          >
            Selected <em className="italic">work</em>
          </h2>
          <a
            href={moreProjectsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={i(1)}
            className="reveal group mb-2 inline-flex h-11 items-center gap-2.5 rounded-full border border-foreground/15 bg-surface/60 px-6 font-sans text-[15px] font-semibold tracking-[0.01em] backdrop-blur-sm transition-[border-color,transform] duration-150 ease-out hover:border-foreground/35 active:scale-[0.97]"
          >
            View more projects
            <ArrowRightIcon className="size-4 -rotate-45 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
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
                  <h3 className="font-display text-2xl font-bold uppercase leading-snug tracking-[0.02em] sm:text-3xl">{project.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-muted">{project.description}</p>

                  {/* Footer pinned to the card bottom, tags reserving two rows, so
                      tags and buttons line up across cards whatever the text length. */}
                  <ul className="mt-auto flex min-h-[4.75rem] flex-wrap content-start gap-2 pt-6">
                    {project.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-lg border border-foreground/[0.06] bg-background px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                    <a
                      href={project.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/live inline-flex h-11 items-center justify-center gap-2.5 rounded-full border border-foreground/15 bg-surface font-sans text-[15px] font-semibold tracking-[0.01em] text-foreground transition-[border-color,transform] duration-150 ease-out hover:border-foreground/40 active:scale-[0.97]"
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

      </Reveal>
    </section>
  );
}
