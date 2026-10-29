"use client";

import { useEffect, useState } from "react";

/*
 * Scroll spy: returns the id of the section currently under the reading line
 * (40% down the viewport). The last section whose top has passed that line
 * wins, so short sections still get their turn.
 */
export function useActiveSection(ids: readonly string[], enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    // A few rect reads per scroll event, cheap enough to run directly.
    const update = () => {
      const line = window.innerHeight * 0.4;
      let current: string | null = null;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= line) current = id;
      }
      // At the very bottom of the page, the last section is the one in view.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) current = ids[ids.length - 1] ?? current;
      setActive(current ?? ids[0] ?? null);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ids, enabled]);

  return enabled ? active : null;
}
