import holesJson from './holes.json';
import manifestJson from './manifest.json';

export type Knot = {
  article: string;
  hatnote: string;
  passage: string;
  /** Text-fragment anchor used to open the live article at this passage. */
  fragment: string;
  /** Title of the article the thread leads to from this passage, if the link sits inside it. */
  onward?: string;
};

export type Endpoint = { article: string; label?: string; description?: string };

export type Hole = {
  id: string;
  claim: string;
  recall: { before: string; blank: string; after: string };
  minutes: number;
  start: Endpoint;
  end: Endpoint;
  knots: Knot[];
  payoff: string;
};

export type ImageCredit = {
  file: string;
  artist: string;
  license: string;
  licenseUrl: string | null;
  filePage: string;
};

export type Article = {
  title: string;
  description: string;
  revision: number;
  url: string;
  permalink: string;
  image: { src: string; width: number; height: number; credit: ImageCredit | null } | null;
};

export const holes = holesJson as Hole[];
export const articles = manifestJson.articles as unknown as Record<string, Article>;

export const keyOf = (title: string) => title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const articleOf = (title: string) => articles[keyOf(title)];
export const holeById = (id: string) => holes.find((h) => h.id === id)!;

export function endpointInfo(e: Endpoint) {
  const a = articleOf(e.article);
  return {
    title: e.label ?? a.title,
    description: e.description ?? a.description,
    image: a.image,
    url: a.url,
  };
}

export const fragmentUrl = (k: Knot) => `${articleOf(k.article).url}#:~:text=${encodeURIComponent(k.fragment)}`;

export const citationRange = (hole: Hole) =>
  hole.knots.length === 1 ? '[1]' : `[1–${hole.knots.length}]`;

const articlesIn = (h: Hole) => new Set([h.start.article, ...h.knots.map((k) => k.article), h.end.article]);

/** Articles in this hole that other holes also pass through. */
export function connections(hole: Hole) {
  const mine = articlesIn(hole);
  const out: { article: string; holes: Hole[] }[] = [];
  for (const article of mine) {
    const others = holes.filter((h) => h.id !== hole.id && articlesIn(h).has(article));
    if (others.length) out.push({ article, holes: others });
  }
  return out;
}

const htmlCache = new Map<string, Promise<string>>();
export function loadArticle(title: string) {
  const key = keyOf(title);
  let p = htmlCache.get(key);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}content/articles/${key}.html`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${title}`);
      return r.text();
    });
    htmlCache.set(key, p);
    p.catch(() => htmlCache.delete(key));
  }
  return p;
}
