// Snapshots every Wikipedia page the holes in /holes touch, and checks that
// every quoted passage, section and onward link is really there.
//
//   node scripts/fetch-content.mjs            fetch the revisions pinned in /holes
//                                             (a knot with "revision": null gets the
//                                             latest, written back into its hole file)
//   node scripts/fetch-content.mjs --update   move every knot to the latest revision
//   node scripts/fetch-content.mjs --refresh  re-download snapshots even if already saved
//
// Pages already in the manifest at the same revision are not downloaded again.
// If two holes pin one page to different revisions, the newer one is used for
// both (and every passage is re-verified against it). For new holes it also
// fills in, and writes back: each knot's section and canonical URL, and blank
// card descriptions (Wikipedia's short description) and images (lead image).
//
// Knot pages are saved as cleaned HTML; every page (knots and endpoints) gets
// its lead image and Commons credit.
// Output: holes/snapshots/pages/*.html, holes/snapshots/images/*,
//         holes/snapshots/manifest.json

import { readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { existsSync } from 'node:fs';
import { compressImage, LEAD_MAX_WIDTH } from './images.mjs';
import { fragmentFor, fragmentKey, keyOf, knotProblems, loadDom, passageSection } from './knots.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const UA = 'RabbitHolesPrototype/0.1 (educational prototype; Wikipedia reader)';
const API = 'https://en.wikipedia.org/api/rest_v1';
const UPDATE = process.argv.includes('--update');
const REFRESH = process.argv.includes('--refresh');
const SNAP = `${ROOT}holes/snapshots`;

const holeFiles = (await readdir(`${ROOT}holes`)).filter((f) => f.endsWith('.json'));
const holes = await Promise.all(
  holeFiles.map(async (f) => ({ file: f, hole: JSON.parse(await readFile(`${ROOT}holes/${f}`, 'utf8')) })),
);

await mkdir(`${SNAP}/pages`, { recursive: true });
await mkdir(`${SNAP}/images`, { recursive: true });

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
  // Not .noexcerpt: it only means "leave out of previews" and marks real text such as pronunciations.
  '.portalbox', '.portal', '[role="navigation"]', '.mw-empty-elt',
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
    const src = img.getAttribute('src');
    if (src) img.setAttribute('src', src.replace(/^\/\//, 'https://'));
    img.removeAttribute('srcset');
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

/** Image type from its first bytes, for URLs that don't say. */
function sniffImageType(bytes) {
  const head = bytes.subarray(0, 64).toString('latin1');
  if (head.startsWith('\x89PNG')) return 'png';
  if (head.startsWith('\xff\xd8')) return 'jpg';
  if (head.startsWith('GIF8')) return 'gif';
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'webp';
  if (/<svg|<\?xml/.test(head)) return 'svg';
  return 'bin';
}

/**
 * Download every image an article shows into holes/snapshots/images/pages/<key>/
 * and point the <img> at it with data-asset (the app resolves it to the bundled
 * file), so reading never fetches from Wikimedia.
 */
async function bundleImages(body, key) {
  const dir = `${SNAP}/images/pages/${key}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const saved = new Map();
  let n = 0;
  for (const img of [...body.querySelectorAll('img')]) {
    // Thumb URLs carry tracking query strings; the file is the path alone.
    const src = img.getAttribute('src')?.split('?')[0];
    img.removeAttribute('src');
    if (!src || !/^https:\/\//.test(src)) continue;
    let file = saved.get(src);
    if (!file) {
      const base = decodeURIComponent(src.split('/').pop()).replace(/[^A-Za-z0-9._-]+/g, '_').slice(-60);
      let bytes;
      try {
        bytes = await get(src, 'bytes');
      } catch (err) {
        // e.g. maps.wikimedia.org refuses map tiles (403). Drop the image rather than load it live.
        console.log(`  ! dropped an image that couldn't be downloaded: ${src} (${err.message.split(' ')[0]})`);
        (img.closest('.mw-kartographer-map, .mw-kartographer-maplink, figure') ?? img).remove();
        continue;
      }
      file = `${String(++n).padStart(3, '0')}-${base}`;
      // Some images (e.g. rendered maths formulas) have no extension in their URL.
      if (!/\.(jpe?g|png|gif|svg|webp)$/i.test(file)) file += `.${sniffImageType(bytes)}`;
      const out = await compressImage(bytes, file.split('.').pop());
      file = file.replace(/\.[^.]+$/, `.${out.ext}`);
      await writeFile(`${dir}/${file}`, out.bytes);
      saved.set(src, file);
    }
    img.setAttribute('data-asset', `snapshots/images/pages/${key}/${file}`);
  }
  console.log(`  ${saved.size} images bundled for ${key}`);
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

// Which revision each knot page is pinned to; all knots on one page must agree.
const knotPages = new Map();
for (const { hole } of holes) {
  for (const knot of hole.knots) {
    const pinned = UPDATE ? null : knot.revision;
    const seen = knotPages.get(knot.page);
    if (seen != null && pinned != null && seen !== pinned) {
      console.log(`! ${knot.page} is pinned to ${seen} and ${pinned}; using the newer for both`);
    }
    knotPages.set(knot.page, seen != null && pinned != null ? Math.max(seen, pinned) : seen ?? pinned);
  }
}
const endpointPages = new Set(holes.flatMap(({ hole }) => [hole.start.page, hole.end.page]));

const previous = existsSync(`${SNAP}/manifest.json`)
  ? JSON.parse(await readFile(`${SNAP}/manifest.json`, 'utf8')).pages
  : {};
const manifest = { fetched: new Date().toISOString().slice(0, 10), pages: {} };
const revisions = new Map();

for (const title of new Set([...knotPages.keys(), ...endpointPages])) {
  const key = keyOf(title);
  const isKnotPage = knotPages.has(title);
  const kept = previous[key];
  const wanted = knotPages.get(title);
  if (!REFRESH && kept && (isKnotPage ? kept.snapshot && kept.revision === wanted && existsSync(`${SNAP}/pages/${key}.html`) : true)) {
    manifest.pages[key] = { ...kept, snapshot: isKnotPage, fragments: undefined };
    revisions.set(title, kept.revision);
    continue;
  }
  const summary = await get(`${API}/page/summary/${pathTitle(title)}`);
  const revision = Number((isKnotPage && knotPages.get(title)) || summary.revision);
  revisions.set(title, revision);

  if (isKnotPage) {
    const html = await get(`${API}/page/html/${pathTitle(summary.titles.canonical)}/${revision}`, 'text');
    const body = cleanArticle(html);
    await bundleImages(body, key);
    await writeFile(`${SNAP}/pages/${key}.html`, body.innerHTML);
  }

  let image = null;
  const thumb = summary.thumbnail?.source?.split('?')[0];
  if (thumb) {
    const src = thumb.replace(/\/(\d+)px-/, '/640px-');
    let bytes;
    try { bytes = await get(src, 'bytes'); } catch { bytes = await get(thumb, 'bytes'); }
    const ext = (src.match(/\.(jpe?g|png|gif|svg|webp)(\.png)?$/i)?.[2] ? 'png' : src.match(/\.(jpe?g|png|gif|webp)$/i)?.[1]) ?? 'jpg';
    const out = await compressImage(bytes, ext, { maxWidth: LEAD_MAX_WIDTH });
    const file = `${key}.${out.ext}`;
    await writeFile(`${SNAP}/images/${file}`, out.bytes);
    image = {
      file: `snapshots/images/${file}`,
      width: summary.thumbnail.width,
      height: summary.thumbnail.height,
      credit: await commonsCredit(summary.originalimage?.source?.split('?')[0] ?? thumb),
    };
  }

  manifest.pages[key] = {
    title: summary.titles.normalized,
    description: summary.description ?? '',
    revision,
    url: `https://en.wikipedia.org/wiki/${pathTitle(summary.titles.canonical)}`,
    permalink: `https://en.wikipedia.org/w/index.php?title=${pathTitle(summary.titles.canonical)}&oldid=${revision}`,
    snapshot: isKnotPage,
    image,
  };
  console.log(`✓ ${title}  rev ${revision}${isKnotPage ? '' : '  (endpoint: image only)'}${image ? '' : '  (no image)'}`);
}

await writeFile(`${SNAP}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');

// Write back what came from Wikipedia: revisions, canonical URLs, blank sections,
// blank card descriptions and images.
for (const { file, hole } of holes) {
  const changes = new Set();
  for (const knot of hole.knots) {
    const page = manifest.pages[keyOf(knot.page)];
    if (knot.revision !== page.revision) { knot.revision = page.revision; changes.add('revision'); }
    if (knot.url !== page.url) { knot.url = page.url; changes.add('url'); }
    if (!knot.section) {
      const section = passageSection(loadDom(await readFile(`${SNAP}/pages/${keyOf(knot.page)}.html`, 'utf8')), knot.passage);
      if (section) { knot.section = section; changes.add('section'); }
    }
  }
  for (const end of [hole.start, hole.end]) {
    const page = manifest.pages[keyOf(end.page)];
    if (!end.description && page.description) { end.description = page.description; changes.add('description'); }
    // Blank, or pointing at a file that's gone (e.g. replaced by its WebP version).
    if (page.image && (!end.image || !existsSync(`${ROOT}holes/${end.image}`))) {
      if (end.image !== page.image.file) { end.image = page.image.file; changes.add('image'); }
    }
  }
  if (changes.size) {
    await writeFile(`${ROOT}holes/${file}`, JSON.stringify(hole, null, 2) + '\n');
    console.log(`  holes/${file}: wrote ${[...changes].join(', ')}`);
  }
}

// An onward link may point at an old title that now redirects to the next page
// (e.g. "Seathwaite, Allerdale" → "Seathwaite, Cumberland"). Resolve those and
// record the real destination in the snapshot, so the link counts.
for (const { hole } of holes) {
  for (const knot of hole.knots) {
    if (!knot.onwardLinkText) continue;
    const path = `${SNAP}/pages/${keyOf(knot.page)}.html`;
    const body = loadDom(await readFile(path, 'utf8'));
    if (!knotProblems(body, knot).some((p) => p.startsWith('onward link'))) continue;
    const want = knot.onwardLinkText.replace(/\s+/g, ' ').trim();
    const targets = new Set(
      [...body.querySelectorAll('a[data-target]')]
        .filter((a) => a.textContent.replace(/\s+/g, ' ').trim() === want)
        .map((a) => a.getAttribute('data-target')),
    );
    for (const target of targets) {
      const q = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=${encodeURIComponent(target)}`);
      const resolved = q.query?.redirects?.[0]?.to;
      if (resolved && resolved.toLowerCase() === knot.nextPage.toLowerCase()) {
        for (const a of body.querySelectorAll('a[data-target]')) {
          if (a.getAttribute('data-target') === target) a.setAttribute('data-target', knot.nextPage);
        }
        await writeFile(path, body.innerHTML);
        console.log(`  ${knot.page}: link "${want}" redirects ${target} → ${knot.nextPage}`);
      }
    }
  }
}

// The text-fragment anchor for each passage's "open at this passage" link.
for (const { hole } of holes) {
  for (const knot of hole.knots) {
    const page = manifest.pages[keyOf(knot.page)];
    const body = loadDom(await readFile(`${SNAP}/pages/${keyOf(knot.page)}.html`, 'utf8'));
    const fragment = fragmentFor(body, knot.passage);
    if (fragment) (page.fragments ??= {})[fragmentKey(knot.passage)] = fragment;
    else console.log(`  ! no unique opening for a passage on ${knot.page}; its link falls back to the first words`);
  }
}
await writeFile(`${SNAP}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');

console.log('\nKnot checks');
let problems = 0;
for (const { hole } of holes) {
  console.log(`\n${hole.id}`);
  for (const [i, knot] of hole.knots.entries()) {
    const body = loadDom(await readFile(`${SNAP}/pages/${keyOf(knot.page)}.html`, 'utf8'));
    const found = knotProblems(body, knot);
    problems += found.length;
    console.log(`  ${found.length ? '✗' : '✓'} knot ${i + 1} · ${knot.page} · ${knot.section}` +
      (knot.onwardLinkText ? ` · "${knot.onwardLinkText}" → ${knot.nextPage}` : ''));
    for (const p of found) console.log(`      ${p}`);
  }
}
console.log(problems ? `\n${problems} problem(s)` : '\nAll passages, sections and onward links verified.');
process.exitCode = problems ? 1 : 0;
