import { BASE_FRAME_MS, type Speck } from "./dust";

/*
 * An ink blob that follows the pointer on a spring, reaches out to nearby dust
 * with tapering tendrils, reels each speck in, and flings it away once it
 * touches the body or has been held long enough. Everything is drawn in one
 * opaque colour, so the body and tendrils merge into a single silhouette.
 */

const BODY_RADIUS = 22;
// How far a tendril reaches, as a share of the window's short side, capped.
const REACH_SHARE = 0.24;
const REACH_MAX = 170;
const MAX_TENDRILS = 7;
// Stagger new grabs so tendrils sprout one after another, not all at once.
const GRAB_INTERVAL_MS = 90;
const GROW = 0.06;
const RETRACT = 0.1;
// Pull on a held speck, per pixel of distance from the body.
const REEL = 0.0009;
// Seconds the body takes to settle on the pointer. The spring is derived from
// it: stiffness for that settle time, damping just under critical so the body
// lags behind and eases in with only a hint of overshoot.
const FOLLOW_SECONDS = 5;
// 3.7 puts 95% of the way there at FOLLOW_SECONDS for this damping.
const FOLLOW_RATE = 10 / FOLLOW_SECONDS;
const SPRING = (FOLLOW_RATE / 60) ** 2;
const DAMPING = Math.exp((-2 * 0.8 * FOLLOW_RATE) / 60);
const REGRAB_COOLDOWN_MS = 1400;

type Tendril = {
  speck: Speck;
  // Extension, 0 (inside the body) to 1 (touching the speck).
  t: number;
  releasing: boolean;
  holdMs: number;
  seed: number;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

export class Symbiote {
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private targetX = 0;
  private targetY = 0;
  private active = false;
  private presence = 0;
  private tendrils: Tendril[] = [];
  private grabTimer = 0;

  moveTo(x: number, y: number) {
    // Appear where the pointer is rather than flying in from the last spot.
    if (this.presence < 0.01) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
    }
    this.targetX = x;
    this.targetY = y;
    this.active = true;
  }

  leave() {
    this.active = false;
  }

  releaseAll() {
    for (const tendril of this.tendrils) this.release(tendril);
  }

  private release(tendril: Tendril) {
    if (tendril.releasing) return;
    tendril.releasing = true;
    tendril.speck.held = false;
    tendril.speck.cooldown = REGRAB_COOLDOWN_MS;
  }

  update(step: number, specks: Speck[], width: number, height: number) {
    const ms = step * BASE_FRAME_MS;

    this.vx += (this.targetX - this.x) * SPRING * step;
    this.vy += (this.targetY - this.y) * SPRING * step;
    const damping = DAMPING ** step;
    this.vx *= damping;
    this.vy *= damping;
    this.x += this.vx * step;
    this.y += this.vy * step;

    this.presence += ((this.active ? 1 : 0) - this.presence) * (1 - 0.88 ** step);
    const reach = Math.min(Math.min(width, height) * REACH_SHARE, REACH_MAX);
    const radius = BODY_RADIUS * this.presence;

    for (const tendril of this.tendrils) {
      const speck = tendril.speck;
      const dx = this.x - speck.sx;
      const dy = this.y - speck.sy;
      const distance = Math.hypot(dx, dy);

      if (!tendril.releasing) {
        tendril.holdMs -= ms;
        // A speck that wrapped to the far edge, or a symbiote that is leaving.
        if (distance > reach * 1.25 || !this.active) {
          this.release(tendril);
        } else if (distance < radius * 1.15 || tendril.holdMs <= 0) {
          fling(speck, dx, dy, distance);
          this.release(tendril);
        } else {
          tendril.t = Math.min(1, tendril.t + GROW * step);
          if (tendril.t > 0.85) {
            speck.vx += dx * REEL * step;
            speck.vy += dy * REEL * step;
          }
        }
      }
      if (tendril.releasing) tendril.t -= RETRACT * step;
    }
    this.tendrils = this.tendrils.filter((tendril) => tendril.t > 0);

    this.grabTimer -= ms;
    const holding = this.tendrils.filter((tendril) => !tendril.releasing).length;
    if (this.active && this.presence > 0.6 && holding < MAX_TENDRILS && this.grabTimer <= 0) {
      let nearest: Speck | null = null;
      let nearestDistance = reach;
      for (const speck of specks) {
        if (speck.held || speck.cooldown > 0) continue;
        const distance = Math.hypot(speck.sx - this.x, speck.sy - this.y);
        if (distance < nearestDistance && distance > radius * 1.5) {
          nearest = speck;
          nearestDistance = distance;
        }
      }
      if (nearest) {
        nearest.held = true;
        this.tendrils.push({
          speck: nearest,
          t: 0,
          releasing: false,
          holdMs: 1800 + Math.random() * 2400,
          seed: Math.random() * Math.PI * 2,
        });
        this.grabTimer = GRAB_INTERVAL_MS;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    if (this.presence < 0.01) return;
    const seconds = time / 1000;
    const radius = BODY_RADIUS * easeOut(this.presence);

    const roots: { angle: number; strength: number }[] = [];
    for (const tendril of this.tendrils) {
      const angle = this.drawTendril(ctx, tendril, radius, seconds);
      if (angle !== null) roots.push({ angle, strength: easeInOut(tendril.t) });
    }
    this.drawBody(ctx, radius, seconds, roots);
  }

  // Returns the tendril's angle from the body, so the body can bulge there.
  private drawTendril(ctx: CanvasRenderingContext2D, tendril: Tendril, radius: number, seconds: number) {
    const extension = easeInOut(Math.max(0, tendril.t));
    const bx = this.x;
    const by = this.y;
    const tx = bx + (tendril.speck.sx - bx) * extension;
    const ty = by + (tendril.speck.sy - by) * extension;
    const length = Math.hypot(tx - bx, ty - by);
    if (length < 1) return null;

    // Bend sideways with a slow sway, and trail behind the body's motion.
    const nx = -(ty - by) / length;
    const ny = (tx - bx) / length;
    const sway = Math.sin(seconds * 2.2 + tendril.seed) * length * 0.2;
    const cx = (bx + tx) / 2 + nx * sway - this.vx * 4;
    const cy = (by + ty) / 2 + ny * sway - this.vy * 4;

    const segments = 16;
    const baseWidth = radius * 0.5;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let i = 0; i <= segments; i += 1) {
      const u = i / segments;
      const a = (1 - u) ** 2;
      const b = 2 * (1 - u) * u;
      const c = u ** 2;
      const px = a * bx + b * cx + c * tx;
      const py = a * by + b * cy + c * ty;
      const dx = 2 * (1 - u) * (cx - bx) + 2 * u * (tx - cx);
      const dy = 2 * (1 - u) * (cy - by) + 2 * u * (ty - cy);
      const d = Math.hypot(dx, dy) || 1;
      const width = 0.7 + (baseWidth - 0.7) * (1 - u) ** 1.6;
      left.push([px - (dy / d) * width, py + (dx / d) * width]);
      right.push([px + (dy / d) * width, py - (dx / d) * width]);
    }

    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (const [px, py] of left) ctx.lineTo(px, py);
    for (let i = right.length - 1; i >= 0; i -= 1) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fill();

    return Math.atan2(ty - by, tx - bx);
  }

  private drawBody(
    ctx: CanvasRenderingContext2D,
    radius: number,
    seconds: number,
    roots: { angle: number; strength: number }[],
  ) {
    const count = 60;
    const speed = Math.hypot(this.vx, this.vy);
    const heading = Math.atan2(this.vy, this.vx);
    const stretch = Math.min(speed * 0.03, 0.5);

    const points: [number, number][] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      // Layered waves make the ink edge wobble without ever repeating exactly.
      let r =
        radius *
        (1 +
          0.09 * Math.sin(3 * angle + 1.7 * seconds) +
          0.06 * Math.sin(5 * angle - 2.3 * seconds + 1.3) +
          0.035 * Math.sin(9 * angle + 3.4 * seconds));
      r *= 1 + stretch * Math.cos(angle - heading) ** 2;
      // Swell where a tendril leaves the body, so it reads as one mass.
      for (const root of roots) {
        r += radius * 0.5 * root.strength * Math.max(0, Math.cos(angle - root.angle)) ** 12;
      }
      points.push([this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r]);
    }

    // Smooth closed curve through the midpoints of the outline.
    const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = mid(points[count - 1], points[0]);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    for (let i = 0; i < count; i += 1) {
      const next = mid(points[i], points[(i + 1) % count]);
      ctx.quadraticCurveTo(points[i][0], points[i][1], next[0], next[1]);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function fling(speck: Speck, dx: number, dy: number, distance: number) {
  const ux = -dx / (distance || 1);
  const uy = -dy / (distance || 1);
  const side = Math.random() < 0.5 ? -1 : 1;
  speck.vx = ux * 2.4 - uy * 1.4 * side;
  speck.vy = uy * 2.4 + ux * 1.4 * side;
}
