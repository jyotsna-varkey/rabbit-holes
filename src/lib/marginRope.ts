// The thread in the margin (PLAN step 43), after the owner's "D2 spine"
// exploration: a Verlet rope pinned between two beads, a little longer than
// the gap so it hangs loose, thinner and tighter as the beads are pulled
// apart. Every point is held inside the margin band, so however the rope
// swings it never crosses the text.

import type { Pt } from './rope';

export type Band = { min: number; max: number };

const N = 22;

export class MarginRope {
  private pts: { x: number; y: number; px: number; py: number }[] | null = null;
  /** 0 when slack; grows as the rope is stretched past its length. */
  tension = 0;

  reset() {
    this.pts = null;
  }

  /**
   * Advance by dt seconds between A and B with `rest` px of rope, and return
   * the SVG path. `t` (seconds) and `phase` keep a faint breath of air moving.
   */
  step(A: Pt, B: Pt, rest: number, t: number, phase: number, dt: number, band: Band): string {
    // (A loose end uses fewer points; going back to a full rope starts afresh.)
    if (!this.pts || this.pts.length !== N) {
      this.pts = Array.from({ length: N }, (_, i) => {
        const u = i / (N - 1);
        const x = A.x + (B.x - A.x) * u, y = A.y + (B.y - A.y) * u;
        return { x, y, px: x, py: y };
      });
    }
    const p = this.pts, seg = rest / (N - 1), k = dt * 60;
    for (let i = 1; i < N - 1; i++) {
      const q = p[i];
      const vx = (q.x - q.px) * 0.93, vy = (q.y - q.py) * 0.93;
      q.px = q.x;
      q.py = q.y;
      // Gravity down, a breath of air, and slack bowing towards the screen edge (away from the text).
      q.x += vx + (-0.05 + Math.sin(t * 1.4 + i * 0.45 + phase) * 0.03) * k;
      q.y += vy + 0.1 * k;
    }
    p[0].x = p[0].px = A.x; p[0].y = p[0].py = A.y;
    p[N - 1].x = p[N - 1].px = B.x; p[N - 1].y = p[N - 1].py = B.y;
    for (let it = 0; it < 10; it++) {
      for (let i = 0; i < N - 1; i++) {
        const a = p[i], b = p[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
        // String, not a rod: it resists stretching only.
        if (d <= seg) continue;
        const fa = i === 0 ? 0 : 1, fb = i + 1 === N - 1 ? 0 : 1, sum = fa + fb;
        if (!sum) continue;
        const c = (d - seg) / d;
        a.x += (dx * c * fa) / sum; a.y += (dy * c * fa) / sum;
        b.x -= (dx * c * fb) / sum; b.y -= (dy * c * fb) / sum;
      }
      for (let i = 1; i < N - 1; i++) p[i].x = Math.max(band.min, Math.min(band.max, p[i].x));
    }
    const stretch = Math.max(0, Math.min(1.5, Math.hypot(B.x - A.x, B.y - A.y) / rest - 1));
    this.tension += (stretch - this.tension) * 0.3;
    return smooth(p);
  }

  /** A loose end hanging `len` px from A (after the last passage there is no bead). */
  hang(A: Pt, len: number, t: number, dt: number, band: Band): string {
    const n = 10;
    if (!this.pts || this.pts.length !== n) {
      this.pts = Array.from({ length: n }, (_, i) => ({ x: A.x, y: A.y + (i * len) / (n - 1), px: A.x, py: A.y + (i * len) / (n - 1) }));
    }
    const p = this.pts, seg = len / (n - 1), k = dt * 60;
    for (let i = 1; i < n; i++) {
      const q = p[i];
      const vx = (q.x - q.px) * 0.92, vy = (q.y - q.py) * 0.92;
      q.px = q.x;
      q.py = q.y;
      q.x += vx + Math.sin(t * 1.3 + i) * 0.04 * k;
      q.y += vy + 0.12 * k;
    }
    p[0].x = p[0].px = A.x; p[0].y = p[0].py = A.y;
    for (let it = 0; it < 8; it++) {
      for (let i = 0; i < n - 1; i++) {
        const a = p[i], b = p[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
        if (d <= seg) continue;
        const c = (d - seg) / d;
        if (i === 0) { b.x -= dx * c; b.y -= dy * c; }
        else { a.x += (dx * c) / 2; a.y += (dy * c) / 2; b.x -= (dx * c) / 2; b.y -= (dy * c) / 2; }
      }
      for (let i = 1; i < n; i++) p[i].x = Math.max(band.min, Math.min(band.max, p[i].x));
    }
    this.tension = 0;
    return smooth(p);
  }

  /** The rope's points, for tests. */
  points(): Pt[] {
    return (this.pts ?? []).map(({ x, y }) => ({ x, y }));
  }
}

function smooth(p: { x: number; y: number }[]) {
  let s = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i].x + p[i + 1].x) / 2, my = (p[i].y + p[i + 1].y) / 2;
    s += `Q${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const l = p[p.length - 1];
  return `${s}L${l.x.toFixed(1)} ${l.y.toFixed(1)}`;
}
