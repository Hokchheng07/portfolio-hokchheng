"use client";

import { type ComponentProps, useEffect, useRef } from "react";
import "./reveal.css";

/*
 * Blur-in on scroll. Wrap a block in <Reveal> and give the pieces inside the
 * "reveal" class plus an optional --i index for the stagger. They settle once,
 * the first time the block scrolls into view.
 */
export function Reveal(props: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.inview = "";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} data-reveal="" {...props} />;
}
