"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DriftingLeaves } from "@/components/layout/katana-scene";

const SCENE_URL = "/kage/scene.html";
// A still of the scene framed for a tall screen, captured from it at 390x844.
const POSTER_URL = "/kage/poster-portrait.webp";
// Phones and tablets get the still instead of the live scene: the 3D boot is
// slow there, costs about a megabyte, and the loader would wait on it.
const POSTER_QUERY = "(hover: none), (max-width: 767px)";

function subscribePoster(callback: () => void) {
  const query = window.matchMedia(POSTER_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

const wantsPoster = () => window.matchMedia(POSTER_QUERY).matches;

// Whether this page runs the live scene, so the intro loader should wait for it.
export function hasLiveScene() {
  return Boolean(document.querySelector("[data-kage]")) && !wantsPoster();
}

/*
 * The Kage temple scene (ThreeUI Community, MIT; see public/kage/LICENSE.txt)
 * behind the hero, with its page UI, scroll camera and wordmark removed.
 *
 * It runs in its own document, so its globals and render loop stay apart from
 * the site. On phones and tablets a still of it stands in instead, covering the
 * first screen with leaves drifting over it in CSS. The frame never takes input: pointer moves are forwarded for the
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
  const poster = useSyncExternalStore(
    subscribePoster,
    wantsPoster,
    () => false,
  );

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
    if (!mounted || poster) return undefined;
    const wrap = wrapRef.current;
    const send = (message: Record<string, unknown>) =>
      frameRef.current?.contentWindow?.postMessage(
        message,
        window.location.origin,
      );

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      )
        return;
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
  }, [mounted, poster]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      data-kage
      className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      style={FADE}
    >
      {poster ? (
        <div className="absolute inset-0 bg-[#0a0a0a]">
          <div className="absolute inset-x-0 top-0 h-svh [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]">
            <Image
              src={POSTER_URL}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-top"
            />
            {/* Shade the text side, so the moon never washes out the copy. */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/70 via-[#0a0a0a]/25 to-transparent" />
            <DriftingLeaves loop />
          </div>
        </div>
      ) : (
        mounted && (
          <iframe
            ref={frameRef}
            src={SCENE_URL}
            title="Temple scene"
            tabIndex={-1}
            className="size-full border-0 transition-opacity duration-1000 ease-out"
            style={{ opacity: ready ? 1 : 0 }}
          />
        )
      )}
    </div>
  );
}
