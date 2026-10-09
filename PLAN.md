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
- [~] 4. Knot pull: knot handle at the bottom; drag up advances; click knot and
        down arrow also advance. Pull also fires from tapping the onward link
        (spec says knot only — to fix, step 14).
- [~] 5. Thread: Verlet rope (src/lib/rope.ts). Runs down the left margin into
        the hatnote, hidden behind the passage, out of the onward link to the
        knot. Sags, goes taut while pulling, springs back.
- [~] 6. Progress knots in the top bar: purple visited, ring current, grey ahead.
- [~] 7. Ending: end card swings in, purple thread through numbered knots,
        [citation needed] → [1–N], references list, Go deeper / Next hole /
        Keep it, shelf in localStorage. Has extras to remove (step 14).
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
- [ ] 14. Spec fixes, one commit each, each with a Playwright or data test:
  - [x] 14a. Article images bundled in holes/snapshots/images/pages; no
             requests to Wikipedia/Wikimedia while reading (item 8).
  - [x] 14b. [citation needed] is grey on cards and the ending (item 11).
  - [ ] 14c. Pull only from the knot: tapping the onward link no longer pulls (item 12).
  - [ ] 14d. Left arrow = back on laptop (item 13).
  - [ ] 14e. Laptop layout checked and fixed: margin thread follows the text column (item 14).
  - [ ] 14f. Motion only for thread, focus blur, tumble and the end card's swing (item 15).
  - [ ] 14g. Remove extras: Did you know, See also, stack buttons (item 16; recall went in step 13).
  - [ ] 14h. Go deeper opens real Wikipedia at the passage (item 17).

## Current step
14c

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
- Laptop: the margin thread runs at the window's left edge, far from the
  centred text column (fix in step 14).
- Re-fetching pinned revisions gives slightly different markup (Parsoid
  output changes, e.g. data-mw-wikitext attributes); text is identical.
- iOS haptics use the iOS 18 switch-control workaround; untested on a device.

## Session log
- 2026-10-08: Built the full prototype (all of the flow) in one pass, React +
  TypeScript; content pipeline verified 13 knots against live Wikipedia.
- 2026-10-09: Read CLAUDE.md/SPEC.md/PLAN.md; recorded the prototype in this
  plan; added test harness (12) and moved holes to /holes in the spec schema (13);
  next: spec fixes (14).
