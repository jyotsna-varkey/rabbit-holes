// Pulls every article the holes touch from English Wikipedia, pinned to a
// revision, cleans it for reading, and checks that every quoted passage and
// onward link is really there.
//
//   node scripts/fetch-content.mjs           fetch latest revisions, write content
//   node scripts/fetch-content.mjs --pinned  re-fetch the revisions already in the manifest
//
// Output: public/content/articles/*.html, public/content/images/*,
//         src/content/manifest.json

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { textOf, normalize } from './text.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const UA = 'RabbitHolesPrototype/0.1 (educational prototype; Wikipedia reader)';
const API = 'https://en.wikipedia.org/api/rest_v1';
const PINNED = process.argv.includes('--pinned');

const holes = JSON.parse(await readFile(`${ROOT}src/content/holes.json`, 'utf8'));
const manifestPath = `${ROOT}src/content/manifest.json`;
const previous = existsSync(manifestPath)
  ? JSON.parse(await readFile(manifestPath, 'utf8'))
  : { articles: {} };

await mkdir(`${ROOT}public/content/articles`, { recursive: true });
await mkdir(`${ROOT}public/content/images`, { recursive: true });

export const keyOf = (title) => title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pathTitle = (title) => encodeURIComponent(title.replace(/ /g, '_'));

async function get(url, as = 'json') {
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 300));
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (res.ok) return as === 'json' ? res.json() : as === 'text' ? res.text() : Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`);
    const wait = Number(res.headers.get('retry-after')) || 2 * (attempt + 1);
    await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
  }
  throw new Error(`gave up on ${url}`);
}

const DROP_SECTIONS = /^(references|notes|further reading|external links|see also|bibliography|sources|citations|footnotes|notes and references|works cited)$/i;
const DROP_SELECTORS = [
  'script', 'style', 'link', 'meta', 'base',
  'sup.reference', 'sup.mw-ref', '.mw-editsection',
  '.navbox', '.navbox-styles', '.hatnote', '.shortdescription', '.ambox', '.ombox',
  '.sistersitebox', '.side-box', '.reflist', '.mw-references-wrap', 'ol.references',
  '.portalbox', '.portal', '[role="navigation"]', '.mw-empty-elt', '.noexcerpt',
  'audio', 'video', '.mw-authority-control', '.metadata.plainlinks',
];

function cleanArticle(html) {
  const { document } = parseHTML(html);
  const body = document.querySelector('body');

  for (const h2 of body.querySelectorAll('h2')) {
    if (DROP_SECTIONS.test(h2.textContent.trim())) {
      const section = h2.closest('section');
      (section ?? h2).remove();
    }
  }
  for (const sel of DROP_SELECTORS) for (const el of body.querySelectorAll(sel)) el.remove();

  // Inline [citation needed] style tags stay: they are part of what the reader should see.
  for (const a of body.querySelectorAll('a')) {
    const href = a.getAttribute('href') ?? '';
    if (href.startsWith('./')) {
      const target = decodeURIComponent(href.slice(2).split('#')[0]).replace(/_/g, ' ');
      a.setAttribute('data-target', target);
      a.setAttribute('href', `https://en.wikipedia.org/wiki/${href.slice(2)}`);
    } else if (href.startsWith('//')) {
      a.setAttribute('href', `https:${href}`);
    }
    if (a.getAttribute('href')?.startsWith('http')) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    }
  }
  for (const img of body.querySelectorAll('img')) {
    for (const attr of ['src', 'srcset']) {
      const v = img.getAttribute(attr);
      if (v) img.setAttribute(attr, v.replace(/(^|\s|,)\/\//g, '$1https://'));
    }
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  }
  for (const table of body.querySelectorAll('table')) {
    if (table.parentElement?.closest('table')) continue;
    const wrap = document.createElement('div');
    wrap.setAttribute('class', `table-wrap${table.classList.contains('infobox') ? ' is-infobox' : ''}`);
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  }
  // Parsoid carries a lot of round-trip metadata; none of it is needed to read.
  for (const el of body.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      const n = attr.name;
      if (n === 'data-mw' || n === 'data-parsoid' || n === 'about' || n === 'typeof' || n === 'property' ||
          (n === 'id' && /^mw/.test(attr.value)) || (n === 'rel' && el.tagName !== 'A') ||
          n === 'data-mw-section-id' || n === 'resource' || n === 'data-file-type' || n === 'data-file-width' ||
          n === 'data-file-height') {
        el.removeAttribute(n);
      }
    }
    if (el.tagName === 'A' && el.getAttribute('rel')?.startsWith('mw:')) el.removeAttribute('rel');
  }
  return body;
}

function checkKnot(body, knot) {
  const report = { passage: false, onward: knot.onward ? false : null, links: [] };
  const want = normalize(knot.passage);
  for (const block of body.querySelectorAll('p, li, blockquote, dd')) {
    const text = normalize(textOf(block));
    if (!text.includes(want)) continue;
    report.passage = true;
    for (const a of block.querySelectorAll('a[data-target]')) {
      report.links.push(`${a.textContent} → ${a.getAttribute('data-target')}`);
      if (knot.onward && a.getAttribute('data-target').toLowerCase() === knot.onward.toLowerCase()) report.onward = true;
    }
    break;
  }
  return report;
}

async function commonsCredit(imageUrl) {
  const m = imageUrl.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/) ??
            imageUrl.match(/\/en\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
  if (!m) return null;
  const file = decodeURIComponent(m[1]);
  const q = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent(`File:${file}`)}`;
  const data = await get(q);
  const page = Object.values(data.query.pages)[0];
  const meta = page?.imageinfo?.[0]?.extmetadata ?? {};
  const strip = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return {
    file,
    artist: strip(meta.Artist?.value) || 'Unknown author',
    license: strip(meta.LicenseShortName?.value) || 'See file page',
    licenseUrl: meta.LicenseUrl?.value ?? null,
    filePage: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`,
  };
}

const titles = new Set();
for (const hole of holes) {
  titles.add(hole.start.article);
  titles.add(hole.end.article);
  for (const k of hole.knots) titles.add(k.article);
}

const manifest = { fetched: new Date().toISOString().slice(0, 10), articles: {} };
const bodies = {};

for (const title of titles) {
  const key = keyOf(title);
  const summary = await get(`${API}/page/summary/${pathTitle(title)}`);
  const revision = PINNED && previous.articles[key] ? previous.articles[key].revision : summary.revision;
  const html = await get(`${API}/page/html/${pathTitle(summary.titles.canonical)}/${revision}`, 'text');
  const body = cleanArticle(html);
  bodies[key] = body;
  await writeFile(`${ROOT}public/content/articles/${key}.html`, body.innerHTML);

  let image = null;
  const thumb = summary.thumbnail?.source?.split('?')[0];
  if (thumb) {
    const src = thumb.replace(/\/(\d+)px-/, '/640px-');
    let bytes;
    try { bytes = await get(src, 'bytes'); } catch { bytes = await get(thumb, 'bytes'); }
    const ext = (src.match(/\.(jpe?g|png|gif|svg|webp)(\.png)?$/i)?.[2] ? 'png' : src.match(/\.(jpe?g|png|gif|webp)$/i)?.[1]) ?? 'jpg';
    const file = `${key}.${ext.toLowerCase()}`;
    await writeFile(`${ROOT}public/content/images/${file}`, bytes);
    image = {
      src: `/content/images/${file}`,
      width: summary.thumbnail.width,
      height: summary.thumbnail.height,
      credit: await commonsCredit(summary.originalimage?.source?.split('?')[0] ?? thumb),
    };
  }

  manifest.articles[key] = {
    title: summary.titles.normalized,
    description: summary.description ?? '',
    revision: Number(revision),
    url: `https://en.wikipedia.org/wiki/${pathTitle(summary.titles.canonical)}`,
    permalink: `https://en.wikipedia.org/w/index.php?title=${pathTitle(summary.titles.canonical)}&oldid=${revision}`,
    image,
  };
  console.log(`✓ ${title}  rev ${revision}  ${(body.innerHTML.length / 1024).toFixed(0)} KB${image ? '' : '  (no image)'}`);
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log('\nPassage checks');
let problems = 0;
for (const hole of holes) {
  console.log(`\n${hole.id}`);
  hole.knots.forEach((knot, i) => {
    const r = checkKnot(bodies[keyOf(knot.article)], knot);
    const ok = r.passage && r.onward !== false;
    if (!ok) problems++;
    console.log(`  ${ok ? '✓' : '✗'} knot ${i + 1} · ${knot.article} · passage ${r.passage ? 'found' : 'MISSING'}` +
      (knot.onward ? ` · onward "${knot.onward}" ${r.onward ? 'found' : 'MISSING'}` : ''));
    if (!ok || process.argv.includes('--links')) for (const l of r.links) console.log(`      ${l}`);
  });
}
console.log(problems ? `\n${problems} problem(s)` : '\nAll passages and onward links verified.');
process.exitCode = problems ? 1 : 0;
