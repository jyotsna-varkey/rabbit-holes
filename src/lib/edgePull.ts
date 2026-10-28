// Pulling past the edge of a scroller that scrolls normally (the ending: past
// its top goes back). Once the scroll reaches the edge, scrolling on in the
// same direction pulls, in the same gesture: no wall to hit (PLAN step 42).

export type PullKind = 'touch' | 'wheel';

export type EdgePullOptions = {
  /** 'bottom': pull by scrolling on past the end. 'top': past the start. */
  edge: 'bottom' | 'top';
  /** Whether a pull may start now. */
  enabled(): boolean;
  /**
   * How far past the edge (px of finger or wheel travel, ≥ 0). Return true once
   * the pull has done its job: the rest of that gesture is then swallowed.
   */
  onMove(dist: number, kind: PullKind): boolean | void;
  /** The gesture ended without onMove returning true. */
  onEnd(dist: number, kind: PullKind): void;
};

/**
 * Wheel events further apart than this start a new gesture, and a pull ends
 * after this long without one. The two must match: a notched mouse wheel (or a
 * busy machine) can space events 200 ms apart within one scroll.
 */
const WHEEL_GAP = 260;

export function edgePull(el: HTMLElement, o: EdgePullOptions): () => void {
  const dir = o.edge === 'bottom' ? 1 : -1;
  const atEdge = () =>
    o.edge === 'bottom' ? el.scrollTop >= el.scrollHeight - el.clientHeight - 1 : el.scrollTop <= 1;

  let t: { y: number; pulling: boolean; done: boolean; dist: number } | null = null;
  const onTouchStart = (e: TouchEvent) => {
    t = e.touches.length === 1 ? { y: e.touches[0].clientY, pulling: false, done: false, dist: 0 } : null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!t) return;
    const y = e.touches[0].clientY;
    const dy = dir * (t.y - y);
    t.y = y;
    if (t.done) {
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (!t.pulling) {
      if (dy > 0 && o.enabled() && atEdge()) t.pulling = true;
      else return;
    }
    if (e.cancelable) e.preventDefault();
    t.dist = Math.max(0, t.dist + dy);
    if (o.onMove(t.dist, 'touch')) t.done = true;
  };
  const onTouchEnd = () => {
    if (t?.pulling && !t.done) o.onEnd(t.dist, 'touch');
    t = null;
  };

  let w = { last: 0, pulling: false, done: false, dist: 0 };
  let wheelTimer = 0;
  const onWheel = (e: WheelEvent) => {
    const now = performance.now();
    if (now - w.last > WHEEL_GAP) w = { last: now, pulling: false, done: false, dist: 0 };
    w.last = now;
    if (w.done) {
      e.preventDefault();
      return;
    }
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? el.clientHeight : 1;
    const dy = dir * e.deltaY * unit;
    if (!w.pulling) {
      if (dy > 0 && o.enabled() && atEdge()) w.pulling = true;
      else return;
    }
    e.preventDefault();
    w.dist = Math.max(0, w.dist + dy);
    if (o.onMove(w.dist, 'wheel')) w.done = true;
    clearTimeout(wheelTimer);
    const g = w;
    wheelTimer = window.setTimeout(() => {
      if (g.pulling && !g.done) o.onEnd(g.dist, 'wheel');
      g.pulling = false;
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
