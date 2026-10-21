// Holes are hand-authored JSON in /holes (schema in SPEC.md). Everything the
// app shows ships with it: page snapshots and images live in /holes/snapshots.

export type Knot = {
  page: string;
  url: string;
  revision: number | null;
  section: string;
  passage: string;
  hatnote: string;
  /** Text of the link inside the passage that leads to nextPage, or null if the passage has none. */
  onwardLinkText: string | null;
  nextPage: string;
};

export type Endpoint = {
  title: string;
  /** Wikipedia page the card stands for; can differ from the title ("Copper-bottomed"). */
  page: string;
  description: string;
  /** Path under /holes, or "" for none. */
  image: string;
};

export type Hole = {
  id: string;
  claim: string;
  start: Endpoint;
  end: Endpoint;
  knots: Knot[];
  payoff: string;
  caveats: string[];
};

export type ImageCredit = {
  file: string;
  artist: string;
  license: string;
  licenseUrl: string | null;
  filePage: string;
};

export type PageInfo = {
  title: string;
  description: string;
  revision: number;
  url: string;
  permalink: string;
  snapshot: boolean;
  /** Text-fragment anchors by passage opening (first 80 characters), from the fetch script. */
  fragments?: Record<string, string>;
  image: { file: string; width: number; height: number; credit: ImageCredit | null } | null;
};

/** What the home stack and the shelf need, without the passages (built by vite.config.ts). */
export type Card = {
  id: string;
  claim: string;
  start: Endpoint;
  end: Endpoint;
  /** Number of knots. */
  knots: number;
  /** Words in the passages and hatnotes, for the reading time. */
  words: number;
  /** Page of the first knot, warmed before the reader swipes in. */
  firstPage: string;
};

const cardFiles = import.meta.glob<Card>('../../holes/*.json', { eager: true, query: '?card', import: 'default' });
const holeFiles = import.meta.glob<Hole>('../../holes/*.json', { import: 'default' });
const pageHtml = import.meta.glob<string>('../../holes/snapshots/pages/*.html', { query: '?raw', import: 'default' });

// Sorted by id for a stable list; the stack shuffles its own order (src/lib/order.ts).
export const cards = Object.values(cardFiles).sort((a, b) => a.id.localeCompare(b.id));

// The page manifest in two parts: what the home cards need (each page's URL and
// lead image with its credit) loads up front; the rest (descriptions, revisions,
// passage anchors) loads with the first hole that's opened.
type Manifest = { pages: Record<string, PageInfo> };
const cardManifest = Object.values(
  import.meta.glob<Manifest>('../../holes/snapshots/manifest.json', { eager: true, query: '?card', import: 'default' }),
)[0];
let fullPages: Record<string, PageInfo> | null = null;
let pagesLoading: Promise<void> | null = null;
const loadPages = () =>
  (pagesLoading ??= import('../../holes/snapshots/manifest.json').then((m) => {
    fullPages = (m.default as unknown as Manifest).pages;
  }));

export const keyOf = (title: string) => title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Inside a hole the full manifest has always loaded (loadHole waits for it); on the
// home cards only url and image are read.
export const pageOf = (title: string) => (fullPages ?? cardManifest.pages)[keyOf(title)];
export const cardById = (id: string) => cards.find((h) => h.id === id)!;

// A hole's passages load the first time it's needed (and are kept).
const holeCache = new Map<string, Promise<Hole>>();
const loadedHoles = new Map<string, Hole>();
export function loadHole(id: string) {
  let p = holeCache.get(id);
  if (!p) {
    const load = holeFiles[`../../holes/${id}.json`];
    p = load ? Promise.all([load(), loadPages()]).then(([h]) => h) : Promise.reject(new Error(`No hole ${id}`));
    holeCache.set(id, p);
    p.then((h) => loadedHoles.set(id, h), () => holeCache.delete(id));
  }
  return p;
}
/** The hole, if it has already loaded. */
export const loadedHole = (id: string) => loadedHoles.get(id);

/**
 * URL of an image under /holes ("snapshots/images/…"). holes/snapshots/images is
 * Vite's static folder (vite.config.ts), so images are plain files at the site
 * root and never end up inside the JS.
 */
export const holesAsset = (path: string) =>
  path ? `${import.meta.env.BASE_URL}${path.replace(/^snapshots\/images\//, '')}` : null;

export function endpointInfo(e: Endpoint) {
  const page = pageOf(e.page);
  const src = holesAsset(e.image);
  return {
    title: e.title,
    description: e.description,
    image: src ? { src, credit: page?.image?.credit ?? null } : null,
    url: page?.url ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(e.page.replace(/ /g, '_'))}`,
  };
}

/**
 * Live Wikipedia URL that opens the page scrolled to this knot's passage (a text
 * fragment). The fetch script stores the shortest opening that's unique on the
 * page; otherwise the first 10 words, stopping before any word with a quote
 * mark. The data test checks each one matches only the passage on its page.
 */
export function passageUrl(k: Knot) {
  const all = k.passage.split(/\s+/);
  const quoted = all.findIndex((w) => /['"\u2018\u2019\u201C\u201D]/.test(w));
  const words =
    pageOf(k.page)?.fragments?.[k.passage.slice(0, 80)] ??
    all.slice(0, Math.min(10, quoted < 0 ? 10 : Math.max(quoted, 4))).join(' ').replace(/[,.;:]+$/, '');
  const enc = encodeURIComponent(words).replace(/-/g, '%2D');
  return `${k.url}#:~:text=${enc}`;
}

/** "about M min": reading time for passages and hatnotes plus time to pull each knot. */
export function minutesFor(card: Card) {
  return Math.max(1, Math.round(card.words / 180 + card.knots * 0.5));
}

/** "[1–N]" for a hole with N knots. */
export const citationRange = (knots: number) => (knots === 1 ? '[1]' : `[1–${knots}]`);

const htmlCache = new Map<string, Promise<string>>();
export function loadArticle(page: string) {
  const key = keyOf(page);
  let p = htmlCache.get(key);
  if (!p) {
    const load = pageHtml[`../../holes/snapshots/pages/${key}.html`];
    p = load ? load() : Promise.reject(new Error(`No snapshot for ${page}`));
    htmlCache.set(key, p);
    p.catch(() => htmlCache.delete(key));
  }
  return p;
}
