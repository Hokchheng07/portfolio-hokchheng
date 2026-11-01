import { BASE_FRAME_MS, type Speck } from "./dust";

/*
 * A solid ink symbiote that crawls over the dust.
 *
 * Body: a smooth round core that stretches a little with speed and breathes
 * when idle. Everything is filled in one opaque colour, so body, tentacles and
 * feet read as a single silhouette.
 *
 * Tentacles are ropes: chains of points with momentum, pulled by the body and
 * held together by length constraints. They whip on fast moves and swing when
 * the body stops, without any scripted waves. Thickness follows volume: a
 * stretched tentacle thins, a bunched one fattens, and a swallow pulse runs
 * down each one now and then.
 *
 * The count is fixed and every tentacle is always planted at full length. Each
 * owns an evenly spaced slot around the body and grips specks inside its own
 * sector. When a foothold falls behind, gets crawled over, or the tentacle grows
 * restless, the tip steps straight from the old foothold to a new one, like a
 * spider's leg; it never pulls back into the body. With no speck in reach, it
 * plants on an empty spot in its slot instead, so the arms never go slack.
 *
 * Idle: the body wanders slowly around the last pointer position, always a
 * little off the pointer so it never covers it, and breathes.
 */

// How far a tentacle reaches, as a share of the window's short side, capped.
const REACH_SHARE = 0.32;
const REACH_MAX = 240;
// Rope: points per tentacle, constraint passes, kept velocity, droop, writhe.
const NODES = 16;
const ITERATIONS = 6;
const ROPE_DAMPING = 0.9;
const DROOP = 0.03;
const LIFE = 0.3;
// A planted tentacle is a little longer than the gap it spans, so it sags.
const SLACK = 1.08;
// How far a tentacle may grip from its slot's centre, as a share of the slot.
const SECTOR = 0.9;
// When its own sector is empty, a tentacle may look this far past its slot.
const SECTOR_WIDE = 1.6;
// A foothold this far out, as a share of the reach, must be left at once.
const OVERSTRETCH = 1.4;
// Dust drifts well under this many pixels per frame. A held speck that moves
// faster is being carried by page scroll (or has wrapped across the window).
const DRIFT_MAX = 3;
// Stagger steps so tentacles move one after another, not all at once; faster
// while moving, so it keeps catching the dots it passes.
const STEP_INTERVAL_MS = 110;
const STEP_INTERVAL_MOVING_MS = 35;
// Body speed (px per frame) above which it counts as moving.
const MOVING_SPEED = 0.6;
// Step progress per frame; about half a second to land.
const GROW = 0.055;
// Faster while moving, so steps land before the body passes them.
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
const ARM_ROOT = 6.5;
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
  // Centre of this tentacle's slot around the body.
  angle: number;
  // The foothold: a speck, or an empty spot when `speck` is null. Null only
  // before the first step.
  target: Point | null;
  speck: Speck | null;
  nodes: Point[];
  prev: Point[];
  // Rest length of one rope segment.
  rest: number;
  // Step progress toward the foothold, 0 to 1; eased with overshoot so the tip
  // lands with a slap.
  t: number;
  // Where the tip was when this step began.
  from: Point;
  holdMs: number;
  // How badly this tentacle wants a new foothold; 0 when it is happy.
  urge: number;
  // Milliseconds since the tip landed on its foothold, or -1 before it has.
  landedMs: number;
  seed: number;
  // When the next swallow pulse runs down this tentacle, in seconds.
  pulseAt: number;
};

export type SymbioteOptions = {
  scale: number;
  tentacles: number;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;
// Overshoots past 1 before settling: the slap when a tip lands.
const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};
const angleBetween = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

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
  private stepTimer = 0;

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
    // One tentacle per slot, evenly spaced, with a random turn of the whole set.
    const count = this.options.tentacles;
    const turn = Math.random() * Math.PI * 2;
    this.legs = Array.from({ length: count }, (_, i) => this.newLeg(turn + (i / count) * Math.PI * 2));
  }

  // Drop every foothold, so each tentacle steps to a new one on the next frame.
  releaseAll() {
    for (const leg of this.legs) {
      this.letGo(leg);
      leg.target = null;
    }
  }

  private letGo(leg: Leg) {
    if (!leg.speck) return;
    leg.speck.held = false;
    leg.speck.cooldown = REGRAB_COOLDOWN_MS;
    leg.speck = null;
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

    // A tentacle with no foothold, or one stretched past its limit, steps now.
    for (const leg of this.legs) {
      if (!leg.target || leg.urge >= OVERSTRETCH) this.stepLeg(leg, specks, reach);
    }
    // Otherwise the most eager tentacle steps, one at a time.
    this.stepTimer -= ms;
    if (this.stepTimer > 0) return;
    let next: Leg | null = null;
    for (const leg of this.legs) {
      if (leg.urge > 0 && leg.t >= 1 && (!next || leg.urge > next.urge)) next = leg;
    }
    if (!next) return;
    this.stepLeg(next, specks, reach);
    this.stepTimer = Math.hypot(this.vx, this.vy) > MOVING_SPEED ? STEP_INTERVAL_MOVING_MS : STEP_INTERVAL_MS;
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

  private newLeg(angle: number): Leg {
    const root = this.rootFor(angle);
    return {
      angle,
      target: null,
      speck: null,
      nodes: Array.from({ length: NODES }, (): Point => [root[0], root[1]]),
      prev: Array.from({ length: NODES }, (): Point => [root[0], root[1]]),
      rest: 0,
      t: 0,
      from: [root[0], root[1]],
      holdMs: 0,
      urge: 0,
      landedMs: -1,
      seed: Math.random() * Math.PI * 2,
      pulseAt: this.clockMs / 1000 + 1 + Math.random() * 3,
    };
  }

  // Move the tip from wherever it is to a new foothold: a speck in its sector,
  // or an empty spot in its slot when there is none.
  private stepLeg(leg: Leg, specks: Speck[], reach: number) {
    this.letGo(leg);
    const speck = this.chooseFoothold(specks, leg, reach);
    if (speck) {
      speck.held = true;
      leg.speck = speck;
      leg.target = [speck.sx, speck.sy];
    } else {
      // Lean the empty foothold toward the heading while moving, so the arm
      // reaches ahead instead of planting where the body will leave it behind.
      const speed = Math.hypot(this.vx, this.vy);
      const ahead = speed > MOVING_SPEED ? Math.cos(leg.angle - Math.atan2(this.vy, this.vx)) : 0;
      const length = reach * (0.7 + 0.15 * ahead + Math.random() * 0.15);
      const angle = leg.angle + (Math.random() - 0.5) * (Math.PI / this.legs.length);
      leg.target = [this.x + Math.cos(angle) * length, this.y + Math.sin(angle) * length];
    }
    const tip = leg.nodes[NODES - 1];
    leg.from = [tip[0], tip[1]];
    leg.t = 0;
    leg.urge = 0;
    leg.landedMs = -1;
    leg.holdMs = 1800 + Math.random() * 2600;
  }

  private rootFor(angle: number): Point {
    const offset = BODY_RADIUS * this.options.scale * 0.5;
    return [this.x + Math.cos(angle) * offset, this.y + Math.sin(angle) * offset];
  }

  private updateLeg(leg: Leg, step: number, ms: number, seconds: number, reach: number) {
    const nodes = leg.nodes;
    const last = NODES - 1;
    const tip = nodes[last];
    if (!leg.target) return;

    // A speck may drift a little under the grip; follow it. The body lives on
    // the screen while the dust scrolls with the page, so a speck carried by
    // scroll would drag the tentacle into a long line. Let go instead and keep
    // the foot planted where it is on screen; the dust slides past beneath it.
    if (leg.speck) {
      const moved = Math.hypot(leg.speck.sx - leg.target[0], leg.speck.sy - leg.target[1]);
      if (moved > DRIFT_MAX * step) {
        this.letGo(leg);
      } else {
        leg.target = [leg.speck.sx, leg.speck.sy];
      }
    }
    const goal = leg.target;

    // How badly it wants to move on. Restless sooner while idle, so the resting
    // symbiote keeps shifting; a foothold left behind while moving is dropped
    // early rather than stretching into a long spike trailing the body.
    leg.holdMs -= ms * (1 + this.idle * 1.5);
    const distance = Math.hypot(goal[0] - this.x, goal[1] - this.y) / reach;
    const speed = Math.hypot(this.vx, this.vy);
    const behind =
      speed > MOVING_SPEED && Math.cos(Math.atan2(goal[1] - this.y, goal[0] - this.x) - Math.atan2(this.vy, this.vx)) < -0.2;
    leg.urge = 0;
    if (distance > 1.15 || distance < 0.25 || (behind && distance > 0.75) || leg.holdMs <= 0) {
      leg.urge = Math.max(distance, 0.5);
    }

    const root = this.rootFor(Math.atan2(goal[1] - this.y, goal[0] - this.x));
    const grow = speed > MOVING_SPEED ? GROW_MOVING : GROW;
    leg.t = Math.min(1, leg.t + grow * step);
    const stepT = easeOutBack(leg.t);
    const aim: Point = [leg.from[0] + (goal[0] - leg.from[0]) * stepT, leg.from[1] + (goal[1] - leg.from[1]) * stepT];

    const span = Math.hypot(aim[0] - root[0], aim[1] - root[1]);
    const desired = (span * SLACK) / last;
    leg.rest += (desired - leg.rest) * (1 - 0.8 ** step);

    if (leg.t >= 1) {
      if (leg.landedMs < 0) leg.landedMs = 0;
      else leg.landedMs += ms;
      if (leg.speck) {
        const cling = CLING ** step;
        leg.speck.vx *= cling;
        leg.speck.vy *= cling;
      }
    }

    // Momentum, droop, and a writhing push across the rope, strongest at the tip.
    const keep = ROPE_DAMPING ** step;
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

    for (let pass = 0; pass < ITERATIONS; pass += 1) {
      nodes[0][0] = root[0];
      nodes[0][1] = root[1];
      tip[0] = aim[0];
      tip[1] = aim[1];
      for (let i = 0; i < last; i += 1) {
        const a = nodes[i];
        const b = nodes[i + 1];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - leg.rest) / d;
        const aFixed = i === 0;
        const bFixed = i + 1 === last;
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

  // The best speck for this tentacle: inside its own sector, or a wider one
  // when that is empty.
  private chooseFoothold(specks: Speck[], leg: Leg, reach: number) {
    const slot = Math.PI / this.legs.length;
    return this.searchFoothold(specks, leg, reach, slot * SECTOR) ?? this.searchFoothold(specks, leg, reach, slot * SECTOR_WIDE);
  }

  // Within the sector and distance band: near a varied preferred distance, and
  // ahead of the body when it is moving.
  private searchFoothold(specks: Speck[], leg: Leg, reach: number, sector: number) {
    const speed = Math.hypot(this.vx, this.vy);
    const heading = Math.atan2(this.vy, this.vx);
    const forward = Math.min(1, speed / 2) * reach * 0.8;
    // Reach further while moving: long tentacles thrown ahead keep its size.
    const preferred = speed > MOVING_SPEED ? reach * (0.75 + Math.random() * 0.25) : reach * (0.6 + Math.random() * 0.35);

    let best: Speck | null = null;
    let bestScore = Infinity;
    for (const speck of specks) {
      if (speck.held || speck.cooldown > 0) continue;
      const dx = speck.sx - this.x;
      const dy = speck.sy - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance < reach * 0.4 || distance > reach) continue;
      const angle = Math.atan2(dy, dx);
      if (angleBetween(angle, leg.angle) > sector) continue;
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

    for (const leg of this.legs) {
      if (!leg.target) continue;
      const points = catmullRom(leg.nodes, 3);
      ribbon(ctx, points, (u) => this.widthAt(leg, u, seconds));

      if (leg.landedMs >= 0) {
        // The foot lands flattened and springs back to round.
        const squash = Math.exp(-leg.landedMs / 140);
        const [tx, ty] = leg.nodes[NODES - 1];
        const [px, py] = leg.nodes[NODES - 2];
        const r = FOOT_RADIUS * this.scale;
        ctx.beginPath();
        ctx.ellipse(tx, ty, r * (1 + 0.6 * squash), r * (1 - 0.35 * squash), Math.atan2(ty - py, tx - px) + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.drawBody(ctx, seconds);
  }

  // Half-width along a tentacle: thick root, fine tip, thinned by stretch and
  // fattened when bunched, with a swallow pulse running from tip to body.
  private widthAt(leg: Leg, u: number, seconds: number) {
    let length = 0;
    for (let i = 1; i < NODES; i += 1) {
      length += Math.hypot(leg.nodes[i][0] - leg.nodes[i - 1][0], leg.nodes[i][1] - leg.nodes[i - 1][1]);
    }
    const stretch = length / Math.max(1, leg.rest * (NODES - 1));
    const volume = Math.min(1.3, Math.max(0.8, 1 / Math.sqrt(stretch || 1)));
    const pulseU = 1 - (seconds - leg.pulseAt) / 1.2;
    const pulse = pulseU >= 0 && pulseU <= 1 ? 0.4 * Math.exp(-(((u - pulseU) / 0.08) ** 2)) : 0;
    const root = ARM_ROOT * this.scale;
    return (ARM_TIP + (root - ARM_TIP) * (1 - u) ** 1.3) * volume * (1 + pulse);
  }

  // The core: a clean ellipse, stretched along its motion and breathing when
  // idle, so the centre always reads as one consistent shape.
  private drawBody(ctx: CanvasRenderingContext2D, seconds: number) {
    const breath = 1 + 0.05 * this.idle * Math.sin(seconds * 1.6);
    const radius = this.radius * breath;
    const speed = Math.hypot(this.vx, this.vy);
    const stretch = Math.min(speed * 0.03, 0.35);
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, radius * (1 + stretch), radius / Math.sqrt(1 + stretch), Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
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
