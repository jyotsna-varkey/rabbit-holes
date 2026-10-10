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

- Down arrow pulls the thread on a laptop; tapping the knot or the onward link also pulls.

## Content

Each hole is a hand-authored JSON file in `holes/` (schema in SPEC.md). Snapshots
of the Wikipedia pages they quote ship in `holes/snapshots/` (cleaned HTML pinned
to a revision, lead images, Commons credits in `manifest.json`).

```bash
node scripts/fetch-content.mjs           # fetch the revisions pinned in holes/*.json, verify every knot
node scripts/fetch-content.mjs --update  # move every knot to the latest revision, then verify
node scripts/fetch-content.mjs --refresh # re-download snapshots that are already saved
```

New holes can come from the rabbit-hole reading copy (.txt):

```bash
node scripts/import-holes.mjs "Rabbit Holes — Reading Copy.txt" 21-40
node scripts/fetch-content.mjs
```

The import fills in everything that comes from Wikipedia (pages, revisions,
passages with footnote markers removed, onward link text). The fetch adds
sections, URLs, card descriptions and images. The claim, hatnotes, payoff and
caveats are ours to write; `npm test` fails until every hatnote is filled in.

The script fails if any passage isn't found word for word, isn't in the stated
section, or its onward link isn't inside the passage. `npm test` runs the same
checks offline against the stored snapshots.

Wikipedia text is CC BY-SA 4.0; every page credits and links its source revision, and
endpoint images carry their Commons author and licence.

## Hosting

Live at https://rabbit-holes-gules.vercel.app (Vercel project `rabbit-holes`).
To publish the current version:

```bash
npx vercel@48 deploy --prod
```

To run the browser tests against the live site:

```bash
BASE_URL=https://rabbit-holes-gules.vercel.app npm run test:e2e
```

## Tests

```bash
npm test                  # unit + data tests (Vitest)
npm run test:e2e          # browser tests at phone and laptop sizes (Playwright)
npm run shot -- / home    # screenshots/home-phone.png and home-laptop.png
```

## Where things are

- `src/lib/rope.ts` — the thread's Verlet physics
- `src/lib/passage.ts` — finds and highlights a quoted passage in an article
- `src/screens/Home.tsx` — the stack, "Did you know…" and recall
- `src/screens/HoleView.tsx` — the tumble, the pages, pulling the knot
- `src/components/ArticlePage.tsx` — one Wikipedia page with focus blur and hatnote
- `src/screens/Ending.tsx` — the cited ending, references and the three doors
