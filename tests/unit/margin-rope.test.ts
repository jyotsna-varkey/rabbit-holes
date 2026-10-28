import { describe, expect, it } from 'vitest';
import { MarginRope } from '../../src/lib/marginRope';

// PLAN step 43: the thread lives in the margin and never crosses the text.
const band = { min: 5, max: 39 };
const run = (r: MarginRope, A: { x: number; y: number }, B: { x: number; y: number }, rest: number, frames = 240) => {
  for (let f = 0; f < frames; f++) r.step(A, B, rest, f / 60, 0, 1 / 60, band);
};

describe('MarginRope', () => {
  it('keeps every point inside the margin, however slack', () => {
    const r = new MarginRope();
    const A = { x: 25, y: 80 }, B = { x: 19, y: 700 };
    run(r, A, B, 620 * 1.3);
    for (const p of r.points()) {
      expect(p.x).toBeGreaterThanOrEqual(band.min);
      expect(p.x).toBeLessThanOrEqual(band.max);
    }
  });
  it('hangs loose at rest and goes taut when its beads are pulled apart', () => {
    const r = new MarginRope();
    const A = { x: 22, y: 100 }, B = { x: 22, y: 600 };
    run(r, A, B, 500 * 1.035);
    expect(r.tension).toBeLessThan(0.01);
    run(r, A, { x: 22, y: 640 }, 500 * 1.035, 30);
    expect(r.tension).toBeGreaterThan(0.02);
  });
  it('a loose end hangs down from its bead', () => {
    const r = new MarginRope();
    const A = { x: 22, y: 300 };
    for (let f = 0; f < 300; f++) r.hang(A, 46, f / 60, 1 / 60, band);
    const pts = r.points();
    expect(pts[pts.length - 1].y - A.y).toBeGreaterThan(38);
  });
  it('switches between a loose end and a full rope (last page and back)', () => {
    const r = new MarginRope();
    const A = { x: 22, y: 300 };
    for (let f = 0; f < 30; f++) r.hang(A, 46, f / 60, 1 / 60, band);
    expect(() => run(r, A, { x: 22, y: 700 }, 420, 30)).not.toThrow();
    expect(r.points()).toHaveLength(22);
  });
});
