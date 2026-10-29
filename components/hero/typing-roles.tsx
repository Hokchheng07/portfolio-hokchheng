"use client";

import { useSyncExternalStore } from "react";
import { TypeAnimation } from "react-type-animation";
import { useIntroDone } from "@/components/layout/intro-loader";

const query = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function TypingRoles({ roles }: { roles: readonly string[] }) {
  const reducedMotion = useReducedMotion();
  // Hold the first role still until the intro loader has lifted.
  const introDone = useIntroDone();
  // Type each role, hold it, then delete before the next one.
  const sequence = roles.flatMap((role) => [role, 2200]);

  return (
    <p
      aria-label={roles.join(", ")}
      className="min-h-[1.2em] text-[clamp(1.6rem,4.2vw,3.25rem)] xl:whitespace-nowrap xl:text-[clamp(2rem,2.5vw,2.75rem)] font-light leading-snug tracking-[0.005em]"
    >
      {reducedMotion || !introDone ? (
        <span aria-hidden>{roles[0]}</span>
      ) : (
        <TypeAnimation
          aria-hidden
          sequence={sequence}
          wrapper="span"
          speed={45}
          deletionSpeed={65}
          repeat={Infinity}
          cursor={false}
          preRenderFirstString
        />
      )}
      <span
        aria-hidden
        className="cursor-block ml-1 inline-block h-[1em] w-[0.5em] align-[-0.12em] bg-foreground/45"
      />
    </p>
  );
}
