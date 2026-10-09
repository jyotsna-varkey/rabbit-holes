import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url).pathname;
const DIR = `${ROOT}holes/snapshots/pages`;
const pages = readdirSync(DIR).filter((f) => f.endsWith('.html'));

// SPEC: no live calls to Wikipedia at runtime; all content ships in /holes.
describe.each(pages)('%s', (file) => {
  const html = readFileSync(`${DIR}/${file}`, 'utf8');

  it('loads nothing from another site (src, srcset, poster, CSS url)', () => {
    const remote = [
      ...html.matchAll(/\s(?:src|srcset|poster)="([^"]*)"/g),
      ...html.matchAll(/url\(([^)]*)\)/g),
    ]
      .map((m) => m[1])
      .filter((v) => /(^|[\s,])(https?:)?\/\//.test(v));
    expect(remote).toEqual([]);
  });

  it('names every bundled image after its file, with an image extension', () => {
    const bad = [...html.matchAll(/data-asset="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((p) => !/\/\d{3}-[^/?&=]+\.(jpe?g|png|gif|svg|webp)$/i.test(p));
    expect(bad).toEqual([]);
  });

  it('ships every image it shows', () => {
    const missing = [...html.matchAll(/data-asset="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((p) => !existsSync(`${ROOT}holes/${p}`));
    expect(missing).toEqual([]);
  });
});
