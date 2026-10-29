import { BASE_FRAME_MS, type Speck } from "./dust";

/*
 * A solid ink symbiote that crawls over the dust.
 *
 * Body: a blob with a wobbling edge that stretches with speed and swells where
 * each tentacle leaves it. Everything is filled in one opaque colour, so body,
 * tentacles and feet read as a single silhouette.
 *
 * Tentacles are ropes: chains of points with momentum, pulled by the body and
 * held together by length constraints. They whip on fast moves, swing when the
 * body stops and droop when slack, without any scripted waves. Thickness
 * follows volume: a stretched tentacle thins, a bunched one fattens, and a
 * swallow pulse runs down each one now and then.
 *
 * Two kinds of tentacle:
 * - Grippers reach for a speck, slap onto it with a small overshoot, hold it
 *   still, and peel back to the body when stretched too far, crawled over, or
 *   restless. New grips favour specks ahead of the body.
 * - Feelers never grip. They reach out, curl, and pull back on their own timers.
 *
 * Idle: the body wanders slowly around the last pointer position, always a
 * little off the pointer so it never covers it, and breathes.
 */

// How far a tentacle reaches, as a share of the window's short side, capped.
const REACH_SHARE = 0.3;
const REACH_MAX = 200;
// Rope: points per tentacle, constraint passes, kept velocity, droop, writhe.
const NODES = 16;
const ITERATIONS = 6;
const ROPE_DAMPING = 0.9;
const DROOP = 0.03;
const LIFE = 0.3;
// A gripping tentacle is a little longer than the gap it spans, so it sags.
const SLACK = 1.08;
// Rest length kept per frame while a tentacle peels back to the body.
const PEEL = 0.72;
// Velocity a peeling tentacle keeps per frame: low, so it snaps back to the
// body instead of trailing behind it like a spike.
const PEEL_DAMPING = 0.4;
// A new grip will not land within this angle of another, so tentacles fan out.
const MIN_LEG_GAP = 0.55;
// Stagger new tentacles so they reach one after another, not all at once;
// faster while moving, so it keeps catching the dots it passes.
const GRAB_INTERVAL_MS = 110;
const GRAB_INTERVAL_MOVING_MS = 35;
// Body speed (px per frame) above which it counts as moving.
const MOVING_SPEED = 0.6;
// Reach progress per frame; about half a second to land.
const GROW = 0.055;
// Faster while moving, so new tentacles land before the body passes them.
const GROW_MOVING = 0.11;
// How firmly a gripping tip pins its speck: the share of drift kept each frame.
const CLING = 0.8;
// Seconds the body takes to settle on the pointer. The spring is derived from
// it: stiffness for that settle time, damping just under critical so the body
// lags behind and eases in with only a hint of overshoot.
const FOLLOW_SECONDS = 5;
// 3.7 puts 95% of the way there at FOLLOW_SECONDS for this damping.
const FOLLOW_RATE = 20 / FOLLOW_SECONDS;
const SPRING = (FOLLOW_RATE / 60) ** 2;
const DAMPING = Math.exp((-2 * 0.8 * FOLLOW_RATE) / 60);
const REGRAB_COOLDOWN_MS = 400;

// Sizes before the symbiote's own scale.
const BODY_RADIUS = 11;
// Tentacle half-width at the root and the tip, in pixels. Independent of the
// body size, so a smaller blob keeps its thick tentacles.
const ARM_ROOT = 7.5;
const ARM_TIP = 0.6;
const FOOT_RADIUS = 2.6;

// Idle: wander around the pointer once it has been still for a moment.
const POINTER_GAP = 30;
const WANDER_MIN = 40;
const WANDER_MAX = 70;
const IDLE_AFTER_MS = 1000;
const IDLE_FULL_MS = 2500;

type Point = [number, number];

type Leg = {
  kind: "grip" | "feeler";
  speck: Speck | null;
  nodes: Point[];
  prev: Point[];
  // Rest length of one rope segment.
  rest: number;
  // Reach progress, 0 to 1; eased with overshoot so a grip lands with a slap.
  t: number;
  releasing: boolean;
  holdMs: number;
  ageMs: number;
  lifeMs: number;
  // Milliseconds since the tip landed on its speck, or -1 before it has.
  landedMs: number;
  // Feelers reach out along this direction.
  angle: number;
  seed: number;
  thickness: number;
  // When the next swallow pulse runs down this tentacle, in seconds.
  pulseAt: number;
};

export type SymbioteOptions = {
  scale: number;
  grips: number;
  feelers: number;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;
// Overshoots past 1 before settling: the slap when a tip lands.
const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

export class Symbiote {
  x = 0;
  y = 0;
  private vx = 0;
  private vy = 0;
  private targetX = 0;
  private targetY = 0;
  private pointerX = 0;
  private pointerY = 0;
  private active = false;
  private presence = 0;
  private idleMs = 0;
  private idle = 0;
  private wanderAngle = Math.random() * Math.PI * 2;
  private clockMs = 0;
  private legs: Leg[] = [];
  private grabTimer = 0;
  private feelerTimer = 0;

  constructor(private readonly options: SymbioteOptions) {}

  get scale() {
    return this.options.scale * easeOut(this.presence);
  }

  get radius() {
    return BODY_RADIUS * this.scale;
  }

  // Follow a pointer, wandering around it when it rests. The first call places
  // the symbiote; it never leaves, settling near where the pointer was last.
  point(x: number, y: number) {
    if (Math.hypot(x - this.pointerX, y - this.pointerY) > 2) this.idleMs = 0;
    this.pointerX = x;
    this.pointerY = y;
    this.place(x, y);
  }

  private place(x: number, y: number) {
    if (this.active) return;
    this.x = x;
    this.y = y;
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
    if (leg.speck) {
      leg.speck.held = false;
      leg.speck.cooldown = REGRAB_COOLDOWN_MS;
    }
  }

  update(step: number, specks: Speck[], width: number, height: number) {
    const ms = step * BASE_FRAME_MS;
    this.clockMs += ms;
    const seconds = this.clockMs / 1000;

    this.updateTarget(step, ms, seconds);
    this.vx += (this.targetX - this.x) * SPRING * step;
    this.vy += (this.targetY - this.y) * SPRING * step;
    const damping = DAMPING ** step;
    this.vx *= damping;
    this.vy *= damping;
    this.x += this.vx * step;
    this.y += this.vy * step;
    this.presence += ((this.active ? 1 : 0) - this.presence) * (1 - 0.92 ** step);

    const reach = Math.min(Math.min(width, height) * REACH_SHARE, REACH_MAX) * this.options.scale;
    for (const leg of this.legs) this.updateLeg(leg, step, ms, seconds, reach);
    this.legs = this.legs.filter((leg) => !leg.releasing || leg.rest * (NODES - 1) > 2);

    if (!this.active) return;
    this.grabTimer -= ms;
    const grips = this.legs.filter((leg) => leg.kind === "grip" && !leg.releasing);
    if (grips.length < this.options.grips && this.grabTimer <= 0) {
      const speck = this.chooseFoothold(specks, grips, reach);
      if (speck) {
        speck.held = true;
        this.legs.push(this.newLeg("grip", speck, Math.atan2(speck.sy - this.y, speck.sx - this.x)));
        this.grabTimer = Math.hypot(this.vx, this.vy) > MOVING_SPEED ? GRAB_INTERVAL_MOVING_MS : GRAB_INTERVAL_MS;
      }
    }
    this.feelerTimer -= ms;
    const feelers = this.legs.filter((leg) => leg.kind === "feeler" && !leg.releasing);
    if (feelers.length < this.options.feelers && this.feelerTimer <= 0) {
      this.legs.push(this.newLeg("feeler", null, Math.random() * Math.PI * 2));
      this.feelerTimer = 600 + Math.random() * 1400;
    }
  }

  // Where the body heads: a spot near the pointer that drifts in a slow circle
  // once the pointer has been still a while.
  private updateTarget(step: number, ms: number, seconds: number) {
    this.idleMs += ms;
    this.idle = smoothstep(IDLE_AFTER_MS, IDLE_FULL_MS, this.idleMs);
    this.wanderAngle += (0.35 + 0.5 * Math.sin(seconds * 0.31 + 1.7)) * 0.012 * step;
    const swing = WANDER_MIN + (WANDER_MAX - WANDER_MIN) * (0.5 + 0.5 * Math.sin(seconds * 0.47));
    const distance = POINTER_GAP + (swing - POINTER_GAP) * this.idle;
    this.targetX = this.pointerX + Math.cos(this.wanderAngle) * distance;
    this.targetY = this.pointerY + Math.sin(this.wanderAngle) * distance;
  }

  private newLeg(kind: Leg["kind"], speck: Speck | null, angle: number): Leg {
    const root = this.rootFor(angle);
    return {
      kind,
      speck,
      nodes: Array.from({ length: NODES }, (): Point => [root[0], root[1]]),
      prev: Array.from({ length: NODES }, (): Point => [root[0], root[1]]),
      rest: 0,
      t: 0,
      releasing: false,
      holdMs: 1800 + Math.random() * 2600,
      ageMs: 0,
      lifeMs: 2200 + Math.random() * 2000,
      landedMs: -1,
      angle,
      seed: Math.random() * Math.PI * 2,
      thickness: kind === "feeler" ? 0.55 + Math.random() * 0.2 : 0.8 + Math.random() * 0.4,
      pulseAt: this.clockMs / 1000 + 1 + Math.random() * 3,
    };
  }

  private rootFor(angle: number): Point {
    const offset = BODY_RADIUS * this.options.scale * 0.5;
    return [this.x + Math.cos(angle) * offset, this.y + Math.sin(angle) * offset];
  }

  private updateLeg(leg: Leg, step: number, ms: number, seconds: number, reach: number) {
    leg.ageMs += ms;
    const nodes = leg.nodes;
    const last = NODES - 1;
    const tip = nodes[last];

    // Where the tip is headed.
    let goal: Point;
    if (leg.kind === "grip" && leg.speck) {
      goal = [leg.speck.sx, leg.speck.sy];
      if (!leg.releasing) {
        // Restless sooner while idle, so the resting symbiote keeps shifting.
        leg.holdMs -= ms * (1 + this.idle * 1.5);
        const distance = Math.hypot(goal[0] - this.x, goal[1] - this.y);
        // While moving, a grip left behind lets go early rather than stretching
        // into a long spike trailing the body.
        const speed = Math.hypot(this.vx, this.vy);
        const toSpeck = Math.atan2(goal[1] - this.y, goal[0] - this.x);
        const behind = speed > MOVING_SPEED && Math.cos(toSpeck - Math.atan2(this.vy, this.vx)) < -0.2;
        // Only once enough other grips are holding, so it never thins out.
        const planted = this.legs.filter((other) => other.kind === "grip" && !other.releasing).length;
        if (
          distance > reach * 1.3 ||
          distance < reach * 0.12 ||
          (behind && planted > 3 && distance > reach * 0.7) ||
          leg.holdMs <= 0
        ) {
          this.release(leg);
        }
      }
    } else {
      // Feelers reach out, hover with a curl, then pull back.
      const life = leg.ageMs / leg.lifeMs;
      if (life >= 1 && !leg.releasing) this.release(leg);
      const out = smoothstep(0, 0.3, life) * (1 - smoothstep(0.75, 1, life));
      const angle = leg.angle + 0.9 * Math.sin(seconds * 0.8 + leg.seed);
      const length = reach * 0.42 * out;
      goal = [this.x + Math.cos(angle) * length, this.y + Math.sin(angle) * length];
    }

    const angle = Math.atan2(goal[1] - this.y, goal[0] - this.x);
    const root = this.rootFor(angle);
    if (!leg.releasing) {
      const grow = Math.hypot(this.vx, this.vy) > MOVING_SPEED ? GROW_MOVING : GROW;
      leg.t = Math.min(1, leg.t + grow * step);
    }
    const reachT = easeOutBack(leg.t);
    const aim: Point = [root[0] + (goal[0] - root[0]) * reachT, root[1] + (goal[1] - root[1]) * reachT];

    if (leg.releasing) {
      leg.rest *= PEEL ** step;
    } else {
      const span = Math.hypot(aim[0] - root[0], aim[1] - root[1]);
      const desired = (span * SLACK) / last;
      leg.rest += (desired - leg.rest) * (1 - 0.8 ** step);
    }

    const grips = leg.kind === "grip" && !leg.releasing;
    if (grips && leg.t >= 1) {
      if (leg.landedMs < 0) leg.landedMs = 0;
      else leg.landedMs += ms;
      if (leg.speck) {
        const cling = CLING ** step;
        leg.speck.vx *= cling;
        leg.speck.vy *= cling;
      }
    }

    // Momentum, droop, and a writhing push across the rope, strongest at the tip.
    const keep = (leg.releasing ? PEEL_DAMPING : ROPE_DAMPING) ** step;
    for (let i = 1; i < NODES; i += 1) {
      const p = nodes[i];
      const q = leg.prev[i];
      const vx = (p[0] - q[0]) * keep;
      const vy = (p[1] - q[1]) * keep;
      q[0] = p[0];
      q[1] = p[1];
      const before = nodes[i - 1];
      const dx = p[0] - before[0];
      const dy = p[1] - before[1];
      const d = Math.hypot(dx, dy) || 1;
      const u = i / last;
      const push = LIFE * Math.sin(seconds * 3.1 + i * 0.7 + leg.seed) * u * step;
      p[0] += vx - (dy / d) * push;
      p[1] += vy + (dx / d) * push + DROOP * step;
    }
    // A feeler's tip is drawn toward its aim rather than pinned, so it curls.
    // A peeling tip is drawn home to the body instead of toward what it let go.
    if (!grips) {
      const home = leg.releasing ? root : aim;
      const pull = leg.releasing ? 0.3 : 0.12;
      tip[0] += (home[0] - tip[0]) * pull * step;
      tip[1] += (home[1] - tip[1]) * pull * step;
    }

    for (let pass = 0; pass < ITERATIONS; pass += 1) {
      nodes[0][0] = root[0];
      nodes[0][1] = root[1];
      if (grips) {
        tip[0] = aim[0];
        tip[1] = aim[1];
      }
      for (let i = 0; i < last; i += 1) {
        const a = nodes[i];
        const b = nodes[i + 1];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - leg.rest) / d;
        const aFixed = i === 0;
        const bFixed = grips && i + 1 === last;
        const share = aFixed || bFixed ? 1 : 0.5;
        if (!aFixed) {
          a[0] += dx * diff * share;
          a[1] += dy * diff * share;
        }
        if (!bFixed) {
          b[0] -= dx * diff * share;
          b[1] -= dy * diff * share;
        }
      }
    }

    // Schedule the next swallow pulse once the last one has run its course.
    if (seconds > leg.pulseAt + 1.2) leg.pulseAt = seconds + 2 + Math.random() * 3;
  }

  // The best speck to grip: near a varied preferred distance, clear of the
  // other grips, and ahead of the body when it is moving.
  private chooseFoothold(specks: Speck[], grips: Leg[], reach: number) {
    const speed = Math.hypot(this.vx, this.vy);
    const heading = Math.atan2(this.vy, this.vx);
    const forward = Math.min(1, speed / 2) * reach * 0.8;
    // Reach further while moving: long tentacles thrown ahead keep its size.
    const preferred = speed > MOVING_SPEED ? reach * (0.65 + Math.random() * 0.35) : reach * (0.38 + Math.random() * 0.52);
    const angles = grips.map((leg) => leg.angle);

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
      const score = Math.abs(distance - preferred) - forward * Math.max(0, Math.cos(angle - heading));
      if (score < bestScore) {
        best = speck;
        bestScore = score;
      }
    }
    return best;
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    if (this.presence < 0.01) return;
    const seconds = time / 1000;
    const breath = 1 + 0.07 * this.idle * Math.sin(seconds * 1.6);
    const radius = this.radius * breath;

    const roots: { angle: number; strength: number }[] = [];
    for (const leg of this.legs) {
      const points = catmullRom(leg.nodes, 3);
      ribbon(ctx, points, (u) => this.widthAt(leg, u, seconds));
      const [tx, ty] = leg.nodes[NODES - 1];
      roots.push({ angle: Math.atan2(ty - this.y, tx - this.x), strength: Math.min(1, leg.t) });

      if (leg.kind === "grip" && !leg.releasing && leg.landedMs >= 0) {
        // The foot lands flattened and springs back to round.
        const squash = Math.exp(-leg.landedMs / 140);
        const [px, py] = leg.nodes[NODES - 2];
        const r = FOOT_RADIUS * this.scale;
        ctx.beginPath();
        ctx.ellipse(tx, ty, r * (1 + 0.6 * squash), r * (1 - 0.35 * squash), Math.atan2(ty - py, tx - px) + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.drawBody(ctx, radius, seconds, roots);
  }

  // Half-width along a tentacle: thick root, fine tip, thinned by stretch and
  // fattened when bunched, with a swallow pulse running from tip to body.
  private widthAt(leg: Leg, u: number, seconds: number) {
    let length = 0;
    for (let i = 1; i < NODES; i += 1) {
      length += Math.hypot(leg.nodes[i][0] - leg.nodes[i - 1][0], leg.nodes[i][1] - leg.nodes[i - 1][1]);
    }
    const stretch = length / Math.max(1, leg.rest * (NODES - 1));
    const volume = Math.min(1.5, Math.max(0.75, 1 / Math.sqrt(stretch || 1)));
    const pulseU = 1 - (seconds - leg.pulseAt) / 1.2;
    const pulse = pulseU >= 0 && pulseU <= 1 ? 0.6 * Math.exp(-(((u - pulseU) / 0.08) ** 2)) : 0;
    const root = ARM_ROOT * this.scale * leg.thickness;
    return (ARM_TIP + (root - ARM_TIP) * (1 - u) ** 1.3) * volume * (1 + pulse);
  }

  // The blob: a wobbling ink edge, stretched along its motion, swelling where
  // each tentacle leaves it so body and tentacles read as one mass.
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

    const points: Point[] = [];
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
      for (const root of roots) {
        r += radius * 0.45 * root.strength * Math.max(0, Math.cos(angle - root.angle)) ** 12;
      }
      points.push([this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r]);
    }

    // Smooth closed curve through the midpoints of the outline.
    const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
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

// Smooth curve through rope points, `per` samples per segment.
function catmullRom(points: Point[], per: number): Point[] {
  const out: Point[] = [];
  const last = points.length - 1;
  for (let i = 0; i < last; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(last, i + 2)];
    for (let s = 0; s < per; s += 1) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push([points[last][0], points[last][1]]);
  return out;
}

function normalAt(points: Point[], i: number): Point {
  const last = points.length - 1;
  const before = points[Math.max(0, i - 1)];
  const after = points[Math.min(last, i + 1)];
  const dx = after[0] - before[0];
  const dy = after[1] - before[1];
  const d = Math.hypot(dx, dy) || 1;
  return [-dy / d, dx / d];
}

// Fills a band along a centre line, with its half-width set along the length.
function ribbon(ctx: CanvasRenderingContext2D, points: Point[], width: (u: number) => number) {
  const last = points.length - 1;
  if (last < 1) return;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= last; i += 1) {
    const [nx, ny] = normalAt(points, i);
    const w = Math.max(0, width(i / last));
    const [px, py] = points[i];
    left.push([px + nx * w, py + ny * w]);
    right.push([px - nx * w, py - ny * w]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [px, py] of left) ctx.lineTo(px, py);
  for (let i = last; i >= 0; i -= 1) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}
