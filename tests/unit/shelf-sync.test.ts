import { describe, expect, it } from 'vitest';
import { mergeShelves } from '../../src/lib/shelfSync';

// PLAN step 28: joining a device's shelf with the one saved to the reader's account.
describe('mergeShelves', () => {
  it('keeps every hole from both, once', () => {
    const merged = mergeShelves(
      [{ id: 'a', kept: '2026-10-09' }, { id: 'b', kept: '2026-10-08' }],
      [{ id: 'b', kept: '2026-10-01' }, { id: 'c', kept: '2026-10-05' }],
    );
    expect(merged.map((e) => e.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('keeps the earliest date a hole was kept', () => {
    const merged = mergeShelves([{ id: 'b', kept: '2026-10-08' }], [{ id: 'b', kept: '2026-10-01' }]);
    expect(merged).toEqual([{ id: 'b', kept: '2026-10-01' }]);
  });

  it('lists the most recently kept first, like the shelf does', () => {
    const merged = mergeShelves([{ id: 'old', kept: '2026-09-01' }], [{ id: 'new', kept: '2026-10-09' }]);
    expect(merged.map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('ignores anything that is not a shelf entry', () => {
    const merged = mergeShelves([{ id: 'a', kept: '2026-10-09' }], [{ nope: true }, 'x', { id: 3 }] as unknown[]);
    expect(merged).toEqual([{ id: 'a', kept: '2026-10-09' }]);
  });
});
