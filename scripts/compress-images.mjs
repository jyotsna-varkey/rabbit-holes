// Recompresses images already in holes/snapshots/images to WebP and updates
// every reference to them (page snapshots, manifest, hole files). Safe to run
// again: files that are already WebP or SVG are skipped.
//
//   node scripts/compress-images.mjs

import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compressImage, LEAD_MAX_WIDTH } from './images.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HOLES = `${ROOT}holes`;
const IMAGES = `${HOLES}/snapshots/images`;

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const path = `${dir}/${name}`;
    if ((await stat(path)).isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

const renamed = new Map(); // "snapshots/images/…/a.jpg" → "snapshots/images/…/a.webp"
let before = 0;
let after = 0;
for (const path of await walk(IMAGES)) {
  const ext = path.split('.').pop();
  if (/^(webp|svg)$/i.test(ext) || path.endsWith('.DS_Store')) continue;
  const bytes = await readFile(path);
  const lead = !path.includes('/images/pages/');
  const out = await compressImage(bytes, ext, lead ? { maxWidth: LEAD_MAX_WIDTH } : {});
  const next = path.replace(/\.[^.]+$/, `.${out.ext}`);
  await writeFile(next, out.bytes);
  if (next !== path) await rm(path);
  before += bytes.length;
  after += out.bytes.length;
  renamed.set(path.slice(HOLES.length + 1), next.slice(HOLES.length + 1));
}
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
console.log(`${renamed.size} images recompressed: ${mb(before)} → ${mb(after)}`);

if (renamed.size) {
  const swap = (text) => {
    for (const [from, to] of renamed) text = text.split(from).join(to);
    return text;
  };
  const pages = `${HOLES}/snapshots/pages`;
  for (const name of await readdir(pages)) {
    const path = `${pages}/${name}`;
    const text = await readFile(path, 'utf8');
    const next = swap(text);
    if (next !== text) await writeFile(path, next);
  }
  for (const path of [`${HOLES}/snapshots/manifest.json`, ...(await readdir(HOLES)).filter((f) => f.endsWith('.json')).map((f) => `${HOLES}/${f}`)]) {
    const text = await readFile(path, 'utf8');
    const next = swap(text);
    if (next !== text) await writeFile(path, next);
  }
  console.log('references updated in snapshots, manifest and hole files');
}
