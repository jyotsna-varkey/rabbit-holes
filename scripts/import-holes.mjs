// Turns entries from the rabbit-hole reading copy (.txt) into hole files in /holes.
//
//   node scripts/import-holes.mjs "<reading copy>.txt" 1-20
//
// Each entry gives the page chain, the paragraph quoted from each page, the link
// text leading on, and the pinned revision. The script fills everything that
// comes from Wikipedia: pages, URLs, revisions, passages (footnote markers
// removed), onward link text, next pages. Our own writing (claim, card titles
// and descriptions, hatnotes, payoff, caveats) is left as "" for a person to
// write, and kept as-is when a hole file already exists. Sections are filled in
// by `node scripts/fetch-content.mjs`, which also verifies every knot.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const [file, range = '1-20'] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/import-holes.mjs "<reading copy>.txt" [from-to]');
  process.exit(1);
}
const [from, to] = range.split('-').map(Number);

const slug = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Same form as the fetch script writes (which corrects it to the canonical title if needed).
const wikiUrl = (page) => `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`;

/**
 * Footnote markers as the reading copy prints them: [12], [a], [G], [note 3],
 * [citation needed], and page references after a footnote ("[13]: 95–98").
 */
const stripFootnotes = (s) =>
  s.replace(/\[\d+\]:\s?[\d–\-, ]*\d/g, '')
    .replace(/\[(?:\d+|[a-zA-Z]{1,2}|note \d+|nb \d+|citation needed|clarification needed|when\?|who\?|according to whom\?)\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function parse(text) {
  const parts = text.split(/\n=+\n(\d{2,3})\. (.+?)\n=+\n/);
  const entries = [];
  for (let i = 1; i < parts.length; i += 3) {
    const body = parts[i + 2];
    const paras = [...body.matchAll(
      /\n(\d)\. (.+?)\n\n([\s\S]+?)\n\n(?:Connection to the next paragraph: (.+?)\n\n)?Source: https:\/\/en\.wikipedia\.org\/w\/index\.php\?oldid=(\d+)/g,
    )].map((m) => ({ page: m[2].trim(), text: m[3].trim(), connection: m[4]?.trim() ?? null, oldid: Number(m[5]) }));
    entries.push({ num: Number(parts[i]), title: parts[i + 1].trim(), chain: body.trim().split('\n')[0].split(' → '), paras });
  }
  return entries;
}

const entries = parse(await readFile(file, 'utf8')).filter((e) => e.num >= from && e.num <= to);
const blankEndpoint = (page) => ({ title: page, page, description: '', image: '' });

for (const e of entries) {
  if (e.paras.length < 2 || e.paras.map((p) => p.page).join('|') !== e.chain.join('|')) {
    console.error(`✗ ${e.num} ${e.title}: paragraphs don't match the chain ${e.chain.join(' → ')}`);
    process.exitCode = 1;
    continue;
  }
  const first = e.chain[0];
  const last = e.chain[e.chain.length - 1];
  const id = `${slug(first)}-${slug(last)}`;
  const path = `${ROOT}holes/${id}.json`;
  const old = existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : null;

  const knots = e.paras.map((p, i) => {
    const before = old?.knots?.[i]?.page === p.page ? old.knots[i] : null;
    return {
      page: p.page,
      url: wikiUrl(p.page),
      revision: p.oldid,
      section: before?.section ?? '',
      passage: stripFootnotes(p.text),
      hatnote: before?.hatnote ?? '',
      onwardLinkText: p.connection ? p.connection.replace(/ /g, ' ') : null,
      nextPage: e.paras[i + 1]?.page ?? last,
    };
  });

  const hole = {
    id,
    claim: old?.claim ?? '',
    start: old?.start ?? blankEndpoint(first),
    end: old?.end ?? blankEndpoint(last),
    knots,
    payoff: old?.payoff ?? '',
    caveats: old?.caveats ?? [],
  };
  await writeFile(path, JSON.stringify(hole, null, 2) + '\n');
  console.log(`${old ? 'updated' : 'created'} holes/${id}.json  (${e.num}. ${e.title})`);
}
