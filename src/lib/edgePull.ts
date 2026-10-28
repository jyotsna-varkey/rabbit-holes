// Scrolling is the pull (PLAN step 41). A scroller's edge becomes the thread:
// a fresh swipe or wheel scroll that starts at the edge and keeps going past it
// pulls, like pull-to-refresh. A scroll already under way (a flick's momentum)
// stops at the edge and never pulls, so reading can't advance by accident.

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

  let t: { y0: number; armed: boolean; pulling: boolean; done: boolean; dist: number } | null = null;
  const onTouchStart = (e: TouchEvent) => {
    t = e.touches.length === 1
      ? { y0: e.touches[0].clientY, armed: o.enabled() && atEdge(), pulling: false, done: false, dist: 0 }
      : null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!t || !t.armed) return;
    if (t.done) {
      if (e.cancelable) e.preventDefault();
      return;
    }
    const dy = dir * (t.y0 - e.touches[0].clientY);
    if (!t.pulling) {
      if (dy > 0) t.pulling = true;
      else if (dy < -4) t.armed = false; // scrolling back into the page: ordinary reading
      if (!t.pulling) return;
    }
    if (e.cancelable) e.preventDefault();
    t.dist = Math.max(0, dy);
    if (o.onMove(t.dist, 'touch')) t.done = true;
  };
  const onTouchEnd = () => {
    if (t?.pulling && !t.done) o.onEnd(t.dist, 'touch');
    t = null;
  };

  let w = { last: 0, armed: false, pulling: false, done: false, dist: 0 };
  let wheelTimer = 0;
  const onWheel = (e: WheelEvent) => {
    const now = performance.now();
    if (now - w.last > WHEEL_GAP) w = { last: now, armed: o.enabled() && atEdge(), pulling: false, done: false, dist: 0 };
    w.last = now;
    if (!w.armed) return;
    if (w.done) {
      e.preventDefault();
      return;
    }
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? el.clientHeight : 1;
    const dy = dir * e.deltaY * unit;
    if (!w.pulling) {
      if (dy > 0) w.pulling = true;
      else {
        w.armed = false;
        return;
      }
    }
    e.preventDefault();
    w.dist = Math.max(0, w.dist + dy);
    if (o.onMove(w.dist, 'wheel')) w.done = true;
    clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => {
      if (w.pulling && !w.done) o.onEnd(w.dist, 'wheel');
      w.pulling = false;
      w.armed = false;
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
