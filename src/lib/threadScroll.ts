// On the thread, every gesture on the page pulls the thread (PLAN steps 42 and
// 44): a finger or mouse dragged up or down, a quick flick, a held press, or
// the wheel/trackpad. The article itself doesn't scroll here, except that a
// passage taller than the screen scrolls first; whatever is left over is the
// pull. HoleView turns the pull into the thread's tension, the page's lift and
// the move to the next or previous page.

export type PullKind = 'touch' | 'wheel';

export type ThreadScrollOptions = {
  /** Whether the page is on the thread and can be pulled now. */
  enabled(): boolean;
  /** The scrollTop range that shows the passage (lo = resting, hi = its end). */
  range(): { lo: number; hi: number } | null;
  /**
   * The pull so far in px of finger or wheel travel: > 0 towards the next page,
   * < 0 towards the previous one. Return true once it has moved a page: the
   * rest of that gesture is then ignored.
   */
  onPull(pull: number, kind: PullKind): boolean | void;
  /** A drag or scroll ended without moving a page; `velocity` in px/ms (> 0 towards next). */
  onRelease(pull: number, kind: PullKind, velocity: number): void;
  /** A press held still: the thread starts reeling in by itself. */
  onHold?(): void;
  /** The held press ended (if the reel hasn't finished). */
  onHoldEnd?(): void;
};

/**
 * Wheel events further apart than this start a new gesture, and a pull ends
 * after this long without one. A notched mouse wheel (or a busy machine) can
 * space events 200 ms apart within one scroll.
 */
const WHEEL_GAP = 260;
/** Movement (px) that turns a press into a drag. */
const SLOP = 7;
/** How long a still press waits before it starts reeling. */
const HOLD_MS = 300;

// The click that ends a drag or a hold isn't a tap, on whichever page is under
// the finger by then (after a reel the next page has slid in beneath it).
let swallowClicksUntil = 0;
const swallowNextClick = () => { swallowClicksUntil = performance.now() + 400; };
if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    if (performance.now() < swallowClicksUntil) {
      swallowClicksUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

export function threadScroll(el: HTMLElement, o: ThreadScrollOptions): () => void {
  /** One gesture: `v` is where the page would be (scrollTop plus any pull). */
  type Gesture = { v: number; pull: number; done: boolean };

  // Move the gesture's virtual position by d: scroll the passage within its
  // range, and whatever is left over is the pull.
  const move = (g: Gesture, d: number, kind: PullKind) => {
    if (g.done) return;
    const r = o.range();
    if (!r) return;
    g.v += d;
    const top = Math.max(r.lo, Math.min(r.hi, g.v));
    if (Math.abs(el.scrollTop - top) > 0.5) el.scrollTop = top;
    g.pull = g.v - top;
    if (o.onPull(g.pull, kind)) g.done = true;
  };
  const begin = (): Gesture => ({ v: el.scrollTop, pull: 0, done: false });

  // Pointer: finger, mouse or pen. A press that moves is a drag; one held
  // still reels; a quick one is left to the page's click (tap the passage).
  type Press = Gesture & {
    id: number; x0: number; y0: number; y: number; t: number; vy: number;
    dragging: boolean; holding: boolean; timer: number;
  };
  let press: Press | null = null;
  const onDown = (e: PointerEvent) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || !o.enabled()) return;
    // Presses on links still drag and hold (a quick tap on one is left to the click).
    if ((e.target as Element).closest?.('button')) return;
    press = {
      ...begin(), id: e.pointerId, x0: e.clientX, y0: e.clientY, y: e.clientY, t: performance.now(), vy: 0,
      dragging: false, holding: false, timer: 0,
    };
    const p = press;
    p.timer = window.setTimeout(() => {
      if (press === p && !p.dragging && o.onHold) {
        p.holding = true;
        o.onHold();
      }
    }, HOLD_MS);
  };
  const onMove = (e: PointerEvent) => {
    const p = press;
    if (!p || e.pointerId !== p.id || p.holding) return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < SLOP) return;
      p.dragging = true;
      clearTimeout(p.timer);
      try { el.setPointerCapture(e.pointerId); } catch { /* fine without it */ }
    }
    e.preventDefault();
    const now = performance.now();
    p.vy = (p.y - e.clientY) / Math.max(1, now - p.t); // px/ms, > 0 = finger moving up = towards next
    p.t = now;
    move(p, p.y - e.clientY, 'touch');
    p.y = e.clientY;
  };
  const onUp = (e: PointerEvent) => {
    const p = press;
    if (!p || e.pointerId !== p.id) return;
    press = null;
    clearTimeout(p.timer);
    if (p.holding) { o.onHoldEnd?.(); swallowNextClick(); return; }
    if (!p.dragging) return; // a tap: the page's click handles it
    swallowNextClick();
    if (!p.done) o.onRelease(p.pull, 'touch', performance.now() - p.t < 80 ? p.vy : 0);
  };

  let w: (Gesture & { last: number }) | null = null;
  let wheelTimer = 0;
  const onWheel = (e: WheelEvent) => {
    const now = performance.now();
    if (!w || now - w.last > WHEEL_GAP) {
      if (!o.enabled()) {
        w = null;
        return;
      }
      w = { ...begin(), last: now };
    }
    w.last = now;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? el.clientHeight : 1;
    move(w, e.deltaY * unit, 'wheel');
    clearTimeout(wheelTimer);
    const g = w;
    wheelTimer = window.setTimeout(() => {
      if (!g.done) o.onRelease(g.pull, 'wheel', 0);
      if (w === g) w = null;
    }, WHEEL_GAP);
  };

  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    clearTimeout(wheelTimer);
    if (press) clearTimeout(press.timer);
    el.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    el.removeEventListener('wheel', onWheel);
  };
}
