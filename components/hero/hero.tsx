import Link from "next/link";
import type { CSSProperties } from "react";
import { site } from "@/lib/site";
import { ProfileCard } from "./profile-card";
import { SocialLinks } from "./social-links";
import { TypingRoles } from "./typing-roles";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col">
      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-14 px-6 pb-28 pt-32 sm:px-10 lg:grid-cols-[1.5fr_1fr] lg:gap-10 lg:pt-28">
        <div>
          <div className="rise" style={delay(0)}>
            <SocialLinks />
          </div>

          <p
            className="rise mt-7 font-mono text-xs uppercase tracking-[0.3em] text-muted"
            style={delay(80)}
          >
            {site.location}
          </p>

          <h1
            className="rise mt-5 font-serif text-[clamp(3.25rem,6.4vw,6.75rem)] lg:whitespace-nowrap leading-[0.95] tracking-[-0.02em]"
            style={delay(160)}
          >
            Hi, I&rsquo;m <em className="italic">{site.name}.</em>
          </h1>

          <div className="rise mt-6" style={delay(260)}>
            <TypingRoles roles={site.roles} />
          </div>

          <div className="rise mt-9" style={delay(360)}>
            <Link
              href={site.resumeUrl}
              className="inline-flex h-10 items-center rounded-full bg-ink px-6 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-on-ink transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Resume
            </Link>
          </div>
        </div>

        <div className="rise" style={delay(300)}>
          <ProfileCard />
        </div>
      </div>

      <ScrollIndicator />

      {/* Curved dark band leading into the next section */}
      <div className="h-12 rounded-t-[50%_100%] bg-ink" />
    </section>
  );
}

function ScrollIndicator() {
  return (
    <div
      aria-hidden
      className="absolute bottom-24 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted/70 md:flex"
    >
      <span className="flex h-8 w-5 justify-center rounded-full border border-current pt-1.5">
        <span className="scroll-dot block h-1.5 w-0.5 rounded-full bg-current" />
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.3em]">
        Scroll down
      </span>
    </div>
  );
}
