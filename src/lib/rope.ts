// Verlet rope: the thread's only physics. Ends are pinned; everything between
// hangs under gravity, so a rope a little longer than the gap between its ends sags.

export type Pt = { x: number; y: number };

const ITERATIONS = 18;

export class Rope {
  readonly n: number;
  private x: Float64Array;
  private y: Float64Array;
  private px: Float64Array;
  private py: Float64Array;

  constructor(n: number, a: Pt, b: Pt) {
    this.n = n;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.px = new Float64Array(n);
    this.py = new Float64Array(n);
    this.reset(a, b);
  }

  /** First and last points, i.e. where the ends were pinned last step. */
  ends(): [Pt, Pt] {
    const n = this.n;
    return [{ x: this.x[0], y: this.y[0] }, { x: this.x[n - 1], y: this.y[n - 1] }];
  }

  /** Lay the rope straight between a and b, at rest. */
  reset(a: Pt, b: Pt) {
    for (let i = 0; i < this.n; i++) {
      const t = i / (this.n - 1);
      this.x[i] = this.px[i] = a.x + (b.x - a.x) * t;
      this.y[i] = this.py[i] = a.y + (b.y - a.y) * t;
    }
  }

  /**
   * Advance one fixed step. `slack` is how much longer than the gap the rope is
   * (1 = taut). `gx, gy` is gravity in px/s², so a tilted card can swing it.
   */
  step(a: Pt, b: Pt, slack: number, dt: number, gx = 0, gy = 2200) {
    const { n, x, y, px, py } = this;
    const damping = 0.965;
    for (let i = 1; i < n - 1; i++) {
      const vx = (x[i] - px[i]) * damping;
      const vy = (y[i] - py[i]) * damping;
      px[i] = x[i];
      py[i] = y[i];
      x[i] += vx + gx * dt * dt;
      y[i] += vy + gy * dt * dt;
    }
    x[0] = px[0] = a.x;
    y[0] = py[0] = a.y;
    x[n - 1] = px[n - 1] = b.x;
    y[n - 1] = py[n - 1] = b.y;

    const gap = Math.hypot(b.x - a.x, b.y - a.y);
    // A minimum of extra length keeps a visible sag on short spans.
    const length = Math.max(gap * slack, gap + (slack > 1.005 ? 10 : 0));
    const seg = length / (n - 1);

    for (let it = 0; it < ITERATIONS; it++) {
      for (let i = 0; i < n - 1; i++) {
        const dx = x[i + 1] - x[i];
        const dy = y[i + 1] - y[i];
        const d = Math.hypot(dx, dy) || 0.0001;
        // String, not a rod: it resists stretching but is free to go slack.
        if (d <= seg) continue;
        const diff = (d - seg) / d;
        if (i === 0) {
          x[i + 1] -= dx * diff;
          y[i + 1] -= dy * diff;
        } else if (i + 1 === n - 1) {
          x[i] += dx * diff;
          y[i] += dy * diff;
        } else {
          x[i] += dx * diff * 0.5;
          y[i] += dy * diff * 0.5;
          x[i + 1] -= dx * diff * 0.5;
          y[i + 1] -= dy * diff * 0.5;
        }
      }
    }
  }

  /**
   * Advance one step with only the first end pinned: a loose end of `length` px
   * hanging from `a` and swinging as `a` moves.
   */
  stepHanging(a: Pt, length: number, dt: number, gx = 0, gy = 2200) {
    const { n, x, y, px, py } = this;
    const damping = 0.965;
    for (let i = 1; i < n; i++) {
      const vx = (x[i] - px[i]) * damping;
      const vy = (y[i] - py[i]) * damping;
      px[i] = x[i];
      py[i] = y[i];
      x[i] += vx + gx * dt * dt;
      y[i] += vy + gy * dt * dt;
    }
    x[0] = px[0] = a.x;
    y[0] = py[0] = a.y;
    const seg = length / (n - 1);
    for (let it = 0; it < ITERATIONS; it++) {
      for (let i = 0; i < n - 1; i++) {
        const dx = x[i + 1] - x[i];
        const dy = y[i + 1] - y[i];
        const d = Math.hypot(dx, dy) || 0.0001;
        if (d <= seg) continue;
        const diff = (d - seg) / d;
        if (i === 0) {
          x[i + 1] -= dx * diff;
          y[i + 1] -= dy * diff;
        } else {
          x[i] += dx * diff * 0.5;
          y[i] += dy * diff * 0.5;
          x[i + 1] -= dx * diff * 0.5;
          y[i + 1] -= dy * diff * 0.5;
        }
      }
    }
  }

  /** Smooth SVG path through the rope's points. */
  path() {
    const { n, x, y } = this;
    let d = `M${x[0].toFixed(1)} ${y[0].toFixed(1)}`;
    for (let i = 1; i < n - 1; i++) {
      const mx = (x[i] + x[i + 1]) / 2;
      const my = (y[i] + y[i + 1]) / 2;
      d += `Q${x[i].toFixed(1)} ${y[i].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    d += `L${x[n - 1].toFixed(1)} ${y[n - 1].toFixed(1)}`;
    return d;
  }
}
