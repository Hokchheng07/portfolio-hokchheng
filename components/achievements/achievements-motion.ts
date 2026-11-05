/*
 * Behaviour for the achievements gallery. Pinned: window scroll drives the
 * track, which chases its target each animation frame, so wheel steps read as
 * one movement. A hold at each frame rests the photo at centre while scrolling
 * continues; a half frame glides to the nearest photo once scrolling stops.
 * Swipe: native horizontal scroll with snap. In both, a frame's description
 * follows its distance from centre, so it shows without having to stop, and its
 * seal stamps once per visit on arrival. With neither media query (reduced
 * motion, no support) nothing binds and the CSS list layout shows everything.
 */

// Keep in step with the media queries in achievements.css.
const MOTION = "(prefers-reduced-motion: no-preference) and (scripting: enabled)";
const PINNED = `(min-width: 1024px) and (min-height: 620px) and ${MOTION}`;
const SWIPE = `((max-width: 1023.98px) or (max-height: 619.98px)) and ${MOTION}`;

const STANDARD = "cubic-bezier(0.22, 1, 0.36, 1)";
const SETTLE_IDLE_MS = 150;
const PRESS_MS = 170;
const INK_MS = 260;
const IMPACT_MS = 240;
// Scroll per frame in viewport heights. Keep in step with achievements.css.
const STEP = 1.25;
// How quickly the track catches its target. Larger trails further behind.
const CHASE_MS = 90;
// Share of each frame's scroll spent holding, on either side of the frame.
const HOLD = 0.2;
// Distance from centre, in frames, where the description starts and ends fading.
const BODY_FULL = 0.04;
const BODY_GONE = 0.25;
const ARRIVED = 0.02;

type Frame = {
  card: HTMLElement;
  photo: HTMLElement;
  seal: HTMLElement | null;
  ink: HTMLElement | null;
  body: HTMLElement;
  node: HTMLElement;
  fill: HTMLElement;
  // Far off screen and already painted as such, so its styles can be skipped.
  resting: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Clip for a thread fill showing this share of its width. The vertical overflow
// keeps the stroke on the crests and troughs. Matches achievements.css.
const revealed = (share: number) => `inset(-8px ${((1 - share) * 100).toFixed(3)}% -8px 0)`;

// Same curve as STANDARD, for the settle that steps window scroll by hand.
function easeStandard(t: number) {
  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1];
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  let u = t;
  for (let i = 0; i < 8; i++) {
    const error = ((ax * u + bx) * u + cx) * u - t;
    const slope = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(error) < 1e-5 || Math.abs(slope) < 1e-6) break;
    u -= error / slope;
  }
  return ((ay * u + by) * u + cy) * u;
}

// Scroll progress to track position: flat around each whole frame, eased between.
function holdPosition(scrolled: number) {
  const frame = Math.floor(scrolled);
  const t = clamp((scrolled - frame - HOLD) / (1 - 2 * HOLD), 0, 1);
  return frame + t * t * (3 - 2 * t);
}

export function bindGallery(root: HTMLElement) {
  const frames: Frame[] = [...root.querySelectorAll<HTMLElement>("[data-frame]")].map((el) => ({
    card: el.querySelector<HTMLElement>("[data-card]")!,
    photo: el.querySelector<HTMLElement>("[data-photo]")!,
    seal: el.querySelector<HTMLElement>("[data-seal]"),
    ink: el.querySelector<HTMLElement>("[data-ink]"),
    body: el.querySelector<HTMLElement>("[data-body]")!,
    node: el.querySelector<HTMLElement>("[data-node]")!,
    fill: el.querySelector<HTMLElement>("[data-frame-fill]")!,
    resting: false,
  }));
  const stamped = new Set<number>();

  function stamp(index: number) {
    const { seal, ink, card } = frames[index];
    if (!seal || !ink || stamped.has(index)) return;
    stamped.add(index);
    seal.style.opacity = "1";
    seal.animate(
      [
        { transform: "scale(1.4) rotate(-8deg)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: PRESS_MS, easing: "cubic-bezier(0.55, 0, 0.9, 0.35)", fill: "backwards" },
    );
    ink.animate(
      [
        { transform: "scale(1)", opacity: 0.32 },
        { transform: "scale(1.22)", opacity: 0 },
      ],
      { duration: INK_MS, delay: PRESS_MS, easing: STANDARD },
    );
    // The photo takes the hit, not the seal.
    card.animate(
      [
        { transform: "scale(1)", easing: "cubic-bezier(0.3, 0, 1, 1)" },
        { transform: "scale(0.985)", offset: 0.18, easing: STANDARD },
        { transform: "scale(1)" },
      ],
      { duration: IMPACT_MS, delay: PRESS_MS },
    );
  }

  // Shared per-frame state: everything that follows distance from centre.
  function paintFrames(position: number, nodeSlack: number) {
    frames.forEach((frame, index) => {
      const { photo, body, node } = frame;
      const distance = Math.abs(index - position);
      node.toggleAttribute("data-on", position >= index - nodeSlack);
      if (distance > 1.5 && frame.resting) return;
      frame.resting = distance > 1.5;
      photo.style.transform = `scale(${(1 + 0.06 * Math.min(1, distance)).toFixed(4)})`;
      body.style.opacity = clamp(1 - (distance - BODY_FULL) / (BODY_GONE - BODY_FULL), 0, 1).toFixed(3);
    });
  }

  // Photos sit clipped and off to the side, where lazy loading would leave them
  // blank as they slide in. Load them all once the section is close.
  const loader = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      root.querySelectorAll("img").forEach((img) => {
        img.loading = "eager";
      });
      loader.disconnect();
    },
    { rootMargin: "150% 0px" },
  );
  loader.observe(root);

  const pinned = window.matchMedia(PINNED);
  const swipe = window.matchMedia(SWIPE);
  let unbind = () => {};

  function apply() {
    unbind();
    const undo = pinned.matches ? bindPinned() : swipe.matches ? bindSwipe() : () => {};
    frames.forEach(({ seal }, index) => {
      if (seal && stamped.has(index) && (pinned.matches || swipe.matches)) seal.style.opacity = "1";
    });
    unbind = () => {
      undo();
      // Hand everything back to the stylesheet for the next layout.
      frames.forEach((frame) => {
        const { photo, seal, body, node, fill } = frame;
        [photo, seal, body, fill].forEach((el) => el?.removeAttribute("style"));
        node.removeAttribute("data-on");
        frame.resting = false;
      });
    };
  }

  function bindPinned() {
    const stage = root.querySelector<HTMLElement>("[data-stage]")!;
    const track = root.querySelector<HTMLElement>("[data-track]")!;
    const fill = root.querySelector<HTMLElement>("[data-fill]")!;
    const last = frames.length - 1;
    let scrolled = 0;
    let position = 0;
    let shown = -1;
    let chase = 0;
    let chaseTime = 0;
    let lastY = window.scrollY;
    let direction = 0;
    let idle = 0;
    let glide = 0;
    let gliding = false;
    let target = 0;

    const top = () => root.getBoundingClientRect().top + window.scrollY;
    const step = () => window.innerHeight * STEP;

    function paint(now: number) {
      // Exponential, so it behaves the same at any refresh rate.
      shown += (position - shown) * (1 - Math.exp(-(now - chaseTime) / CHASE_MS));
      chaseTime = now;
      if (Math.abs(position - shown) < 0.0005) shown = position;

      const index = Math.round(shown);
      const arriving = Math.abs(shown - index) < ARRIVED && frames[index].seal && !stamped.has(index);
      // Read before writing, and only when a stamp is due, so no frame forces layout.
      const box = arriving ? frames[index].card.getBoundingClientRect() : null;

      const vw = window.innerWidth;
      track.style.transform = `translate3d(${(-shown * vw).toFixed(2)}px, 0, 0)`;
      // The fill's end stays on the centred frame's node as the track moves.
      fill.style.clipPath = revealed(shown / last);
      paintFrames(shown, ARRIVED);

      // Stamp once the arriving photo is fully on screen, so the first and last
      // frames wait for the section to scroll into view.
      if (box && box.top >= 0 && box.bottom <= window.innerHeight) stamp(index);
      chase = shown === position ? 0 : requestAnimationFrame(paint);
    }

    function update() {
      scrolled = clamp((window.scrollY - top()) / step(), 0, last);
      position = holdPosition(scrolled);
      if (chase) return;
      chaseTime = performance.now();
      chase = requestAnimationFrame(paint);
    }

    // Layout changed: re-measure and jump straight to the right place.
    function measure() {
      update();
      shown = position;
    }

    function cancelGlide() {
      if (!gliding) return;
      cancelAnimationFrame(glide);
      gliding = false;
    }

    function glideTo(index: number) {
      cancelGlide();
      const from = window.scrollY;
      const to = top() + index * step();
      const distance = Math.abs(to - from) / step();
      const duration = clamp(280 + 480 * distance, 320, 560);
      const start = performance.now();
      gliding = true;
      target = index;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        // Instant, or the page's smooth scroll-behavior would fight each step.
        window.scrollTo({ top: from + (to - from) * easeStandard(progress), behavior: "instant" });
        if (progress < 1) {
          glide = requestAnimationFrame(tick);
          return;
        }
        gliding = false;
        lastY = window.scrollY;
        update();
      };
      glide = requestAnimationFrame(tick);
    }

    function isPinned() {
      const y = window.scrollY;
      const start = top();
      return y >= start - 1 && y <= start + last * step() + 1;
    }

    function settle() {
      if (!isPinned()) return;
      const index = Math.round(scrolled);
      // Already resting on a photo.
      if (position === index) return;
      // Leaving past either end is always allowed.
      if (scrolled < 0.5 && direction < 0) return;
      if (scrolled > last - 0.5 && direction > 0) return;
      glideTo(index);
    }

    const onScroll = () => {
      const y = window.scrollY;
      if (!gliding && y !== lastY) direction = Math.sign(y - lastY);
      lastY = y;
      update();
      clearTimeout(idle);
      if (!gliding) idle = window.setTimeout(settle, SETTLE_IDLE_MS);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        cancelGlide();
        return;
      }
      if (!isPinned() || (event.target as Element).closest?.("input, textarea, [contenteditable]")) return;
      const current = gliding ? target : Math.round(scrolled);
      const next = clamp(current + (event.key === "ArrowRight" ? 1 : -1), 0, last);
      event.preventDefault();
      if (next !== current || Math.abs(scrolled - next) > HOLD) glideTo(next);
    };

    stage.tabIndex = 0;
    measure();
    idle = window.setTimeout(settle, SETTLE_IDLE_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("keydown", onKey);
    const interrupts = ["wheel", "touchstart", "pointerdown"] as const;
    interrupts.forEach((type) => window.addEventListener(type, cancelGlide, { passive: true }));

    return () => {
      cancelGlide();
      cancelAnimationFrame(chase);
      clearTimeout(idle);
      stage.removeAttribute("tabindex");
      track.removeAttribute("style");
      fill.removeAttribute("style");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("keydown", onKey);
      interrupts.forEach((type) => window.removeEventListener(type, cancelGlide));
    };
  }

  function bindSwipe() {
    const scroller = root.querySelector<HTMLElement>("[data-track]")!;
    const items = [...root.querySelectorAll<HTMLElement>("[data-frame]")];
    let visible = false;

    function update() {
      const position = scroller.scrollLeft / (items[1].offsetLeft - items[0].offsetLeft);
      frames.forEach(({ fill }, index) => {
        fill.style.clipPath = revealed(clamp(position - index + 0.5, 0, 1));
      });
      paintFrames(position, ARRIVED);
      const index = Math.round(position);
      if (visible && Math.abs(position - index) < ARRIVED) stamp(index);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.intersectionRatio >= 0.6;
        if (visible) update();
      },
      { threshold: [0, 0.6, 1] },
    );

    scroller.tabIndex = 0;
    update();
    observer.observe(scroller);
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      scroller.removeAttribute("tabindex");
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }

  apply();
  pinned.addEventListener("change", apply);
  swipe.addEventListener("change", apply);

  return () => {
    unbind();
    loader.disconnect();
    pinned.removeEventListener("change", apply);
    swipe.removeEventListener("change", apply);
  };
}
