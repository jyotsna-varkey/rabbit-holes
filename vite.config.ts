import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * `holes/<id>.json?card` is the hole's card for the home stack: claim, start
 * and end, knot count and word count, without the passages. The stack loads
 * every card up front; a hole's passages load when it's opened
 * (src/content/index.ts), so the start-up script stays small however many
 * holes there are.
 */
const holeCards: Plugin = {
  name: 'hole-cards',
  enforce: 'pre',
  transform(code, id) {
    // The page manifest's card part: what a card's infobox reads (endpointInfo in
    // src/content): the lead image's credit, and the page URL when it isn't the
    // one endpointInfo would build from the title anyway.
    if (/\/holes\/snapshots\/manifest\.json\?card$/.test(id)) {
      type Page = { title: string; url: string; image: { credit: unknown } | null };
      const { pages } = JSON.parse(code) as { pages: Record<string, Page> };
      const slim: Record<string, Partial<Page>> = {};
      for (const [k, p] of Object.entries(pages)) {
        const entry: Partial<Page> = {};
        if (p.url !== `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`) entry.url = p.url;
        if (p.image?.credit) entry.image = { credit: p.image.credit };
        slim[k] = entry;
      }
      return { code: JSON.stringify({ pages: slim }), map: null };
    }
    if (!/\/holes\/[^/]+\.json\?card$/.test(id)) return;
    const h = JSON.parse(code);
    const words = h.knots.reduce(
      (n: number, k: { passage: string; hatnote: string }) => n + `${k.passage} ${k.hatnote}`.split(/\s+/).length,
      0,
    );
    const card = { id: h.id, claim: h.claim, start: h.start, end: h.end, knots: h.knots.length, words, firstPage: h.knots[0].page };
    return { code: JSON.stringify(card), map: null };
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [holeCards, react()],
  // Article and card images are served as plain files from holes/snapshots/images
  // (and copied into the build), never imported, so none end up inside the JS.
  publicDir: 'holes/snapshots/images',
  build: {
    rollupOptions: {
      output: {
        // The sign-in library loads only for readers who sign in; give it its own name.
        manualChunks: (id) => (id.includes('node_modules/@supabase/') ? 'supabase' : undefined),
      },
    },
  },
})
