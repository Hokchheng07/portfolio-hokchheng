import { BASE_FRAME_MS, type Speck } from "./dust";

/*
 * An asymmetric cluster of active tentacles that crawls across the dust.
 *
 * Each arm uses several weighted filaments. Independent curl, reach, and grip
 * times keep the silhouette loose instead of forming a regular star.
 *
 * Arms plant their tips on nearby specks and stay planted while the body
 * drifts after the pointer, stretching as it moves. When one is stretched too
 * far or crawled over, it lets go and the symbiote plants a new one, preferring
 * specks in the direction it is heading, so it crawls rather than glides.
 */

// How far an arm reaches, as a share of the window's short side, capped.
const REACH_SHARE = 0.3;
const REACH_MAX = 190;
const LEGS = 8;
const THREADS_PER_ARM = 4;
const THREAD_WIDTH = 1.75;
const THREAD_SPREAD = 1.2;
const TIP_RADIUS = 1.45;
// A new arm will not plant within this angle of another, so arms fan out.
const MIN_LEG_GAP = 0.55;
// Stagger new arms so they step one after another, not all at once.
const GRAB_INTERVAL_MS = 70;
const GROW = 0.12;
const RETRACT = 0.12;
// How firmly a planted tip pins its speck: the share of drift kept each frame.
const CLING = 0.8;
// Seconds the body takes to settle on the pointer. The spring is derived from
// it: stiffness for that settle time, damping just under critical so the body
// lags behind and eases in with only a hint of overshoot.
const FOLLOW_SECONDS = 5;
// 3.7 puts 95% of the way there at FOLLOW_SECONDS for this damping.
const FOLLOW_RATE = 20 / FOLLOW_SECONDS;
const SPRING = (FOLLOW_RATE / 60) ** 2;
const DAMPING = Math.exp((-2 * 0.8 * FOLLOW_RATE) / 60);
const REGRAB_COOLDOWN_MS = 750;

type Point = [number, number];

type Leg = {
  speck: Speck;
  // Extension, 0 (inside the body) to 1 (planted on the speck).
  t: number;
  releasing: boolean;
  // Even a comfortable arm re-plants now and then, so the idle state lives.
  holdMs: number;
  seed: number;
  sway: number;
  // Slightly varied thickness keeps the silhouette organic.
  thickness: number;
};

type Arm = { spine: Point[]; angle: number; extension: number; seed: number; thickness: number };

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
  private legs: Leg[] = [];
  private grabTimer = 0;

  constructor(private readonly reachScale = 1) {}
  // The first call places the symbiote; after that it follows. It never leaves:
  // when the pointer goes off screen it settles where the pointer was last.
  moveTo(x: number, y: number) {
    if (!this.active) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
    }
    this.targetX = x;
    this.targetY = y;
    this.active = true;
  }

  releaseAll() {
    for (const leg of this.legs) this.release(leg);
  }

  private release(leg: Leg) {
    if (leg.releasing) return;
    leg.releasing = true;
    leg.speck.held = false;
    leg.speck.cooldown = REGRAB_COOLDOWN_MS;
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

    this.presence += ((this.active ? 1 : 0) - this.presence) * (1 - 0.92 ** step);
    const reach = Math.min(Math.min(width, height) * REACH_SHARE, REACH_MAX) * this.reachScale;

    for (const leg of this.legs) {
      if (!leg.releasing) {
        leg.holdMs -= ms;
        const distance = Math.hypot(leg.speck.sx - this.x, leg.speck.sy - this.y);
        // Stretched too far, crawled over, or simply restless: lift the arm.
        if (distance > reach * 1.3 || distance < reach * 0.12 || leg.holdMs <= 0) {
          this.release(leg);
        } else {
          leg.t = Math.min(1, leg.t + GROW * step);
          if (leg.t > 0.85) {
            const cling = CLING ** step;
            leg.speck.vx *= cling;
            leg.speck.vy *= cling;
          }
        }
      }
      if (leg.releasing) leg.t -= RETRACT * step;
    }
    this.legs = this.legs.filter((leg) => leg.t > 0);

    this.grabTimer -= ms;
    const planted = this.legs.filter((leg) => !leg.releasing);
    if (this.active && planted.length < LEGS && this.grabTimer <= 0) {
      const targetDistance = reach * (0.38 + Math.random() * 0.52);
      const foot = this.chooseFoothold(specks, planted, reach, targetDistance);
      if (foot) {
        foot.held = true;
        this.legs.push({
          speck: foot,
          t: 0,
          releasing: false,
          holdMs: 1800 + Math.random() * 2600,
          seed: Math.random() * Math.PI * 2,
          sway: 0.9 + Math.random() * 0.7,
          thickness: 0.45 + Math.random() * 0.65,
        });
        this.grabTimer = GRAB_INTERVAL_MS;
      }
    }
  }

  // The best speck to plant on: near the preferred distance, clear of the
  // other arms, and ahead of the body when it is moving.
  private chooseFoothold(specks: Speck[], planted: Leg[], reach: number, targetDistance: number) {
    const speed = Math.hypot(this.vx, this.vy);
    const heading = Math.atan2(this.vy, this.vx);
    const forward = Math.min(1, speed / 2) * reach * 0.4;
    const angles = planted.map((leg) => Math.atan2(leg.speck.sy - this.y, leg.speck.sx - this.x));

    let best: Speck | null = null;
    let bestScore = Infinity;
    for (const speck of specks) {
      if (speck.held || speck.cooldown > 0) continue;
      const dx = speck.sx - this.x;
      const dy = speck.sy - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance < reach * 0.25 || distance > reach) continue;
      const angle = Math.atan2(dy, dx);
      const crowded = angles.some(
        (other) => Math.abs(Math.atan2(Math.sin(angle - other), Math.cos(angle - other))) < MIN_LEG_GAP,
      );
      if (crowded) continue;
      const score = Math.abs(distance - targetDistance) - forward * Math.max(0, Math.cos(angle - heading));
      if (score < bestScore) {
        best = speck;
        bestScore = score;
      }
    }
    return best;
  }

  draw(ctx: CanvasRenderingContext2D, time: number, ink: string) {
    if (this.presence < 0.01) return;
    const seconds = time / 1000;
    const scale = easeOut(this.presence);

    const arms = this.legs
      .map((leg) => this.armFor(leg, seconds))
      .filter((arm): arm is Arm => arm !== null)
      .sort((a, b) => a.angle - b.angle);

    ctx.save();
    ctx.globalAlpha = scale;
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const arm of arms) {
      drawThreads(ctx, arm, seconds);
    }
    if (arms.length > 0) circle(ctx, this.x, this.y, TIP_RADIUS * 1.2);
    ctx.restore();
  }

  // Centre line of an arm: grown from the body with a slow octopus curl, then
  // bent so its tip lands on the speck it holds.
  private armFor(leg: Leg, seconds: number): Arm | null {
    const extension = easeInOut(Math.max(0, leg.t));
    const tx = this.x + (leg.speck.sx - this.x) * extension;
    const ty = this.y + (leg.speck.sy - this.y) * extension;
    const length = Math.hypot(tx - this.x, ty - this.y);
    if (length < 1) return null;

    const angle = Math.atan2(ty - this.y, tx - this.x);
    const spine = writhe(this.x, this.y, angle, length, {
      seconds,
      seed: leg.seed,
      sway: leg.sway * (0.82 + 0.18 * Math.sin(seconds * 0.9 + leg.seed)),
      trailX: -this.vx * 5,
      trailY: -this.vy * 5,
    });
    const [ex, ey] = spine[spine.length - 1];
    for (let i = 0; i < spine.length; i += 1) {
      const u = i / (spine.length - 1);
      spine[i][0] += (tx - ex) * u;
      spine[i][1] += (ty - ey) * u;
    }
    return { spine, angle, extension, seed: leg.seed, thickness: leg.thickness };
  }

}

// A bundle of filaments fans from the shared centre, each rippling on its own.
function drawThreads(ctx: CanvasRenderingContext2D, arm: Arm, seconds: number) {
  const last = arm.spine.length - 1;
  for (let strand = 0; strand < THREADS_PER_ARM; strand += 1) {
    const fan = (strand - (THREADS_PER_ARM - 1) / 2) * THREAD_SPREAD * arm.thickness;
    ctx.lineWidth = THREAD_WIDTH * (0.92 + arm.thickness * 0.16);
    ctx.beginPath();

    for (let i = 0; i <= last; i += 1) {
      const before = arm.spine[Math.max(0, i - 1)];
      const after = arm.spine[Math.min(last, i + 1)];
      const dx = after[0] - before[0];
      const dy = after[1] - before[1];
      const length = Math.hypot(dx, dy) || 1;
      const u = i / last;
      const wave = Math.sin(u * 10 + seconds * 0.9 + arm.seed + strand * 1.6) * 2 * u;
      const offset = fan * Math.sin(u * Math.PI * 0.5) + wave;
      const x = arm.spine[i][0] - (dy / length) * offset;
      const y = arm.spine[i][1] + (dx / length) * offset;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  const [tipX, tipY] = arm.spine[last];
  circle(ctx, tipX, tipY, TIP_RADIUS);
}

type WritheOptions = {
  seconds: number;
  seed: number;
  // How hard the arm bends, in radians at the tip.
  sway: number;
  trailX: number;
  trailY: number;
};

/*
 * Centre line of a living arm. Rather than offsetting a straight line, it
 * walks outward and turns as it goes: two waves of different length and speed
 * set how sharply it turns at each point, so the root stays steady while the
 * far end curls. It trails behind the body's motion, most at the tip.
 */
function writhe(x: number, y: number, angle: number, length: number, options: WritheOptions): Point[] {
  const { seconds, seed, sway } = options;
  const segments = 32;
  const step = length / segments;
  const points: Point[] = [[x, y]];
  let px = x;
  let py = y;
  for (let i = 1; i <= segments; i += 1) {
    const u = i / segments;
    const turn =
      sway * u * Math.sin(u * Math.PI * 2.1 - seconds * 1.8 + seed) +
      sway * 0.45 * u * Math.sin(u * Math.PI * 4.3 - seconds * 3 + seed * 1.7) +
      sway * 0.22 * u * Math.sin(u * Math.PI * 7.5 - seconds * 4.6 + seed * 2.3);
    px += Math.cos(angle + turn) * step;
    py += Math.sin(angle + turn) * step;
    points.push([px + options.trailX * u, py + options.trailY * u]);
  }
  return points;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  if (r <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Fills a band along a centre line, with its half-width set along the length.
function ribbon(ctx: CanvasRenderingContext2D, points: Point[], width: (u: number) => number) {
  const last = points.length - 1;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= last; i += 1) {
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(last, i + 1)];
    const dx = after[0] - before[0];
    const dy = after[1] - before[1];
    const d = Math.hypot(dx, dy) || 1;
    const w = Math.max(0, width(i / last));
    const [px, py] = points[i];
    left.push([px - (dy / d) * w, py + (dx / d) * w]);
    right.push([px + (dy / d) * w, py - (dx / d) * w]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [px, py] of left) ctx.lineTo(px, py);
  for (let i = last; i >= 0; i -= 1) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}
