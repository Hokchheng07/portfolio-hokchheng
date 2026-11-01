import type { CSSProperties, ReactNode } from "react";
import { katanaMarkup } from "./katana";

/*
 * The katana intro, as a pure function of time. Ported from the Claude Design
 * export (loader.jsx): the loader card holds while the page loads, a katana
 * flies in, winds up and cuts the screen diagonally from the top-right corner
 * to the bottom-left, and the card splits along the cut, uncovering the site.
 *
 * The card's own motion (leaves, grain, intro, bar) is CSS. Only the strike is
 * drawn here, as a function of the timeline `T`, which the loader starts just
 * before Ready once the page is ready.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

function bez(x1: number, y1: number, x2: number, y2: number) {
  const X = (t: number) => 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t;
  const Y = (t: number) => 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const m = (lo + hi) / 2;
      if (X(m) < x) lo = m;
      else hi = m;
    }
    return Y((lo + hi) / 2);
  };
}

// The three motion curves. Everything in the piece uses one of these.
const E = {
  // Intro, bar chunks, dim, fades.
  settle: bez(0.45, 0, 0.55, 1),
  // The swing: accelerates out of the wind-up, still fast at the end.
  strike: bez(0.5, 0, 0.75, 0.7),
  // Halves: fast start, soft finish, no overshoot.
  split: bez(0.22, 1, 0.36, 1),
};
const settle = (T: number, a: number, b: number) => E.settle(clamp01((T - a) / (b - a)));
const strike = (T: number, a: number, b: number) => E.strike(clamp01((T - a) / (b - a)));
const split = (T: number, a: number, b: number) => E.split(clamp01((T - a) / (b - a)));

// Cue times in seconds, from the design's scene list.
export const CUES = {
  Hold: 0,
  Ready: 2.2,
  FlyIn: 2.5,
  Windup: 3.05,
  Strike: 3.27,
  Cut: 3.53,
  Split: 3.67,
  Done: 4.52,
};
type Cues = typeof CUES;

const RED = "#b3121b";
const SANS = "var(--font-google-sans), system-ui, sans-serif";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";
const SERIF_JP = "'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif";
// End slope of the strike curve, so the exit carries on at the swing's speed.
const SLOPE = 1.2;
// Raised guard, wind-up, and end of swing, in degrees of screen rotation.
const TH_R = -78;
const TH_W = -58;
const TH_E = -262;
const dirOf = (a: number): [number, number] => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Spark = { frac: number; at: number; side: number; vp: number; va: number; life: number; len: number; red: boolean };
type Frag = { frac: number; at: number; side: number; vp: number; va: number; life: number; size: number; spin: number; shape: number };
type Geo = ReturnType<typeof makeGeo>;

function makeGeo(W: number, H: number) {
  const L = Math.hypot(W, H);
  const mobile = W < 700;
  const k = mobile ? 0.34 : 0.55;
  // Grip centre (the pivot) to tip.
  const Rt = 1021 * k;
  const g = {
    W,
    H,
    L,
    mobile,
    // Cut direction, top-right to bottom-left, and its normal toward the lower-right half.
    ux: -W / L,
    uy: H / L,
    nx: H / L,
    ny: W / L,
    ang: (Math.atan2(H, -W) * 180) / Math.PI,
    k,
    Rt,
    // Contact point and inner edge of the swoosh, measured from the pivot.
    Rc: 0.75 * Rt,
    Ri: 0.5 * Rt,
    // Contact starts c0 before the top-right corner and ends c1 past the bottom-left.
    c0: 0.25 * Rt,
    c1: 0.2 * Rt,
    // Raised-guard pivot.
    Hr: mobile ? { x: W * 0.74, y: H * 0.36 } : { x: W * 0.86, y: H * 0.6 },
    // Distance each half travels to clear the viewport.
    split: (1.15 * W * H) / L + 40,
    ps: mobile ? 0.6 : 1,
    sparks: [] as Spark[],
    frags: [] as Frag[],
  };
  const r = rng(7);
  // Strike-phase fraction at which the tip passes this point of the cut.
  const spawnT = (frac: number) => {
    const p = (frac * L + g.c0) / (L + g.c0 + g.c1);
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20; i++) {
      const m = (lo + hi) / 2;
      if (E.strike(m) < p) lo = m;
      else hi = m;
    }
    return lo;
  };
  g.sparks = Array.from({ length: 18 }, () => {
    const frac = 0.05 + r() * 0.92;
    return {
      frac,
      at: spawnT(frac),
      side: r() < 0.55 ? 1 : -1,
      vp: (220 + r() * 420) * g.ps,
      va: (-60 + r() * 420) * g.ps,
      life: 0.35 + r() * 0.4,
      len: (10 + r() * 18) * (mobile ? 0.7 : 1),
      red: r() < 0.35,
    };
  });
  g.frags = Array.from({ length: 5 }, () => {
    const frac = 0.15 + r() * 0.75;
    return {
      frac,
      at: spawnT(frac),
      side: r() < 0.5 ? 1 : -1,
      vp: (90 + r() * 120) * g.ps,
      va: (40 + r() * 140) * g.ps,
      life: 1.1 + r() * 0.4,
      size: (5 + r() * 5) * (mobile ? 0.8 : 1),
      spin: -540 + r() * 1080,
      shape: Math.floor(r() * 3),
    };
  });
  return g;
}

const geoCache = new Map<string, Geo>();
function geo(W: number, H: number) {
  const key = `${W}x${H}`;
  let g = geoCache.get(key);
  if (!g) {
    g = makeGeo(W, H);
    geoCache.set(key, g);
  }
  return g;
}

const LEAF =
  "M12 1 L13.6 5.6 L16.4 4.2 L15.6 9 L20 7.4 L18.6 10.6 L23 12 L18.8 14.2 L19.8 16.6 L14.6 15.8 L13 20 L12.6 16.6 L12.6 23 L11.4 23 L11.4 16.6 L11 20 L9.4 15.8 L4.2 16.6 L5.2 14.2 L1 12 L5.4 10.6 L4 7.4 L8.4 9 L7.6 4.2 L10.4 5.6 Z";
const LEAVES = [
  { x: 0.12, y: 0.18, s: 18, vx: 16, vy: 9, sw: 14, r: 20, vr: 9, ph: 0.3, blur: 0, o: 0.9 },
  { x: 0.78, y: 0.12, s: 12, vx: 11, vy: 7, sw: 10, r: -40, vr: -6, ph: 1.7, blur: 1.2, o: 0.55 },
  { x: 0.86, y: 0.66, s: 22, vx: 13, vy: 10, sw: 16, r: 65, vr: 12, ph: 2.6, blur: 0, o: 0.85 },
  { x: 0.22, y: 0.76, s: 10, vx: 9, vy: 6, sw: 8, r: 110, vr: -8, ph: 4.1, blur: 1.6, o: 0.45 },
  { x: 0.56, y: 0.88, s: 14, vx: 14, vy: 5, sw: 12, r: -15, vr: 7, ph: 5.2, blur: 0.8, o: 0.7 },
];
const NOISE =
  'url("data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
  ) +
  '")';
const fill: CSSProperties = { position: "absolute", inset: 0 };

/*
 * Red maple leaves drifting, swaying and spinning, in CSS only (kl-* rules in
 * intro-loader.css), so they stay smooth however busy the main thread is. The
 * loader's leaves drift once; `loop` sends them round again, fading at each
 * end, for backdrops that stay on screen.
 */
export function DriftingLeaves({ loop = false }: { loop?: boolean }) {
  return (
    <div className={loop ? "kl-leaves kl-leaves--loop" : "kl-leaves"} style={fill}>
      {LEAVES.map((l, i) => (
        <span
          key={i}
          className="kl-leaf"
          style={
            {
              left: `${l.x * 100}%`,
              top: `${l.y * 100}%`,
              "--vx": l.vx,
              "--vy": l.vy,
              "--delay": `${-i * 6}s`,
            } as CSSProperties
          }
        >
          <span
            className="kl-sway"
            style={{ opacity: l.o, "--sw": `${l.sw}px`, animationDelay: `${-l.ph / 0.9}s` } as CSSProperties}
          >
            <svg
              className="kl-spin"
              viewBox="0 0 24 24"
              style={
                {
                  "--size": `${l.s}px`,
                  "--r0": `${l.r}deg`,
                  "--vr": l.vr,
                  filter: l.blur ? `blur(${l.blur}px)` : undefined,
                } as CSSProperties
              }
            >
              <path d={LEAF} fill={RED} />
            </svg>
          </span>
        </span>
      ))}
    </div>
  );
}

/*
 * The loader card: name, label and bar on black, with drifting leaves. All of
 * its motion is CSS (see intro-loader.css), on transforms and opacity, so it
 * stays smooth while the page and the hero scene load on the main thread. It
 * renders once; the loader shows three copies (whole, and the two halves), all
 * mounted together so their animations stay in step.
 */
export function LoaderCard({ name }: { name: string }) {
  return (
    <div className="kl-card" style={fill}>
      <DriftingLeaves />
      <div className="kl-jp" style={{ fontFamily: SERIF_JP }}>
        ホクチェン
      </div>
      <div className="kl-center">
        <div className="kl-dim-name">
          <div className="kl-name" style={{ fontFamily: SANS }}>
            {name.toUpperCase()}.
          </div>
        </div>
        <div className="kl-dim-meta">
          <div className="kl-label" style={{ fontFamily: MONO }}>
            PORTFOLIO LOADING
          </div>
          <div className="kl-track">
            <div className="kl-fill" />
          </div>
        </div>
      </div>
      <div className="kl-grain" style={{ backgroundImage: NOISE }} />
    </div>
  );
}

type Pose = { x: number; y: number; th: number; cd: number };

// Sword pose at time T: pivot (grip centre) position, angle, and contact
// distance along the cut.
function pose(T: number, C: Cues, g: Geo): Pose {
  const { W, H, L, ux, uy, Rc, c0, c1, Hr } = g;
  const swingAt = (e: number): Pose => {
    const cd = lerp(-c0, L + c1, e);
    const th = lerp(TH_W, TH_E, e);
    const d = dirOf(th);
    return { x: W + ux * cd - d[0] * Rc, y: uy * cd - d[1] * Rc, th, cd };
  };
  if (T < C.Windup) {
    // Fly in from the right, tip first, settling into a raised guard.
    const p = split(T, C.FlyIn, C.Windup);
    const pr = split(T, C.FlyIn + 0.06, C.Windup);
    return { x: lerp(W + g.Rt + 60, Hr.x, p), y: lerp(Hr.y + 0.1 * H, Hr.y, p), th: lerp(-180, TH_R, pr), cd: -c0 };
  }
  if (T < C.Strike) {
    // Wind-up: draw back up and to the right; the tip leaves frame at the corner.
    const Pw = swingAt(0);
    const p = settle(T, C.Windup, C.Strike);
    return { x: lerp(Hr.x, Pw.x, p), y: lerp(Hr.y, Pw.y, p), th: lerp(TH_R, TH_W, p), cd: -c0 };
  }
  if (T < C.Cut) return swingAt(strike(T, C.Strike, C.Cut));
  // Exit: keep the swing's end velocity and spin out.
  const dur = C.Cut - C.Strike;
  const q = T - C.Cut;
  const cd = L + c1 + ((SLOPE * (L + c0 + c1)) / dur) * q;
  const th = TH_E + ((SLOPE * (TH_E - TH_W)) / dur) * q;
  const d = dirOf(th);
  return { x: W + ux * cd - d[0] * Rc, y: uy * cd - d[1] * Rc, th, cd };
}

function Sword({ Q, k, opacity, id }: { Q: Pose; k: number; opacity: number; id: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: Q.x,
        top: Q.y,
        width: 0,
        height: 0,
        opacity,
        transformOrigin: "0 0",
        transform: `rotate(${Q.th}deg) scale(${k}, ${-k})`,
      }}
    >
      <svg
        width="1200"
        height="80"
        viewBox="0 0 1200 80"
        style={{ position: "absolute", left: -175, top: -40, overflow: "visible" }}
        dangerouslySetInnerHTML={{ __html: katanaMarkup(id) }}
      />
    </div>
  );
}

const FRAG_SHAPES = [
  "polygon(0 20%, 60% 0, 100% 45%, 70% 100%, 15% 80%)",
  "polygon(10% 0, 100% 30%, 55% 100%, 0 60%)",
  "polygon(0 0, 100% 15%, 80% 70%, 35% 100%, 20% 50%)",
];

export function KatanaScene({
  T,
  W,
  H,
  reduced,
  card,
}: {
  T: number;
  W: number;
  H: number;
  reduced: boolean;
  card: ReactNode;
}) {
  const C = CUES;
  const g = geo(W, H);
  const { L, ux, uy, nx, ny, ang, k, ps } = g;
  const strikeDur = C.Cut - C.Strike;
  const P = pose(T, C, g);
  // The cut line follows the contact point.
  const s = T >= C.Cut ? L : P.cd;
  const jolt = T >= C.Cut ? (1 - settle(T, C.Cut, C.Cut + 0.09)) * (g.mobile ? 1.8 : 2.5) : 0;
  const sp = split(T, C.Split, C.Done);
  const d = sp * g.split;
  const rot = sp * 2.5;
  const fade = reduced ? 1 - settle(T, C.Ready + 0.15, C.Ready + 0.55) : 1;
  const showFull = reduced ? fade > 0 : T < C.Split;
  const showHalves = !reduced && T >= C.Split && sp < 1;
  const showSword = !reduced && T >= C.FlyIn && T <= C.Cut + 0.3;
  const moving = T < C.Windup || T >= C.Strike;

  // Ghost copies a few milliseconds behind read as motion blur.
  const ghosts =
    showSword && moving
      ? [0.024, 0.012]
          .filter((dt) => T - dt >= C.FlyIn)
          .map((dt, i) => <Sword key={dt} Q={pose(T - dt, C, g)} k={k} opacity={i ? 0.3 : 0.14} id={`kg${i}`} />)
      : [];

  // Swoosh: the arc swept by the blade over the last ~100ms of the swing.
  let swoosh = null;
  if (showSword && T >= C.Strike && T <= C.Cut + 0.15) {
    const pts: { o: number[]; n: number[] }[] = [];
    for (let i = 0; i <= 9; i++) {
      const Q = pose(Math.max(C.Strike, T - i * 0.011), C, g);
      const dir = dirOf(Q.th);
      pts.push({ o: [Q.x + dir[0] * g.Rt, Q.y + dir[1] * g.Rt], n: [Q.x + dir[0] * g.Ri, Q.y + dir[1] * g.Ri] });
    }
    swoosh = (
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: 1 - settle(T, C.Cut, C.Cut + 0.15) }}>
        {pts.slice(0, -1).map((a, i) => {
          const b = pts[i + 1];
          return <path key={i} d={`M${a.o} L${b.o} L${b.n} L${a.n} Z`} fill="#fff" opacity={0.2 * (1 - i / 9)} />;
        })}
        <path d={"M" + pts.map((p) => p.o.join(",")).join(" L")} fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
        <path
          d={"M" + pts.slice(0, 5).map((p) => p.o.join(",")).join(" L")}
          fill="none"
          stroke={RED}
          strokeWidth="1"
          opacity="0.9"
          transform="translate(0 2)"
        />
      </svg>
    );
  }

  const lineOp = !reduced && T >= C.Strike ? 1 - settle(T, C.Split, C.Split + 0.16) : 0;
  const glow = T < C.Split ? 1 : 0.6;
  const edgeOp = 1 - settle(T, C.Split, C.Split + 0.5);
  const half = (sx: number, clip: string) => (
    <div style={{ ...fill, transformOrigin: "50% 50%", transform: `translate(${sx * d * nx}px, ${sx * d * ny}px) rotate(${sx * rot}deg)` }}>
      <div style={{ ...fill, clipPath: clip }}>{card}</div>
      <div
        style={{
          position: "absolute",
          left: W,
          top: 0,
          width: L,
          height: 1,
          background: "rgba(255,255,255,0.6)",
          transformOrigin: "0 0",
          transform: `rotate(${ang}deg)`,
          opacity: edgeOp,
        }}
      />
    </div>
  );

  const debris = [];
  if (!reduced) {
    for (const [i, p] of g.sparks.entries()) {
      const a = T - (C.Strike + p.at * strikeDur);
      if (a < 0 || a > p.life) continue;
      const ox = W + ux * p.frac * L;
      const oy = uy * p.frac * L;
      const vx = nx * p.side * p.vp + ux * p.va;
      const vy = ny * p.side * p.vp + uy * p.va;
      const G = 900 * ps;
      const w = p.len * (1 - 0.4 * (a / p.life));
      debris.push(
        <div
          key={`s${i}`}
          style={{
            position: "absolute",
            left: ox + vx * a - w,
            top: oy + vy * a + 0.5 * G * a * a,
            width: w,
            height: 1.4,
            transformOrigin: "100% 50%",
            transform: `rotate(${(Math.atan2(vy + G * a, vx) * 180) / Math.PI}deg)`,
            opacity: 1 - Math.pow(a / p.life, 1.5),
            background: p.red
              ? `linear-gradient(90deg, rgba(255,255,255,0), #fff 68%, ${RED} 68%)`
              : "linear-gradient(90deg, rgba(255,255,255,0), #fff)",
          }}
        />,
      );
    }
    for (const [i, p] of g.frags.entries()) {
      const a = T - (C.Strike + p.at * strikeDur);
      if (a < 0 || a > p.life) continue;
      const ox = W + ux * p.frac * L;
      const oy = uy * p.frac * L;
      const vx = nx * p.side * p.vp + ux * p.va;
      const vy = ny * p.side * p.vp + uy * p.va;
      const dr = a * (1 - 0.3 * a);
      debris.push(
        <div
          key={`f${i}`}
          style={{
            position: "absolute",
            left: ox + vx * dr,
            top: oy + vy * dr + 130 * ps * a * a,
            width: p.size,
            height: p.size * 0.8,
            background: RED,
            clipPath: FRAG_SHAPES[p.shape],
            transform: `rotate(${p.spin * a}deg)`,
            opacity: 1 - Math.pow(a / p.life, 2),
          }}
        />,
      );
    }
  }

  // No backdrop of its own: the site shows through as the halves part.
  return (
    <div style={{ position: "relative", width: W, height: H, overflow: "hidden" }}>
      <div style={{ ...fill, opacity: fade, transform: `translate(${jolt * nx}px, ${jolt * ny}px)` }}>
        <div style={{ ...fill, visibility: showFull ? "visible" : "hidden" }}>{card}</div>
        <div style={{ ...fill, visibility: showHalves ? "visible" : "hidden" }}>
          {half(-1, "polygon(0 0, 100% 0, 0 100%)")}
          {half(1, "polygon(100% 0, 100% 100%, 0 100%)")}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: W,
          top: 0,
          width: Math.max(0, Math.min(s, L)),
          height: 1.5,
          marginTop: -0.75,
          background: "#fff",
          transformOrigin: "0 50%",
          transform: `rotate(${ang}deg)`,
          opacity: lineOp,
          boxShadow: `0 0 ${6 * glow}px rgba(255,255,255,0.95), 0 0 ${22 * glow}px rgba(255,255,255,0.35)`,
        }}
      />
      {debris}
      {swoosh}
      {ghosts}
      {showSword && <Sword Q={P} k={k} opacity={1} id="km" />}
    </div>
  );
}
