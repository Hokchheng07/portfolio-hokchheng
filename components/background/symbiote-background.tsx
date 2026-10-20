"use client";

import { useEffect, useRef } from "react";
import { BASE_FRAME_MS, type Speck, drawDust, fitDust, placeDust, stepDust } from "./dust";
import { Symbiote } from "./symbiote";

const DUST = { particleCount: 120, particleSize: 1.4, speed: 1 };

/*
 * Site-wide dust field with a pointer-following symbiote.
 *
 * The canvas sits above the page with mix-blend-mode: difference and draws in
 * white. Over the light theme that reads as black ink, over the dark theme as
 * white ink, and any text under the blob inverts instead of being covered, so
 * nothing on the page becomes unreadable.
 */
export function SymbioteBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    const specks: Speck[] = [];
    const symbiote = new Symbiote();
    let width = 0;
    let height = 0;

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
      fitDust(specks, width, height, DUST);
      symbiote.releaseAll();
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

    const onMove = (event: PointerEvent) => symbiote.moveTo(event.clientX, event.clientY);
    const onTouchEnd = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") symbiote.leave();
    };
    const onLeave = () => symbiote.leave();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onTouchEnd);
    window.addEventListener("pointercancel", onTouchEnd);
    window.addEventListener("blur", onLeave);
    document.documentElement.addEventListener("mouseleave", onLeave);

    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();

    let frame = 0;
    let previous = 0;
    function animate(time: number) {
      frame = requestAnimationFrame(animate);
      if (!ctx || !width || !height) return;
      // Frames of 60Hz time elapsed, capped so a backgrounded tab does not jump.
      const step = previous ? Math.min((time - previous) / BASE_FRAME_MS, 3) : 1;
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
      window.removeEventListener("pointerup", onTouchEnd);
      window.removeEventListener("pointercancel", onTouchEnd);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] size-full mix-blend-difference"
    />
  );
}
