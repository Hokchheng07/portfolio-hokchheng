import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRightIcon, DownloadIcon } from "@/components/icons";
import { site } from "@/lib/site";
import { KageBackdrop } from "./kage-backdrop";
import { OrbitRings } from "./orbit-rings";
import { ProfileCard } from "./profile-card";
import { SocialLinks } from "./social-links";
import { TypingRoles } from "./typing-roles";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

// The hero sits on the night temple scene in both themes, so it always takes
// the dark theme's colours.
const NIGHT = {
  "--background": "#0a0a0a",
  "--foreground": "#ededed",
  "--muted": "#8a8a8a",
  "--surface": "#161616",
  "--ink": "#f2f2f2",
  "--on-ink": "#0a0a0a",
} as CSSProperties;

export function Hero() {
  return (
    <section id="home" style={NIGHT} className="orbit-hero relative flex min-h-svh flex-col overflow-hidden text-foreground lg:min-h-[max(100svh,54rem)]">
      <KageBackdrop />
      <OrbitRings />

      {/* On lg+ the content keeps --ring-clear free on both sides for the rings. */}
      <div className="relative mx-auto grid w-full max-w-3xl flex-1 items-center gap-14 px-6 pb-28 pt-32 sm:px-10 lg:w-[min(100%-2*var(--ring-clear),76rem)] lg:max-w-none lg:px-0 xl:grid-cols-[minmax(26rem,1fr)_minmax(0,540px)] xl:gap-12 xl:pt-28">
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
            className="rise mt-5 font-display text-[clamp(3rem,5.4vw,5.75rem)] leading-[1.02] tracking-[0.01em]"
            style={delay(160)}
          >
            Hi, I&rsquo;m <em className="italic xl:block">{site.name}.</em>
          </h1>

          <div className="rise mt-6" style={delay(260)}>
            <TypingRoles roles={site.roles} />
          </div>

          <div className="rise mt-9 flex flex-wrap items-center gap-3" style={delay(360)}>
            <Link
              href={site.workUrl}
              className="group inline-flex h-11 items-center gap-2.5 rounded-full bg-ink px-6 font-sans text-[15px] font-semibold tracking-[0.01em] text-on-ink transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              Explore Work
              <ArrowRightIcon className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </Link>
            <a
              href={site.resumeFile}
              download={site.resumeFileName}
              className="group inline-flex h-11 items-center gap-2.5 rounded-full border border-foreground/15 bg-surface/60 px-6 font-sans text-[15px] font-semibold tracking-[0.01em] text-foreground backdrop-blur-sm transition-[transform,border-color] duration-150 ease-out hover:border-foreground/35 active:scale-[0.97]"
            >
              Download Resume
              <DownloadIcon className="size-4 transition-transform duration-200 ease-out group-hover:translate-y-0.5" />
            </a>
          </div>
        </div>

        <div className="rise" style={delay(300)}>
          <ProfileCard />
        </div>
      </div>

      <ScrollIndicator />

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
