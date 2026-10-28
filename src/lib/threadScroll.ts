// On the thread, scrolling moves between pages (PLAN step 42). Every scroll
// gesture on the page — wheel, trackpad or finger, starting anywhere — first
// moves within the passage if it's taller than the screen, and the rest pulls
// the thread: down past the passage towards the next page, up past it towards
// the previous one. The article itself never scrolls here, so there is no wall
// to hit and no way to slide off the thread by accident.

export type PullKind = 'touch' | 'wheel';

export type ThreadScrollOptions = {
  /** Whether the page is on the thread and can be pulled now. */
  enabled(): boolean;
  /** The scrollTop range that shows the passage (lo = resting, hi = its end). */
  range(): { lo: number; hi: number } | null;
  /**
   * The pull so far: > 0 towards the next page, < 0 towards the previous one
   * (px of finger or wheel travel). Return true once it has moved a page: the
   * rest of that gesture is then ignored.
   */
  onPull(pull: number, kind: PullKind): boolean | void;
  /** The gesture ended without moving a page (pull may be 0). */
  onRelease(pull: number, kind: PullKind): void;
};

/**
 * Wheel events further apart than this start a new gesture, and a pull ends
 * after this long without one. A notched mouse wheel (or a busy machine) can
 * space events 200 ms apart within one scroll.
 */
const WHEEL_GAP = 260;

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

  let t: (Gesture & { y: number }) | null = null;
  const onTouchStart = (e: TouchEvent) => {
    t = e.touches.length === 1 && o.enabled() ? { ...begin(), y: e.touches[0].clientY } : null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!t) return;
    if (e.cancelable) e.preventDefault();
    const y = e.touches[0].clientY;
    move(t, t.y - y, 'touch');
    t.y = y;
  };
  const onTouchEnd = () => {
    if (t && !t.done) o.onRelease(t.pull, 'touch');
    t = null;
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
      if (!g.done) o.onRelease(g.pull, 'wheel');
      if (w === g) w = null;
    }, WHEEL_GAP);
  };

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd);
  el.addEventListener('touchcancel', onTouchEnd);
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    clearTimeout(wheelTimer);
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', onTouchEnd);
    el.removeEventListener('wheel', onWheel);
  };
}
