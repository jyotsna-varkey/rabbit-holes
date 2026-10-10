import { describe, expect, it } from 'vitest';
import { shuffle, stackOrder } from '../../src/lib/order';

// A repeatable "random" for tests: a simple linear congruential generator.
const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const IDS = Array.from({ length: 24 }, (_, i) => `hole-${i}`);

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    expect([...shuffle(IDS, seeded(1))].sort()).toEqual([...IDS].sort());
  });
  it('gives different orders for different visits', () => {
    expect(shuffle(IDS, seeded(1))).not.toEqual(shuffle(IDS, seeded(2)));
  });
});

describe('stackOrder (PLAN step 24)', () => {
  it('puts holes the reader has not opened before the ones they have', () => {
    const opened = new Set(['hole-0', 'hole-1', 'hole-2']);
    const order = stackOrder(IDS, opened, null, seeded(7));
    expect(order).toHaveLength(IDS.length);
    expect(order.slice(-3).sort()).toEqual(['hole-0', 'hole-1', 'hole-2']);
    expect(order.slice(0, -3).some((id) => opened.has(id))).toBe(false);
  });
  it('is not the same fixed order every visit', () => {
    const first = new Set(Array.from({ length: 20 }, (_, i) => stackOrder(IDS, new Set(), null, seeded(i + 1))[0]));
    expect(first.size).toBeGreaterThan(5);
  });
  it('puts a linked hole (?hole=) first', () => {
    expect(stackOrder(IDS, new Set(), 'hole-9', seeded(3))[0]).toBe('hole-9');
    expect(stackOrder(IDS, new Set(['hole-9']), 'hole-9', seeded(3))[0]).toBe('hole-9');
  });
  it('ignores a linked hole that does not exist', () => {
    expect(stackOrder(IDS, new Set(), 'nope', seeded(3))).toHaveLength(IDS.length);
  });
});
