import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { afterAll, expect, it } from 'vitest';
import { build } from 'vite';

// Size: the JavaScript a phone downloads before the first card shows (PLAN step 18).
const ROOT = new URL('../../', import.meta.url).pathname;
const out = mkdtempSync(`${tmpdir()}/rh-build-`);
afterAll(() => rmSync(out, { recursive: true, force: true }));

it('keeps the entry script under 250 KB gzipped, with no images inlined into it', async () => {
  await build({ root: ROOT, logLevel: 'silent', build: { outDir: out, emptyOutDir: true } });
  const entry = readdirSync(`${out}/assets`).find((f) => /^index-.*\.js$/.test(f))!;
  const js = readFileSync(`${out}/assets/${entry}`);
  expect(js.toString().match(/data:image\//g) ?? []).toEqual([]);
  expect(gzipSync(js).length / 1024).toBeLessThan(250);
}, 120_000);

it('ships the bundled images as files in the build', async () => {
  const images = readdirSync(`${out}/pages/Coffee`);
  expect(images.length).toBeGreaterThan(10);
});
