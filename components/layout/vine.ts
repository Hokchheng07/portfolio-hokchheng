/*
 * The vine wrapped around the navbar. One stem is drawn twice: outside the bar,
 * and again in front of it, clipped to the gaps between the logo, links and
 * buttons, where it crosses over without touching any text. Where a gap is too
 * narrow, as on the smallest phones, the stem passes behind the bar instead.
 *
 * The stem is a filled ribbon rebuilt each animation frame, so its growing tip
 * always tapers. Leaves and blossoms are added as the tip passes them, and
 * navbar.css plays their sprouting stages. Everything is measured from the bar
 * and scales with its width, so it refits on resize. Anything already grown stays
 * grown through a refit, so resizing never replays the sprouting.
 */

const GROW_MS = 5000;
const MAX_STEP_MS = 250;
const SAMPLE_PX = 4;
const TIP_TAPER_PX = 70;
// The bar's rounded-[2.75rem] corners.
const BAR_RADIUS = 44;
// The width where the bar reaches max-w-7xl, and how far things shrink on a phone.
const FULL_WIDTH = 1280;
const MIN_SCALE = 0.62;
// Clear of the logo and links on either side of a front crossing.
const GAP_MARGIN = 8;
const CROSSING_HALF_MAX = 34;
const CROSSING_HALF_MIN = 10;
// With the links collapsed the middle is empty, so it can hold a second crossing.
const WIDE_GAP = 420;
const LEAF_GAP_PX = 40;
const BLOOM_CLEARANCE_PX = 42;
// A blossom's radius at scale 1, and the gap kept to the top of the screen.
const BLOOM_RADIUS = 8;
const SCREEN_MARGIN = 2;

const SVG_NS = "http://www.w3.org/2000/svg";
const LEAF = "M0 0C2.6-4.4 8.4-5 13 0 8.6 3.6 3 3.4 0 0Z";

type Point = { x: number; y: number };
type Sample = Point & { s: number; nx: number; ny: number };
type Crossing = { x: number; half: number; front: boolean };
type Bud = { at: number; el: SVGGElement };

export type VineParts = {
  back: SVGSVGElement;
  front: SVGSVGElement;
  nav: HTMLElement;
  bar: HTMLElement;
  name: HTMLElement;
  links: HTMLElement;
  actions: HTMLElement;
};

const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Repeatable scatter, so the vine looks the same on every visit.
const scatter = (i: number) => {
  const value = Math.sin(i * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

function findCrossings(parts: VineParts, width: number): Crossing[] {
  const left = parts.bar.getBoundingClientRect().left;
  // The actions box fills its grid column, so measure the first button in it instead.
  const firstAction = parts.actions.firstElementChild ?? parts.actions;
  const boxes = [parts.name, parts.links, firstAction]
    .map((el) => el.getBoundingClientRect())
    .filter((box) => box.width > 0)
    .map((box) => ({ from: box.left - left, to: box.right - left }));

  const crossings: Crossing[] = [];
  for (let i = 1; i < boxes.length; i++) {
    const from = boxes[i - 1].to;
    const gap = boxes[i].from - from;
    const room = gap / 2 - GAP_MARGIN;
    const half = clamp(room, CROSSING_HALF_MIN, CROSSING_HALF_MAX);
    if (gap > WIDE_GAP) {
      crossings.push({ x: from + gap * 0.3, half, front: true }, { x: from + gap * 0.74, half, front: true });
    } else {
      crossings.push({ x: from + gap / 2, half, front: room >= CROSSING_HALF_MIN });
    }
  }
  // Nothing measured yet: still draw something sensible, behind the bar.
  return crossings.length ? crossings : [{ x: width * 0.6, half: CROSSING_HALF_MAX, front: false }];
}

// Each turn: under the bar, up across the front, over the top, down behind it.
function findAnchors(crossings: Crossing[], W: number, H: number, rise: number, drop: number): Point[] {
  const anchors: Point[] = [
    { x: H * 0.55, y: H * 0.55 },
    { x: H * 0.08, y: H * 0.92 },
  ];
  let from = H * 0.3;
  crossings.forEach(({ x, half }, i) => {
    const next = crossings[i + 1];
    const until = next ? (x + half + next.x - next.half) / 2 : W - H * 0.2;
    anchors.push(
      { x: (from + x - half) / 2, y: H + drop },
      { x: x - half, y: H + 1 },
      { x: x + half, y: -1 },
      { x: (x + half + until) / 2, y: -rise },
    );
    if (next) anchors.push({ x: until, y: H / 2 });
    from = until;
  });
  anchors.push({ x: W - H * 0.06, y: H * 0.14 }, { x: W - H * 0.5, y: H * 0.5 });
  return anchors;
}

// Smooth curve through the anchors. Handles scale with each segment's length, so
// short steep crossings and long lazy arcs sit side by side without overshooting.
function sampleCurve(anchors: Point[]): Sample[] {
  const heading = (i: number) => {
    const a = anchors[Math.max(0, i - 1)];
    const b = anchors[Math.min(anchors.length - 1, i + 1)];
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
  };

  const points: Point[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [p, q] = [anchors[i], anchors[i + 1]];
    const span = Math.hypot(q.x - p.x, q.y - p.y);
    const [u, v] = [heading(i), heading(i + 1)];
    const steps = Math.max(2, Math.ceil(span / SAMPLE_PX));
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      const [t2, t3] = [t * t, t * t * t];
      const [a, b, c, d] = [2 * t3 - 3 * t2 + 1, (t3 - 2 * t2 + t) * span * 0.75, -2 * t3 + 3 * t2, (t3 - t2) * span * 0.75];
      points.push({ x: a * p.x + b * u.x + c * q.x + d * v.x, y: a * p.y + b * u.y + c * q.y + d * v.y });
    }
  }
  points.push(anchors[anchors.length - 1]);

  let s = 0;
  return points.map((point, i) => {
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 1)];
    if (i > 0) s += Math.hypot(point.x - before.x, point.y - before.y);
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    return { ...point, s, nx: -(after.y - before.y) / length, ny: (after.x - before.x) / length };
  });
}

function makeLeaf(sample: Sample, side: number, scale: number) {
  const angle = (Math.atan2(-sample.nx, sample.ny) * 180) / Math.PI + side * 58;
  const place = svg("g", { transform: `translate(${sample.x.toFixed(1)} ${sample.y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${scale.toFixed(2)})` });
  const bud = svg("g", { class: "vine-sprout-leaf", style: `--side:${side}` });
  bud.append(svg("path", { d: LEAF, class: "vine-leaf" }));
  place.append(bud);
  return { place, bud };
}

// Stalk, closed bud, five petals, then the heart: navbar.css plays them in order.
function makeBlossom(base: Point, tip: Point, scale: number, stalkWidth: number) {
  const place = svg("g", { transform: `translate(${base.x.toFixed(1)} ${base.y.toFixed(1)})` });
  const bud = svg("g", { class: "vine-sprout" });
  const [dx, dy] = [tip.x - base.x, tip.y - base.y];
  bud.append(
    svg("path", {
      d: `M0 0Q${(dx * 0.15).toFixed(1)} ${(dy * 0.8).toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}`,
      pathLength: 1,
      class: "vine-stalk",
      "stroke-width": stalkWidth.toFixed(2),
    }),
  );
  const head = svg("g", { transform: `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${scale.toFixed(2)})` });
  head.append(svg("path", { d: "M0-5.4C3-3.2 3.2 2 0 3-3.2 2-3 -3.2 0-5.4Z", class: "vine-closed" }));
  for (let petal = 0; petal < 5; petal++) {
    const turn = svg("g", { transform: `rotate(${petal * 72})` });
    turn.append(svg("ellipse", { cy: -4.1, rx: 3.1, ry: 3.7, class: "vine-petal", style: `--i:${petal}` }));
    head.append(turn);
  }
  head.append(svg("circle", { r: 1.5, class: "vine-heart" }));
  bud.append(head);
  place.append(bud);
  return { place, bud };
}

export function bindVine(parts: VineParts) {
  const { back, front, nav, bar } = parts;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clipId = "nav-vine-front";
  const outsideId = "nav-vine-outside";
  const artId = "nav-vine-art";

  const art = svg("g", { id: artId });
  const leaves = svg("g");
  const tendril = svg("path", { class: "vine-tendril" });
  const stem = svg("path", { class: "vine-stem" });
  const blooms = svg("g");
  const tip = svg("circle", { r: 4.5, class: "vine-tip" });
  art.append(leaves, tendril, stem, blooms, tip);

  // Behind the nav the stem is cut away, or its backdrop blur would smear it into a
  // red wash across the links. This follows the nav as the mobile menu opens.
  const outsideShape = svg("path", { "clip-rule": "evenodd" });
  const outside = svg("clipPath", { id: outsideId });
  outside.append(outsideShape);
  const backDefs = svg("defs");
  backDefs.append(outside);
  const backLayer = svg("g", { "clip-path": `url(#${outsideId})` });
  backLayer.append(art);
  back.append(backDefs, backLayer);

  const clip = svg("clipPath", { id: clipId });
  const defs = svg("defs");
  defs.append(clip);
  const copy = svg("use", { href: `#${artId}`, "clip-path": `url(#${clipId})` });
  front.append(defs, copy);

  let samples: Sample[] = [];
  let buds: Bud[] = [];
  let nextBud = 0;
  let length = 0;
  let scale = 1;
  let fitted = "";
  let progress = 0;
  let started = false;
  let frame = 0;
  let last = 0;

  function clipToNav() {
    const W = nav.offsetWidth;
    const H = nav.offsetHeight;
    const r = Math.min(BAR_RADIUS, H / 2);
    // With the menu open, the crossings would end abruptly at its top edge.
    front.toggleAttribute("data-hidden", H > bar.offsetHeight + 2);
    outsideShape.setAttribute(
      "d",
      `M-200-200H${W + 200}V${H + 200}H-200Z` +
        `M${r} 0H${W - r}A${r} ${r} 0 0 1 ${W} ${r}V${H - r}A${r} ${r} 0 0 1 ${W - r} ${H}H${r}A${r} ${r} 0 0 1 0 ${H - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`,
    );
  }

  function build() {
    const W = bar.offsetWidth;
    const H = bar.offsetHeight;
    if (!W || !H) return;
    const crossings = findCrossings(parts, W);
    const screen = window.innerHeight;
    const key = JSON.stringify([W, H, screen, crossings, started && progress === 1]);
    if (key === fitted) return;
    fitted = key;

    scale = clamp(W / FULL_WIDTH, MIN_SCALE, 1);
    // Room above the bar sets how high an arc can go. Short screens get shallower
    // arcs below it, so a phone on its side keeps its content.
    const topRoom = bar.getBoundingClientRect().top;
    const rise = Math.min(H * 0.22, topRoom - 4);
    const drop = Math.min(H * (0.34 + 0.26 * scale), screen * 0.07);
    samples = sampleCurve(findAnchors(crossings, W, H, rise, drop));
    length = samples[samples.length - 1].s;

    tendril.setAttribute("stroke-width", Math.max(0.9, 1.5 * scale).toFixed(2));
    clip.replaceChildren(
      ...crossings
        .filter((crossing) => crossing.front)
        .map(({ x, half }) => svg("rect", { x: x - half - 2, y: -200, width: half * 2 + 4, height: H + 203 })),
    );

    leaves.replaceChildren();
    blooms.replaceChildren();
    buds = [];

    // Keeps a blossom's head on screen at the top, wherever its stalk starts.
    const addBlossom = (base: Sample, size: number, forward: number) => {
      const away = base.y < 0 ? -1 : 1;
      const head = size * BLOOM_RADIUS;
      const y = base.y + away * 9 * scale;
      const tipPoint = { x: base.x + forward * 12 * scale, y: Math.max(y, head + SCREEN_MARGIN - topRoom) };
      const { place, bud } = makeBlossom(base, tipPoint, size, Math.max(1.1, 1.8 * scale));
      blooms.append(place);
      buds.push({ at: base.s, el: bud });
    };

    // A full blossom at the far point of each arc.
    const peaks: number[] = [];
    for (let i = 1; i < samples.length - 1; i++) {
      const [a, b, c] = [samples[i - 1], samples[i], samples[i + 1]];
      const peak = b.y < -3 && b.y <= a.y && b.y < c.y;
      const trough = b.y > H + 3 && b.y >= a.y && b.y > c.y;
      if (!peak && !trough) continue;
      peaks.push(b.s);
      addBlossom(b, Math.max(1.4, 2 * scale), 1);
    }

    // Along the arcs, leaves, with a small blossom in every third place.
    const gap = Math.max(26, LEAF_GAP_PX * scale);
    let next = 30;
    let index = 0;
    for (const sample of samples) {
      if (sample.s < next || (sample.y >= -3 && sample.y <= H + 3)) continue;
      const size = scatter(index);
      next = sample.s + gap * (0.75 + size * 0.5);
      index++;
      const clear = peaks.every((s) => Math.abs(s - sample.s) > BLOOM_CLEARANCE_PX * scale);
      if (index % 3 === 0 && clear) {
        addBlossom(sample, Math.max(0.9, 1.2 * scale), index % 2 ? 1 : -1);
      } else {
        const { place, bud } = makeLeaf(sample, index % 2 ? 1 : -1, (1.15 + size * 0.8) * scale);
        leaves.append(place);
        buds.push({ at: sample.s, el: bud });
      }
    }

    // What the tip has already passed stays grown: no replay on resize.
    buds.sort((a, b) => a.at - b.at);
    const head = progress * length;
    nextBud = 0;
    while (nextBud < buds.length && buds[nextBud].at <= head) {
      buds[nextBud].el.setAttribute("data-grown", "");
      nextBud++;
    }
    clipToNav();
    draw();
  }

  function draw() {
    if (!samples.length) return;
    const head = progress * length;
    const left: string[] = [];
    const right: string[] = [];
    const curl: string[] = [];
    let end: Point = samples[0];

    for (const { x, y, s, nx, ny } of samples) {
      if (s > head) break;
      end = { x, y };
      // Thick at the root, fine at the far end, brushy along the way.
      const brush = 1 + 0.2 * Math.sin(s * 0.043) + 0.1 * Math.sin(s * 0.127);
      const taper = Math.min(1, (head - s) / TIP_TAPER_PX + 0.04) * Math.min(1, s / 36 + 0.15);
      const half = ((7 - (3.5 * s) / length) * brush * taper * scale) / 2;
      left.push(`${(x + nx * half).toFixed(1)} ${(y + ny * half).toFixed(1)}`);
      right.push(`${(x - nx * half).toFixed(1)} ${(y - ny * half).toFixed(1)}`);
      if (s > 50 && s < head - 16) {
        const twist = Math.sin(s / 17) * 6 * scale;
        curl.push(`${(x + nx * twist).toFixed(1)} ${(y + ny * twist).toFixed(1)}`);
      }
    }

    stem.setAttribute("d", left.length ? `M${left.join("L")}L${right.reverse().join("L")}Z` : "");
    tendril.setAttribute("d", curl.length ? `M${curl.join("L")}` : "");
    tip.setAttribute("cx", end.x.toFixed(1));
    tip.setAttribute("cy", end.y.toFixed(1));
    tip.setAttribute("r", (4.5 * scale).toFixed(1));
    tip.style.display = progress < 1 && head > 0 ? "" : "none";
    while (nextBud < buds.length && buds[nextBud].at <= head) {
      buds[nextBud].el.setAttribute("data-open", "");
      nextBud++;
    }
  }

  function tick(now: number) {
    // Capped per frame, so a hidden tab picks up where it paused instead of jumping.
    progress = Math.min(1, progress + Math.min(MAX_STEP_MS, now - last) / GROW_MS);
    last = now;
    draw();
    frame = progress < 1 ? requestAnimationFrame(tick) : 0;
  }

  function start() {
    if (started) return;
    started = true;
    if (reduced) {
      progress = 1;
      build();
      return;
    }
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  build();
  const observer = new ResizeObserver(() => {
    clipToNav();
    build();
  });
  observer.observe(bar);
  observer.observe(nav);
  window.addEventListener("resize", build);
  // The logo changes width when its web font arrives, which moves the crossings.
  document.fonts?.ready.then(() => {
    if (art.isConnected) build();
  });

  return {
    start,
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", build);
      backDefs.remove();
      backLayer.remove();
      defs.remove();
      copy.remove();
    },
  };
}
