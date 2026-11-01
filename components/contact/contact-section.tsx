import type { CSSProperties } from "react";
import { GithubIcon, InstagramIcon, LinkedinIcon, MailIcon } from "@/components/icons";
import { Reveal } from "@/components/motion/reveal";
import { site } from "@/lib/site";
import { ContactForm } from "./contact-form";

const i = (index: number) => ({ "--i": index }) as CSSProperties;

const socials = [
  { label: "GitHub", href: site.socials.github, Icon: GithubIcon },
  { label: "LinkedIn", href: site.socials.linkedin, Icon: LinkedinIcon },
  { label: "Instagram", href: site.socials.instagram, Icon: InstagramIcon },
];

/*
 * Contact: one centred card. A large heading and a single line of invitation,
 * then the form stacked full width, then the direct routes underneath.
 */
export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-24 pb-32">
      <Reveal className="mx-auto w-full max-w-[1760px] px-6 sm:px-10 xl:px-16">
        <div className="reveal relative overflow-hidden rounded-[40px] border border-foreground/[0.06] bg-surface/70 px-6 py-16 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:px-12 sm:py-24 lg:px-20 xl:py-28">
          {/* Soft light pooling in the top-right corner */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground)_9%,transparent),transparent_65%)]"
          />

          <div className="relative mx-auto max-w-[1240px]">
            <header className="text-center">
              <h2
                className="reveal font-display text-[clamp(3rem,8.5vw,8.5rem)] font-bold uppercase leading-[0.95] tracking-[-0.01em]"
                style={i(1)}
              >
                Send a message
              </h2>
              <p className="reveal mx-auto mt-6 max-w-3xl text-xl leading-relaxed text-muted sm:text-2xl" style={i(2)}>
                Tell me a little about what you need and I&rsquo;ll get back to you.
              </p>
            </header>

            <div className="reveal mt-14 sm:mt-16" style={i(3)}>
              <ContactForm />
            </div>

            <div
              className="reveal mt-10 flex flex-col items-center gap-6 border-t border-foreground/10 pt-10 sm:flex-row sm:justify-between"
              style={i(4)}
            >
              <a
                href={`mailto:${site.email}`}
                className="inline-flex items-center gap-3 text-lg font-medium underline decoration-foreground/20 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-foreground sm:text-xl"
              >
                <MailIcon className="size-5" />
                {site.email}
              </a>
              <div className="flex gap-3">
                {socials.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-12 place-items-center rounded-full border border-foreground/15 text-muted transition-[border-color,color,transform] duration-150 ease-out hover:border-foreground/40 hover:text-foreground active:scale-[0.97]"
                  >
                    <Icon className="size-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
