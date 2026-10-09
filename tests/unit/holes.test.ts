import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS helper shared with the fetch script
import { keyOf, knotProblems, snapshotBody } from '../../scripts/knots.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const files = readdirSync(`${ROOT}holes`).filter((f) => f.endsWith('.json'));
const holes = files.map((f) => ({ file: f, hole: JSON.parse(readFileSync(`${ROOT}holes/${f}`, 'utf8')) }));
const manifest = JSON.parse(readFileSync(`${ROOT}holes/snapshots/manifest.json`, 'utf8')).pages;

const HOLE_KEYS = ['caveats', 'claim', 'end', 'id', 'knots', 'payoff', 'start'];
const ENDPOINT_KEYS = ['description', 'image', 'page', 'title'];
const KNOT_KEYS = ['hatnote', 'nextPage', 'onwardLinkText', 'page', 'passage', 'revision', 'section', 'url'];

it('has hole files in /holes', () => {
  expect(files.length).toBeGreaterThanOrEqual(4);
});

describe.each(holes)('$file', ({ file, hole }) => {
  it('follows the schema', () => {
    expect(Object.keys(hole).sort()).toEqual(HOLE_KEYS);
    expect(Object.keys(hole.start).sort()).toEqual(ENDPOINT_KEYS);
    expect(Object.keys(hole.end).sort()).toEqual(ENDPOINT_KEYS);
    for (const k of hole.knots) expect(Object.keys(k).sort()).toEqual(KNOT_KEYS);
    expect(file).toBe(`${hole.id}.json`);
    expect(Array.isArray(hole.caveats)).toBe(true);
  });

  it('has a claim, payoff, and a non-empty passage and hatnote on every knot', () => {
    expect(hole.claim.trim()).not.toBe('');
    expect(hole.payoff.trim()).not.toBe('');
    expect(hole.knots.length).toBeGreaterThan(0);
    for (const k of hole.knots) {
      expect(k.passage.trim()).not.toBe('');
      expect(k.hatnote.trim()).not.toBe('');
    }
  });

  it('chains knots: each nextPage is the next knot\'s page, and the last leads to the end card', () => {
    hole.knots.forEach((k: { nextPage: string }, i: number) => {
      const expected = i + 1 < hole.knots.length ? hole.knots[i + 1].page : hole.end.page;
      expect(k.nextPage).toBe(expected);
    });
  });

  it('pins every knot to the snapshot revision and URL', () => {
    for (const k of hole.knots) {
      const page = manifest[keyOf(k.page)];
      expect(page, k.page).toBeDefined();
      expect(page.snapshot).toBe(true);
      expect(k.revision).toBe(page.revision);
      expect(k.url).toBe(page.url);
    }
  });

  it('has endpoint pages and images that ship with the app', () => {
    for (const e of [hole.start, hole.end]) {
      expect(manifest[keyOf(e.page)], e.page).toBeDefined();
      if (e.image) expect(existsSync(`${ROOT}holes/${e.image}`), e.image).toBe(true);
    }
  });

  it('quotes every passage word for word, in the stated section, with its onward link inside', async () => {
    for (const [i, k] of hole.knots.entries()) {
      const body = await snapshotBody(ROOT, k.page);
      expect(knotProblems(body, k), `knot ${i + 1} (${k.page})`).toEqual([]);
    }
  });

  // Rules from PLAN step 1 that the current hole library does not meet; waiting on an
  // owner decision (see PLAN.md Known issues) rather than being weakened.
  it.todo('touches at least 3 distinct Wikipedia pages');
  it.todo('has onwardLinkText on every knot except the last');
});
