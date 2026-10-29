"use client";

import { useEffect, useRef } from "react";
import { BASE_FRAME_MS, type Speck, drawDust, fitDust, placeDust, stepDust } from "./dust";
import { Symbiote } from "./symbiote";

const DUST = { particleCount: 180, particleSize: 1.4, speed: 1 };
/*
 * Site-wide dust field with a pointer-following symbiote.
 *
 * The canvas sits behind all page content (z-index -10, above only the page
 * background), with mix-blend-mode: difference and white ink, so it reads as
 * black ink on the light theme and white ink on the dark theme. Cards, icons
 * and text always render on top of it.
 */
export function SymbioteBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    const specks: Speck[] = [];
    const symbiote = new Symbiote({ scale: 1, grips: 7, feelers: 2 });
    let width = 0;
    let height = 0;
    let placed = false;
    let pointerX = 0;
    let pointerY = 0;

    // Backing store in device pixels, drawing in CSS pixels.
    function measure() {
      if (!canvas || !ctx) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = "#fff";
      // A hidden page can measure 0 by 0; wrapping dust to that would break it.
      if (!width || !height) return;
      fitDust(specks, width, height, DUST);
      symbiote.releaseAll();
      // Alive from the start, before anyone moves the pointer.
      if (!placed) {
        pointerX = width * 0.52;
        pointerY = height * 0.56;
        placed = true;
      }
      symbiote.point(pointerX, pointerY);
    }

    // Reduced motion keeps the dust as a still texture and drops the symbiote.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const paint = () => {
        placeDust(specks, height, window.scrollY);
        ctx.clearRect(0, 0, width, height);
        drawDust(ctx, specks);
      };
      const observer = new ResizeObserver(() => {
        measure();
        paint();
      });
      observer.observe(canvas);
      window.addEventListener("scroll", paint, { passive: true });
      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", paint);
      };
    }

    // The symbiote never leaves: when the pointer goes off screen or a touch
    // ends, it settles near where the pointer was last.
    const onMove = (event: PointerEvent) => {
      placed = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      symbiote.point(pointerX, pointerY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });

    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();

    let frame = 0;
    let previous = 0;
    function animate(time: number) {
      frame = requestAnimationFrame(animate);
      if (!ctx || !width || !height) return;
      // Frames of 60Hz time elapsed, capped so a backgrounded tab does not jump.
      const step = previous ? Math.min(Math.max(0, (time - previous) / BASE_FRAME_MS), 3) : 1;
      previous = time;

      stepDust(specks, step, width, height, window.scrollY, DUST.speed);
      symbiote.update(step, specks, width, height);

      ctx.clearRect(0, 0, width, height);
      drawDust(ctx, specks);
      symbiote.draw(ctx, time);
    }
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 size-full mix-blend-difference"
    />
  );
}
