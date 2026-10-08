# Rabbit Holes

Hand-built Wikipedia rabbit holes. Swipe right on a card, pull the thread through
real Wikipedia passages, and watch the claim go from [citation needed] to cited.

Mobile-first web app (Vite + React + TypeScript, framer-motion for gestures).

## Run it

```bash
npm install
npm run dev -- --host
```

Open the "Network" URL Vite prints on your phone (same Wi-Fi) to try the gestures for real.

- `?recall` on the URL forces the next-day recall box (needs one finished hole).
- Down arrow pulls the thread on a laptop; tapping the knot or the onward link also pulls.

## Content

Holes live in `src/content/holes.json` (claims, hatnotes, verbatim passages, onward links).
Article HTML, images and credits are pulled from Wikipedia, pinned to a revision:

```bash
node scripts/fetch-content.mjs           # fetch latest revisions and verify every passage
node scripts/fetch-content.mjs --pinned  # re-fetch the revisions already pinned in the manifest
```

The script fails if any passage or onward link isn't found word for word in its article.
Output goes to `public/content/` and `src/content/manifest.json`.

Wikipedia text is CC BY-SA 4.0; every page credits and links its source revision, and
endpoint images carry their Commons author and licence.

## Where things are

- `src/lib/rope.ts` — the thread's Verlet physics
- `src/lib/passage.ts` — finds and highlights a quoted passage in an article
- `src/screens/Home.tsx` — the stack, "Did you know…" and recall
- `src/screens/HoleView.tsx` — the tumble, the pages, pulling the knot
- `src/components/ArticlePage.tsx` — one Wikipedia page with focus blur and hatnote
- `src/screens/Ending.tsx` — the cited ending, references and the three doors
