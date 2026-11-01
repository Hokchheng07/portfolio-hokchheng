"use client";

import { useEffect, useRef, useState } from "react";

const SCENE_URL = "/kage/scene.html";

/*
 * The Kage temple scene (ThreeUI Community, MIT; see public/kage/LICENSE.txt)
 * behind the hero, with its page UI, scroll camera and wordmark removed.
 *
 * It runs in its own document, so its globals and render loop stay apart from
 * the site. The frame never takes input: pointer moves are forwarded for the
 * parallax, and rendering pauses whenever the hero is off screen. The scene
 * grades itself black and white with only the leaves left red (see inkAll in
 * scene.html), and a mask fades it out at the hero's foot. It loads after the
 * page does, and fades in once its first frame is ready.
 */
const FADE = {
  maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
};

/*
 * Settles once the scene has booted. Booting is heavy main-thread work, so the
 * intro loader holds for it (when the page has a backdrop, marked data-kage):
 * the katana strike then runs on a quiet thread and uncovers a finished scene.
 */
let markReady = () => {};
export const kageReady = new Promise<void>((resolve) => {
  markReady = resolve;
});

export function KageBackdrop() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  // Mount the frame once the page itself has finished loading.
  useEffect(() => {
    const mount = () => setMounted(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(mount, 0);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", mount, { once: true });
    return () => window.removeEventListener("load", mount);
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;
    const wrap = wrapRef.current;
    const send = (message: Record<string, unknown>) =>
      frameRef.current?.contentWindow?.postMessage(message, window.location.origin);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.kage !== "ready") return;
      setReady(true);
      markReady();
    };
    // Normalised to -1..1, y up, as the scene's own cursor rig expects.
    const onMove = (event: PointerEvent) => {
      send({
        kage: "pointer",
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -((event.clientY / window.innerHeight) * 2 - 1),
      });
    };
    const observer = new IntersectionObserver(([entry]) => {
      send({ kage: "run", on: entry.isIntersecting });
    });
    if (wrap) observer.observe(wrap);

    window.addEventListener("message", onMessage);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pointermove", onMove);
    };
  }, [mounted]);

  return (
    <div ref={wrapRef} aria-hidden data-kage className="pointer-events-none absolute inset-0 -z-20 overflow-hidden" style={FADE}>
      {mounted && (
        <iframe
          ref={frameRef}
          src={SCENE_URL}
          title="Temple scene"
          tabIndex={-1}
          className="size-full border-0 transition-opacity duration-1000 ease-out"
          style={{ opacity: ready ? 1 : 0 }}
        />
      )}
    </div>
  );
}
