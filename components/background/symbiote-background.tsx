"use client";

import { useEffect, useRef } from "react";
import { BASE_FRAME_MS, type Speck, drawDust, fitDust, placeDust, stepDust } from "./dust";
import { Symbiote } from "./symbiote";

const DUST = { particleCount: 180, particleSize: 1.4, speed: 1 };
const FOLLOWER_OFFSET = { x: 84, y: 52 };

/*
 * Site-wide dust field with two fine-line symbiotes following the pointer.
 * The smaller companion trails slightly behind so both forms stay visible.
 *
 * Both forms use the page's foreground color, so they stay the same color
 * across different sections and follow the active light or dark theme.
 */
export function SymbioteBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    const specks: Speck[] = [];
    const symbiotes = [new Symbiote(), new Symbiote(0.55)];
    const [pointerSymbiote, ambientSymbiote] = symbiotes;
    let ink =
      getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() || "#0a0a0a";
    const themeObserver = new MutationObserver(() => {
      ink =
        getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() || "#0a0a0a";
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    let width = 0;
    let height = 0;
    let placed = false;
    let pointerX = 0;
    let pointerY = 0;

    function moveTogether(x: number, y: number) {
      pointerX = x;
      pointerY = y;
      pointerSymbiote.moveTo(x, y);
      const marginX = Math.min(24, width / 2);
      const marginY = Math.min(24, height / 2);
      const followerX = Math.max(marginX, Math.min(x - FOLLOWER_OFFSET.x, width - marginX));
      const followerY = Math.max(marginY, Math.min(y + FOLLOWER_OFFSET.y, height - marginY));
      ambientSymbiote.moveTo(followerX, followerY);
    }

    // Backing store in device pixels, drawing in CSS pixels.
    function measure() {
      if (!canvas || !ctx) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = ink;
      // A hidden page can measure 0 by 0; wrapping dust to that would break it.
      if (!width || !height) return;
      fitDust(specks, width, height, DUST);
      for (const symbiote of symbiotes) symbiote.releaseAll();
      // Start both forms together, before anyone moves the pointer. Hidden tabs
      // can measure 0 by 0 at first, so wait for a real size.
      if (!placed) {
        pointerX = width * 0.52;
        pointerY = height * 0.56;
        placed = true;
      }
      moveTogether(pointerX, pointerY);
    }

    // Reduced motion keeps the dust as a still texture and drops the symbiote.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const paint = () => {
        placeDust(specks, height, window.scrollY);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = ink;
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
        themeObserver.disconnect();
        window.removeEventListener("scroll", paint);
      };
    }

    // The symbiote never leaves: when the pointer goes off screen or a touch
    // ends, it settles where the pointer was last.
    const onMove = (event: PointerEvent) => {
      placed = true;
      moveTogether(event.clientX, event.clientY);
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
      for (const symbiote of symbiotes) symbiote.update(step, specks, width, height);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = ink;
      drawDust(ctx, specks);
      for (const symbiote of symbiotes) symbiote.draw(ctx, time, ink);
    }
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 size-full"
    />
  );
}
