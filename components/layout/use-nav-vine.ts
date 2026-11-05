"use client";

import { type RefObject, useEffect, useRef } from "react";
import { useIntroDone } from "./intro-loader";
import { bindVine } from "./vine";

type Targets = {
  nav: RefObject<HTMLElement | null>;
  bar: RefObject<HTMLDivElement | null>;
  name: RefObject<HTMLAnchorElement | null>;
  links: RefObject<HTMLUListElement | null>;
  actions: RefObject<HTMLDivElement | null>;
};

// Two layers, placed either side of the navbar: see vine.ts. Growth starts once
// the intro lets go of the page, so the whole five seconds can be seen.
export function useNavVine({ nav, bar, name, links, actions }: Targets) {
  const back = useRef<SVGSVGElement>(null);
  const front = useRef<SVGSVGElement>(null);
  const start = useRef<() => void>(() => {});
  const introDone = useIntroDone();

  useEffect(() => {
    if (!back.current || !front.current || !nav.current || !bar.current || !name.current || !links.current || !actions.current) return;
    const vine = bindVine({
      back: back.current,
      front: front.current,
      nav: nav.current,
      bar: bar.current,
      name: name.current,
      links: links.current,
      actions: actions.current,
    });
    start.current = vine.start;
    return vine.dispose;
  }, [nav, bar, name, links, actions]);

  useEffect(() => {
    if (introDone) start.current();
  }, [introDone]);

  return { back, front };
}
