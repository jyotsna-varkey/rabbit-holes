import manifestJson from '../../holes/snapshots/manifest.json';

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
  image: { file: string; width: number; height: number; credit: ImageCredit | null } | null;
};

const holeFiles = import.meta.glob<Hole>('../../holes/*.json', { eager: true, import: 'default' });
const imageUrls = import.meta.glob<string>('../../holes/snapshots/images/**/*', { eager: true, query: '?url', import: 'default' });
const pageHtml = import.meta.glob<string>('../../holes/snapshots/pages/*.html', { query: '?raw', import: 'default' });

// The stack starts with the hole the spec was written around; any others follow by id.
const STACK_ORDER = ['coffee-insurance', 'sandwich-hawaii', 'sandwich-copper-bottomed', 'coffee-haiti'];
const rank = (id: string) => (STACK_ORDER.includes(id) ? STACK_ORDER.indexOf(id) : STACK_ORDER.length);

export const holes = Object.values(holeFiles).sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
export const pages = manifestJson.pages as unknown as Record<string, PageInfo>;

export const keyOf = (title: string) => title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const pageOf = (title: string) => pages[keyOf(title)];
export const holeById = (id: string) => holes.find((h) => h.id === id)!;

/** URL of a file under /holes, as bundled by Vite. */
export const holesAsset = (path: string) => (path ? imageUrls[`../../holes/${path}`] ?? null : null);

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
 * fragment). Uses the passage's first 10 words, stopping before any word with a
 * quote mark (the live page may use curly ones); the data test checks each one
 * matches only the passage on its page.
 */
export function passageUrl(k: Knot) {
  const all = k.passage.split(/\s+/);
  const quoted = all.findIndex((w) => /['"\u2018\u2019\u201C\u201D]/.test(w));
  const words = all.slice(0, Math.min(10, quoted < 0 ? 10 : Math.max(quoted, 4))).join(' ').replace(/[,.;:]+$/, '');
  const enc = encodeURIComponent(words).replace(/-/g, '%2D');
  return `${k.url}#:~:text=${enc}`;
}

/** "about M min": reading time for passages and hatnotes plus time to pull each knot. */
export function minutesFor(hole: Hole) {
  const words = hole.knots.reduce((n, k) => n + `${k.passage} ${k.hatnote}`.split(/\s+/).length, 0);
  return Math.max(1, Math.round(words / 180 + hole.knots.length * 0.5));
}

export const citationRange = (hole: Hole) =>
  hole.knots.length === 1 ? '[1]' : `[1–${hole.knots.length}]`;

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
