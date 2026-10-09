# Plan

Work one step at a time. Mark a step [x] only when it works, the tests pass,
and it has been committed. Update this file at the end of every session.

`[~]` = built in the prototype commit (8a5b2ab) and checked by hand in the
browser, but not yet covered by tests. It becomes [x] once tests cover it.

## Steps
- [x] 0. Setup: git init, Vite, Vitest, Playwright, screenshot script.
        Built with React + TypeScript + framer-motion instead of vanilla JS
        (see Decisions). Test tooling added in step 12.
- [~] 1. Hole data: coffee-insurance is in src/content/holes.json (old schema).
        Not yet in /holes, no data test.
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
- [~] 10. All four library holes converted (old schema, single file).
- [~] 11. Verbatim check script: scripts/fetch-content.mjs fetches each article
         at a pinned revision, cleans it, saves HTML + lead image + Commons
         credit, and fails if a passage or onward link is missing. Run manually.
- [x] 12. Test harness: Vitest (tests/unit), Playwright (tests/e2e, phone
         390×844 + laptop 1280×800), `npm test`, `npm run test:e2e`,
         `npm run shot`, screenshots/ ignored. Unit tests for the rope and
         passage matching; e2e tests for home, enter, knot pull, short drag.
- [ ] 13. Holes in /holes, one file per hole, spec schema. Data tests.
         Fetch script reads /holes. (Completes steps 1, 10 and 11.)
- [ ] 14. Spec fixes: bundle article images, no runtime Wikimedia requests
         (item 8); grey [citation needed]; pull only from the knot; left arrow =
         back; laptop works; motion only for thread/blur/tumble/end card; remove
         extras (Did you know, recall, See also, stack buttons); Go deeper opens
         the passage. Playwright tests for each.

## Current step
13

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
- Coffee knot 2: the "coffeehouse" link is not in the Mocha passage (it's in
  the Venice 1647 paragraph), so the thread leaves from the passage's end.
- Copper sheathing "By 1781" sentence has no full stop on Wikipedia; the
  passage matches that exactly.
- Copper hole knot 3 hatnote has an added line ("Wikipedia still wants a
  source for this one") — owner to confirm.
- Haitian Revolution lead image (on the home card) is a massacre engraving.
- Coffee → Haiti knot 3 loops back to the Coffee article (library note).
- Counting knot pages only, every hole touches 2 distinct pages, not 3;
  Sandwich → Copper-bottomed touches 2 even counting its end card. Needs an
  owner decision.
- iOS haptics use the iOS 18 switch-control workaround; untested on a device.

## Session log
- 2026-10-08: Built the full prototype (all of the flow) in one pass, React +
  TypeScript; content pipeline verified 13 knots against live Wikipedia.
- 2026-10-09: Read CLAUDE.md/SPEC.md/PLAN.md; recorded the prototype in this
  plan; next: test harness (12), /holes schema (13), spec fixes (14).
