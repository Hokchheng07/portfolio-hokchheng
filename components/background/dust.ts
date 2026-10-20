/*
 * Drifting dust, ported from CosmicDust / CosmicDustField.
 *
 * Kept from the original: the wandering heading (motion that never stops and
 * never adds up to a direction), frame-rate independent drag, density scaling
 * by window area, and wrapping instead of respawning.
 *
 * Changed: monochrome, and one fixed canvas for the whole site instead of a
 * stack of window-tall slabs. Each speck lives in a window-tall field that
 * tiles down the page and is offset by scroll, so the dust still belongs to the
 * page (scrolling carries specks past) without a canvas per windowful.
 */

export const BASE_FRAME_MS = 1000 / 60;

const DRAG = 0.96;
const WANDER = 0.018;
const TURN = 0.5;
const REFERENCE_AREA = 1440 * 900;

export type Speck = {
  // Field space: y is within [0, height) and scrolls with the page.
  x: number;
  y: number;
  // Screen space, refreshed on every step.
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  heading: number;
  size: number;
  opacity: number;
  // Held by a symbiote tendril; drawn larger and solid.
  held: boolean;
  // Milliseconds before the symbiote may grab this speck again.
  cooldown: number;
};

export type DustOptions = {
  particleCount: number;
  particleSize: number;
  speed: number;
};

export const mod = (n: number, m: number) => ((n % m) + m) % m;

function createSpeck(width: number, height: number, options: DustOptions): Speck {
  const heading = Math.random() * Math.PI * 2;
  const speed = Math.random() * 0.3 * options.speed;
  const x = Math.random() * width;
  const y = Math.random() * height;
  return {
    x,
    y,
    sx: x,
    sy: y,
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
    heading,
    size: (Math.random() * 0.8 + 0.6) * options.particleSize,
    opacity: Math.random() * 0.35 + 0.2,
    held: false,
    cooldown: 0,
  };
}

// Grows or trims the field to the density this window size gets.
export function fitDust(specks: Speck[], width: number, height: number, options: DustOptions) {
  const density = Math.min(Math.max((width * height) / REFERENCE_AREA, 0.6), 2.2);
  const count = Math.max(12, Math.round(options.particleCount * density));
  while (specks.length < count) specks.push(createSpeck(width, height, options));
  specks.length = count;
  for (const speck of specks) {
    speck.x = mod(speck.x, width);
    speck.y = mod(speck.y, height);
  }
}

export function placeDust(specks: Speck[], height: number, scrollY: number) {
  for (const speck of specks) {
    speck.sx = speck.x;
    speck.sy = mod(speck.y - scrollY, height);
  }
}

export function stepDust(
  specks: Speck[],
  step: number,
  width: number,
  height: number,
  scrollY: number,
  speed: number,
) {
  // Drag is per frame, so over `step` frames it compounds.
  const drag = DRAG ** step;
  for (const speck of specks) {
    speck.heading += (Math.random() - 0.5) * TURN * step;
    speck.vx += Math.cos(speck.heading) * WANDER * speed * step;
    speck.vy += Math.sin(speck.heading) * WANDER * speed * step;
    speck.vx *= drag;
    speck.vy *= drag;
    speck.x = mod(speck.x + speck.vx * step, width);
    speck.y = mod(speck.y + speck.vy * step, height);
    speck.cooldown = Math.max(0, speck.cooldown - step * BASE_FRAME_MS);
  }
  placeDust(specks, height, scrollY);
}

export function drawDust(ctx: CanvasRenderingContext2D, specks: Speck[]) {
  for (const speck of specks) {
    ctx.globalAlpha = speck.held ? 1 : speck.opacity;
    ctx.beginPath();
    ctx.arc(speck.sx, speck.sy, speck.held ? speck.size * 1.6 : speck.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
