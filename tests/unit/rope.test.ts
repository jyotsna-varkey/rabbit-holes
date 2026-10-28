import { describe, expect, it } from 'vitest';
import { Rope } from '../../src/lib/rope';

const settle = (rope: Rope, a: { x: number; y: number }, b: { x: number; y: number }, slack: number) => {
  for (let i = 0; i < 600; i++) rope.step(a, b, slack, 1 / 120);
};

// Lowest point of the rope (largest y).
const midSag = (rope: Rope) => {
  const path = rope.path().match(/-?\d+(\.\d+)?/g)!.map(Number);
  const pts = [];
  for (let i = 0; i < path.length; i += 2) pts.push({ x: path[i], y: path[i + 1] });
  return Math.max(...pts.map((p) => p.y));
};

describe('Rope', () => {
  it('sags below its ends when it has slack', () => {
    const a = { x: 0, y: 100 };
    const b = { x: 300, y: 100 };
    const rope = new Rope(18, a, b);
    settle(rope, a, b, 1.05);
    expect(midSag(rope)).toBeGreaterThan(130);
  });

  it('sags much less when taut than when slack', () => {
    const a = { x: 0, y: 100 };
    const b = { x: 300, y: 100 };
    const taut = new Rope(18, a, b);
    const slack = new Rope(18, a, b);
    settle(taut, a, b, 1.0);
    settle(slack, a, b, 1.05);
    expect(midSag(taut) - 100).toBeLessThan((midSag(slack) - 100) / 2);
  });

  it('lies straight after reset', () => {
    const rope = new Rope(10, { x: 0, y: 0 }, { x: 90, y: 90 });
    rope.reset({ x: 0, y: 50 }, { x: 90, y: 50 });
    expect(midSag(rope)).toBe(50);
  });

  it('keeps its ends pinned', () => {
    const a = { x: 10, y: 20 };
    const b = { x: 200, y: 260 };
    const rope = new Rope(12, { x: 0, y: 0 }, { x: 1, y: 1 });
    settle(rope, a, b, 1.04);
    expect(rope.ends()).toEqual([a, b]);
  });
});

// PLAN step 41: when the reader leaves the thread to read the article, it hangs
// loose from the onward link.
describe('Rope.stepHanging', () => {
  it('hangs straight down from its pinned end, at its own length', () => {
    const a = { x: 100, y: 50 };
    const rope = new Rope(12, a, { x: 200, y: 50 });
    for (let i = 0; i < 1200; i++) rope.stepHanging(a, 150, 1 / 120);
    const [top, end] = rope.ends();
    expect(top).toEqual(a);
    expect(Math.abs(end.x - a.x)).toBeLessThan(3);
    expect(end.y - a.y).toBeGreaterThan(140);
    expect(end.y - a.y).toBeLessThan(152);
  });
});
