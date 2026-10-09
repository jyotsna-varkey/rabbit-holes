# Plan

Work one step at a time. Mark a step [x] only when it works, the tests pass,
and it has been committed. Update this file at the end of every session.

`[~]` = built in the prototype commit (8a5b2ab) and checked by hand in the
browser, but not yet covered by tests. It becomes [x] once tests cover it.

## Steps
- [x] 0. Setup: git init, Vite, Vitest, Playwright, screenshot script.
        Built with React + TypeScript + framer-motion instead of vanilla JS
        (see Decisions). Test tooling added in step 12.
- [x] 1. Hole data: holes/coffee-insurance.json in the spec schema; data test
        (tests/unit/holes.test.ts). Two of the plan's rules are `todo`, blocked
        on an owner decision (Known issues).
- [~] 2. Static page view: Wikipedia-style page with title, "From Wikipedia",
        attribution footer linking the pinned revision, hatnote, highlighted
        passage (src/components/ArticlePage.tsx, src/lib/passage.ts).
- [~] 3. Focus: auto-scroll once on arrival, veils blur above/below, reader
        scroll lifts the blur, "Back to the thread" button.
- [x] 4. Knot pull: knot handle at the bottom; drag up advances; click knot and
        down arrow also advance; nothing else pulls (tests/e2e/hole.spec.ts,
        pull-only-knot.spec.ts).
- [~] 5. Thread: Verlet rope (src/lib/rope.ts). Runs down the left margin into
        the hatnote, hidden behind the passage, out of the onward link to the
        knot. Sags, goes taut while pulling, springs back.
- [~] 6. Progress knots in the top bar: purple visited, ring current, grey ahead.
- [x] 7. Ending: end card swings in, purple thread through numbered knots,
        [citation needed] → [1–N], references list, Go deeper / Next hole /
        Keep it, shelf in localStorage (tests/e2e/ending.spec.ts,
        extras.spec.ts, go-deeper.spec.ts).
- [~] 8. Home stack: three cards with two peeking, swipe right to enter,
        swipe left to send to back (also logged to localStorage).
- [~] 9. Tumble: the start infobox grows into the first article, then the page
        auto-scrolls to the passage.
- [x] 10. All four library holes in /holes, spec schema, covered by the data test.
- [x] 11. Verbatim check script: scripts/fetch-content.mjs reads /holes, fetches
         each knot page at its pinned revision into holes/snapshots, and fails
         if a passage, section or in-passage onward link doesn't match. The
         same check runs offline in `npm test`.
- [x] 12. Test harness: Vitest (tests/unit), Playwright (tests/e2e, phone
         390×844 + laptop 1280×800), `npm test`, `npm run test:e2e`,
         `npm run shot`, screenshots/ ignored. Unit tests for the rope and
         passage matching; e2e tests for home, enter, knot pull, short drag.
- [x] 13. Holes in /holes, one file per hole, spec schema. Data tests.
         Fetch script reads /holes. (Completes steps 1, 10 and 11.)
- [x] 14. Spec fixes, one commit each, each with a Playwright or data test:
  - [x] 14a. Article images bundled in holes/snapshots/images/pages; no
             requests to Wikipedia/Wikimedia while reading (item 8).
  - [x] 14b. [citation needed] is grey on cards and the ending (item 11).
  - [x] 14c. Pull only from the knot: tapping the onward link no longer pulls (item 12).
  - [x] 14d. Left arrow = back on laptop (item 13).
  - [x] 14e. Laptop layout checked and fixed: margin thread follows the text column (item 14).
  - [x] 14f. Motion only for thread, focus blur, tumble and the end card's swing (item 15).
  - [x] 14g. Remove extras: Did you know, See also, stack buttons (item 16; recall went in step 13).
  - [x] 14h. Go deeper opens real Wikipedia at the passage (item 17).
- [x] 16. Import holes 1–20 from "Rabbit Holes — Reading Copy.txt" (owner
         request, done before 15). scripts/import-holes.mjs converts entries;
         the fetch script snapshots, verifies and fills sections, URLs, card
         descriptions and images. Claims, hatnotes, payoffs and caveats are
         Claude's drafts, to be reviewed. tests/e2e/all-holes.spec.ts plays
         every hole end to end.
- [x] 17. Recompress bundled images to WebP (owner: no images dropped or
         greyed out). Shared helper used by the fetch script for new images
         and by a one-off pass over existing ones; references in snapshots,
         manifest and hole files updated. Data test: every bundled raster
         image is WebP, plus a size budget. Result: 1,615 images,
         52.8 MB → 22.0 MB, none removed.
- [x] 18. Slim the main JS bundle: images are served as plain files from
         Vite's static folder (holes/snapshots/images) instead of imports.
         Entry script 781 KB → 178 KB gzipped (it had grown in step 17: Vite
         inlines images under 4 KB as base64, and 310 recompressed images fell
         under that). Test: tests/unit/bundle.test.ts builds and checks a
         250 KB budget with no inlined images. Lazy-loading hole passages
         would save ~30 KB more; not done.
- [ ] 15. Cover the remaining [~] steps with tests: swipe left sends the card
         to the back (8); "Back to the thread" re-centres and blur returns (3);
         progress knot colours (6); the tumble lands on the first passage (9).

## Current step
15 (after the owner decisions under Known issues)

## Decisions
- React + TypeScript + framer-motion, approved by the owner on 2026-10-09
  (overrides the earlier "vanilla JS" decision). linkedom is a dev dependency
  for the fetch script.
- Content is static; no runtime Wikipedia or LLM calls.
- Pulls start only from the knot handle, never the page body.
- Left swipe on home = "not now", not delete.
- Article snapshots are pinned to a revision ID and stored as cleaned HTML.
- The thread hides behind the passage (margin → hatnote, then out of the
  onward link) because running it straight through the text made the passage
  hard to read. Tried first: a single line top → link → knot; rejected.
- Hole schema = SPEC schema plus `page` on start/end (card title can differ
  from the article, e.g. "Copper-bottomed" is the Copper sheathing page).
  `onwardLinkText` is null when the passage has no link to nextPage. The
  last knot's nextPage is the end card's page. Dropped from the old format:
  recall (feature removed), minutes (computed from word count), fragment
  (built from the passage's first words).
- All content lives under /holes: hole JSON at the top level, generated page
  snapshots, images and manifest in holes/snapshots, bundled by Vite
  (import.meta.glob), so nothing is fetched from Wikipedia at runtime.
  Endpoint-only pages (e.g. Lloyd's of London) keep just image + credit.
- Stack order: coffee-insurance first, then the rest (STACK_ORDER in
  src/content/index.ts).
- Onward links count only if they sit inside the quoted passage. The
  prototype used to fall back to a matching link elsewhere in the paragraph,
  which hid three knots without one.
- `npm test` runs Vitest only (as CLAUDE.md says); browser tests run with
  `npm run test:e2e`, which reuses a running dev server or starts one.
- Unit tests use linkedom for a DOM, with a small `Text.splitText` stand-in
  (linkedom lacks it); real-browser behaviour is covered by Playwright.
- The screenshot script creates screenshots/ if missing (one line added to
  the CLAUDE.md version).
- Tapping the onward link now behaves like any article link (opens
  Wikipedia in a new tab), since only the knot may pull.
- Left arrow = back means: previous knot; on the first knot, back to the
  stack; on the ending, back to the last knot. Escape still closes the hole.
- Allowed motion (tests/e2e/motion.spec.ts): thread, its knots, focus veils,
  tumble (with the top bar and knot fading in as it lands), the end card's
  swing. Removed: stack cards sliding forward, knot pop-in, pull-hint fade,
  progress-dot fades, back-to-thread slide, citation crossfade, ending
  zoom-out, references fade. The card following your finger and flying off
  on a swipe is the gesture itself, not added motion.
- Go deeper opens the last knot's passage (where the thread ended) via a
  text fragment; the references open each knot's passage. Fragments use up
  to the first 10 words, stopping before a quote mark; the data test checks
  each matches only its passage. Six words weren't enough for Coffee knot 2
  ("Up to the end of the…" appears earlier). Checked live on Wikipedia.
- Reading-copy holes: id = first page + last page slugs; start/end cards are
  the first and last knot pages (so the last knot's nextPage is its own page
  and it has no onward link). Passages are the reading copy's paragraphs,
  whole, with footnote markers ([12], [a], [13]: 95–98) stripped.
- Stack order: the original four first, then the reading copy's top 20 in
  its ranked order.
- When two holes pin one page to different revisions, the newer revision is
  used for both and every passage re-verified (Coffeehouse moved to
  1379296908 for coffee-insurance too).
- Onward links that point at an old title are followed through Wikipedia's
  redirect and the snapshot records the real destination (Borrowdale's
  "Seathwaite" → Seathwaite, Cumberland).
- `.noexcerpt` is no longer stripped from snapshots: it marks real text
  (pronunciations). Found because the Ambergris passage didn't match.
- Images that can't be downloaded (Wikimedia's map tiles answer 403) are
  removed from the snapshot rather than loaded live. Five maps dropped.
- Images with no extension in their URL (rendered maths) get one from their
  bytes.
- "Open at passage" links use the shortest opening of 10+ words that is
  unique on the page, computed by the fetch script and stored in the
  manifest (`fragments`). Ten fixed words weren't enough for Jan Pieterszoon
  Coen ("He was long considered a national hero in the Netherlands" appears
  twice).
- The fetch script skips pages already saved at the same revision
  (`--refresh` to force).
- Long passages stay as they are (owner, 2026-10-09); revisit if beta
  readers say they're too long.
- Size: recompress images rather than drop or placeholder far-away ones
  (owner: greying out images would spoil going deeper). `sharp` approved as
  a dev dependency for this.
- Images: WebP quality 70 (dry run: q60 22→20 MB but softer, q80 27.5 MB);
  card images resized to 480 px wide (twice their largest on-screen size);
  animated GIFs stay animated; SVGs untouched. scripts/images.mjs is shared
  by the fetch script (new downloads) and scripts/compress-images.mjs
  (existing files, safe to re-run). Checked at 3x phone resolution.
- Image URLs: holes/snapshots/images is Vite's publicDir, so an image at
  holes/snapshots/images/pages/Coffee/x.webp is served at /pages/Coffee/x.webp.
  Hole files and snapshots keep the "snapshots/images/…" paths; holesAsset()
  maps them. Chosen over a custom copy plugin, which needed @types/node (a
  new dependency).
- The rope is string, not a rod: it resists stretching only. A two-sided
  constraint made the slack zigzag. Spans that are taut are drawn straight,
  and a span whose ends jump > 140px is reset, to stop leftover loops after a
  pull.

## Known issues
- Knots whose passage has no link to the next page (thread leaves from the
  passage's end): coffee-insurance 2 (coffeehouse link is in the Venice 1647
  paragraph), sandwich-hawaii 1 (Earl's link is outside the passage),
  sandwich-copper-bottomed 1 ("copper sheath" link is outside the passage),
  coffee-haiti 2 (next page is Coffee; passage links Saint-Domingue).
  Same-page continuations have no link by nature. PLAN step 1's rule
  "onwardLinkText on every knot except the last" fails for all four holes.
- sandwich-copper-bottomed knot 3 used to leave via the "Lloyd's of London"
  link, but its end card is Copper-bottomed (Copper sheathing), so it now
  leaves from the passage's end.
- Copper sheathing "By 1781" sentence has no full stop on Wikipedia; the
  passage matches that exactly.
- Copper hole knot 3 hatnote has an added line ("Wikipedia still wants a
  source for this one") — owner to confirm.
- Haitian Revolution lead image (on the home card) is a massacre engraving.
- Coffee → Haiti knot 3 loops back to the Coffee article (library note).
- Counting knot pages only, every hole touches 2 distinct pages, not 3;
  Sandwich → Copper-bottomed touches 2 even counting its end card. Needs an
  owner decision (does the end card count?). Test is `todo` until then.
- Re-fetching pinned revisions gives slightly different markup (Parsoid
  output changes, e.g. data-mw-wikitext attributes); text is identical.
- With the stack buttons gone, nothing on home tells a first-time reader
  to swipe (the spec has no hint). Owner to decide whether a hint is wanted.
- On a phone the home card now stretches to fill the screen, so the thread
  between the infoboxes hangs very long; a max card height would tighten it.
- Claims, hatnotes, payoffs and caveats for the 20 reading-copy holes are
  Claude's drafts; owner to review.
- Reading-copy passages are whole paragraphs (often 150–250 words) and many
  onward links sit mid-paragraph, so the thread crosses the rest of the
  passage on its way to the knot. Kept as-is for beta feedback (owner).
- Size: images 22 MB (step 17); entry script 178 KB gzipped (step 18);
  each article loads as its own chunk when opened.
  The original 53 MB of images is still in git history (commit 393d6e7);
  shrinking the repo itself would mean rewriting history (owner decision;
  nothing has been pushed yet).
- Some Commons credits read oddly (e.g. "Unknown authorUnknown a…") because
  the Artist metadata is messy; Sogdian language has no lead image.
- On the ending, [1–N] can wrap onto its own line under the claim.
- import-holes.mjs used to miss entry 100 (three-digit number); fixed.
- iOS haptics use the iOS 18 switch-control workaround; untested on a device.

## Session log
- 2026-10-08: Built the full prototype (all of the flow) in one pass, React +
  TypeScript; content pipeline verified 13 knots against live Wikipedia.
- 2026-10-09: Recorded the prototype in this plan; added Vitest + Playwright
  (12); holes in /holes with the spec schema and data tests (13); spec fixes
  14a–h (bundled images, grey [citation needed], knot-only pull, left arrow,
  laptop layout, motion, extras removed, Go deeper). Found and fixed: image
  files named from URL query strings. Next: owner decisions, then step 15.
- 2026-10-09 (later): Imported reading-copy holes 1–20 (step 16): 80 knots
  verified against pinned revisions, drafts written for claims/hatnotes,
  every hole played end to end. Then step 17 (images to WebP, 52.8 → 22.0
  MB, none removed) and step 18 (entry script 781 → 178 KB gzipped). Next:
  owner review of drafts and decisions, step 15.
