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
        (tests/unit/holes.test.ts), including the content rules (step 19).
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
- [x] 19. Content rules as data tests, replacing the 8 todos (owner
         decisions 2026-10-09): every hole touches 3+ distinct pages counting
         start and end cards; every knot except the last has an onward link
         inside its passage when the next knot is on a different page.
- [x] 20. Bring the original four holes up to those rules. Committed with 19
         (19's tests fail without 20's content):
         coffee-insurance knot 2 → the Istanbul/Venice coffeehouse paragraph
         (Mocha passage had no Coffeehouse link); sandwich-hawaii knot 1 and
         copper knot 1 start one sentence earlier, where the link is;
         copper's end card → Lloyd's of London (third page); coffee-haiti →
         Coffee → de Clieu → Saint-Domingue ×2 → Haitian Revolution.
         Three committed e2e expectations updated to the new coffee knot 2
         (hatnote, its reference link, "about 4 min") with owner approval.
- [x] 21. Swipe hint on home in a handwriting font: "← not now · swipe right
         to go in →" in Caveat 500 (src/assets/fonts, OFL licence alongside),
         shown until the reader's first swipe (rh.swipes in localStorage).
         SPEC.md notes the exception. Test: tests/e2e/swipe-hint.spec.ts
         (font loaded from the app, no Google Fonts requests, hides after a
         swipe and after reload).
- UI polish from the owner's first real use (2026-10-10), in the order
  they'll be done:
- [x] 22. "Pull the thread" label next to the knot in the handwriting font
         (Caveat), still in its white tab.
- [x] 23. Always show which Wikipedia page you're on: page name in the top
         bar, updating on every pull (forward or back).
- [x] 24. Stack order shuffled on every visit, holes you haven't opened yet
         first; the shelf keeps the ones you liked. src/lib/order.ts
         (unit-tested); "opened" = swiped in or finished. ?hole=<id> puts a
         hole on top (for sharing one, and for tests). The old saved order
         (rh.order) is no longer read. 17 browser tests now open
         /?hole=coffee-insurance instead of / (owner approved each file).
- [x] 25. Go backwards with the same knot: drag it up = next page, drag it
         down = previous page, at every knot and from the ending (the knot
         stays on the ending so you can pull back up). Drag down 24 px (or a
         downward flick) goes back; the pages follow the finger at 4x because
         the knot sits at the bottom edge. On knot 1 it returns to the stack
         (like ←). On the ending the knot keeps a short thread tail, a white
         strip, and "Pull down to go back ↓"; tapping it there also goes
         back. Tests: tests/e2e/pull-back.spec.ts.
- [x] 26. Ending shows the whole journey: every page you passed through on
         the thread, named (with its picture where there is one), not just
         numbers between the start and end cards. Vertical journey: start
         card, one row per knot (page picture, page name, section, opens
         Wikipedia at the passage), end card; the thread runs down a left
         gutter through every stop. Test: tests/e2e/journey.spec.ts.
- [x] 27. Smoother swipe-in: the card mustn't spring back to centre (it looks
         like the swipe failed); the start card should carry straight on into
         the Wikipedia page without the screen going blurry first. Frames
         showed ~0.5 s of the card sitting re-centred, then a full-screen
         blur while scrolling. Now: the tumble starts on release from where
         the card is (0.55 s ease-out tween, was a spring); the page scrolls
         to the passage sharp ("is-landing") and the blur fades in on
         arrival. Test: tests/e2e/swipe-in.spec.ts.
- [x] 28. Keep the shelf: saved on the device and protected from browser
         clean-up, plus optional sign-in by emailed link (Supabase) so it
         follows you across devices. Changes SPEC.md's "no backend, no
         accounts" rule (owner-approved). Done: keep() asks the browser to
         persist storage; Supabase project rabbit-holes (ap-south-1, $0/mo,
         org jyotsna-varkey) with one table, public.shelves (RLS: own row
         only; advisors clean). src/lib/cloud.ts loads @supabase/supabase-js
         2.117.2 on demand (own 59 KB chunk), so non-signed-in readers never
         fetch it or contact Supabase. Sign-in form on the shelf; link returns
         to /?shelf. Sync: first sign-in on a device merges (union, earliest
         date); later opens take the account's shelf; keep/remove pushes.
         Tests: tests/unit/shelf-sync.test.ts, tests/e2e/shelf-cloud.spec.ts
         (sign-in request mocked; no real email sent in tests).
- [x] Redeployed steps 22–28 to Vercel (2026-10-10); live build matches local.
- [x] Redeployed steps 31–32 to Vercel (2026-10-11); the 28 sprint
       browser tests pass against the live site.
- [x] 33. The thread, done properly (owner, 2026-10-11: "the main issue
         right now"), on phone and laptop. Found by reproducing at laptop
         size: (a) a back tug on page 1 slid the page 4x the finger into
         nothing → blank white screen with a purple line; (b) a slow pull
         had to travel ~26% of the screen (~180 px) or it sprang back; (c)
         the move was a 0.7 s spring and the page name / knots only updated
         after it; (d) trackpad scroll over the knot did nothing; (e) a long
         diagonal thread across the text mid-move. Owner decisions: up =
         next, down = back (unchanged); back tug on page 1 = small bounce,
         nothing else (X / Esc / ← still leave); any ~15 px tug or a tap
         moves on at once, no need to let go. Approved test changes:
         hole.spec "a short drag springs back" → "a short tug goes to the
         next page"; pull-back.spec "down on the first page goes back to
         the stack" → "…just bounces".
         Done: a 14 px tug (or a tap) moves at once, before you let go;
         name, knots and thread switch at the start; pages slide in 0.32 s
         ease-out (was a ~0.7 s spring) and land by ~0.15 s visually; a tug
         mid-move retargets, so quick tugs each go one page; until 14 px the
         pages give at half speed, toward nothing only a stiff 18 px; the
         knot stays at the bottom edge instead of riding the pages (that
         caused the long diagonal); a mouse moving without a pressed button
         never pulls; wheel/trackpad over the knot scrolls the page.
         Tests: tests/e2e/thread-tug.spec.ts (5 × phone/laptop), plus the
         two replaced tests. Touch checked with real touch events in iPhone
         emulation: each tug one page within 80 ms; finger scroll on the
         text scrolls, never pulls.
- [ ] 29. Owner: in Supabase → Authentication → URL Configuration, set the
         Site URL and allowed redirect URLs (see Known issues). Then a real
         sign-in test on a phone.
- [ ] 30. Custom email sender (e.g. Resend SMTP) so beta readers get sign-in
         links: Supabase's built-in sender only mails members of the
         Supabase organisation, a few per hour.
- UI sprint (owner's second list, 2026-10-10). Design must feel smooth
  and seamless. Already done last session: page name always shown (step
  23), go backwards with the knot at every point incl. the ending (25),
  smooth swipe-in (27), whole journey with names and pictures on the
  ending (26). New:
- [x] 31. Swipe hint always visible on the stack (owner answered the open
         decision: "always show"). SPEC.md updated; the rh.swipes check is
         gone (the swipe log itself stays, it feeds stack order). Test:
         swipe-hint.spec.ts "still there after a swipe and after a reload"
         (replaces "goes away after the first swipe", owner-approved).
- [x] 32. Stack order kept for the session: shuffled once per visit, then
         the same order on refresh (including cards sent to the back and
         "Next hole"). A new tab / reopened browser gets a fresh shuffle.
         Saved in sessionStorage (rh.session-order); stackOrder() keeps a
         saved order, drops unknown ids, appends new holes; ?hole= still goes
         on top. Tests: order.test.ts (3 new), stack-order.spec.ts "refresh
         keeps the same order"; the "opened hole goes behind" test now uses
         fresh tabs instead of reloads (owner-approved).
- [ ] 15. Cover the remaining [~] steps with tests: swipe left sends the card
         to the back (8); "Back to the thread" re-centres and blur returns (3);
         progress knot colours (6); the tumble lands on the first passage (9).

## Current step
33 done and live. Owner to try the thread on a real phone and laptop. Then 29 (owner sets Supabase URLs), then 15. Open owner decisions are listed
under "Handover" below.

## Handover (for a new session)
- Live: https://rabbit-holes-gules.vercel.app (Vercel project rabbit-holes,
  team "Jyotsna Varkey's projects"). Republish: `npx vercel@48 deploy --prod`
  (CLI is logged in on this Mac). Check live: `BASE_URL=… npm run test:e2e
  -- --workers=1`.
- Local: `npm run dev -- --host` (phone: http://192.168.0.2:5173).
  Tests: `npm test` (500 unit/data), `npm run test:e2e` (98 browser).
- Content: 24 holes in holes/*.json; import more from "Rabbit Holes — Reading
  Copy.txt" with `node scripts/import-holes.mjs "<txt>" 21-40`, then
  `node scripts/fetch-content.mjs`, then write claim/hatnotes/payoff.
- Supabase: project rabbit-holes, id zqrfcmdhbdatrjooipif, org
  jyotsna-varkey, table public.shelves (RLS). Publishable key is in
  src/lib/cloud.ts (public by design).
- Git: no remote; history was rewritten on 2026-10-10. Backup bundle
  ../rabbit_holes-backup-2026-10-10.bundle can be deleted once happy.
- Waiting on the owner:
  1. Supabase → Authentication → URL Configuration (step 29; values in
     Known issues).
  2. Review Claude's drafted claims, hatnotes and payoffs for the 20
     reading-copy holes and the rewritten original four.
  3. Whether to set up an email sender for beta readers' sign-in (step 30).

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
- Content rules (owner, 2026-10-09): the end card counts toward "3+
  distinct pages"; "onward link on every knot except the last" applies only
  when the next knot is on a different page.
- Swipe hint (owner, 2026-10-09): yes, handwritten, Caveat font, saved in the
  project (no runtime font requests); SPEC.md gets a note that it's the one
  exception to "Wikipedia's own visual vocabulary".
- Git history rewritten (owner, 2026-10-10, before anything was pushed):
  every image under holes/snapshots/images and public/content/images that
  isn't WebP or SVG was removed from all commits (1,405 old JPG/PNG/GIF,
  plus step 14a's extension-less files). All commit IDs changed; commits
  before step 17 no longer contain their images. .git 87 MB → 25 MB.
  Backup: ../rabbit_holes-backup-2026-10-10.bundle (delete when happy).
- Hosting: Vercel, project rabbit-holes in "Jyotsna Varkey's projects",
  public production link https://rabbit-holes-gules.vercel.app (owner,
  2026-10-10). rabbit-holes.vercel.app was already taken by someone else's
  site. The team alias and per-deployment URLs need a Vercel login (default
  protection). Deployed with the Vercel CLI (the Vercel connection here
  can't create projects): `npx vercel@48 deploy --prod`. .vercelignore keeps
  screenshots, tests and the reading copy out of the upload. Check a deploy
  with `BASE_URL=https://rabbit-holes-gules.vercel.app npm run test:e2e`.
- Owner decisions 2026-10-10: shelf = device by default + optional email
  sign-in (option C); going back = the same knot dragged down; the pull
  label switches to Caveat.
- The shelf already lived in the browser (localStorage), but each web
  address has its own storage: the Wi-Fi dev link and the Vercel site keep
  separate shelves, and private tabs / Safari's 7-day clean-up wipe it.
- Stack order "per visit" = per browser tab session (sessionStorage), so a
  refresh keeps it and a new tab reshuffles (owner, 2026-10-10).
- The thread (owner, 2026-10-11): up = next, down = back; a small tug
  goes at once; on page 1 a back tug only bounces (← / Esc still leave).
  Tried before: pages following the finger (4x when going back) with a
  26%-of-screen threshold; it read as lag, springs back, and slid page 1
  into a blank screen.
- Current page name sits centred in the top bar above the progress knots
  (serif, like a Wikipedia title; long names get an ellipsis); on the ending
  it reads "The whole thread".
- The rope is string, not a rod: it resists stretching only. A two-sided
  constraint made the slack zigzag. Spans that are taut are drawn straight,
  and a span whose ends jump > 140px is reset, to stop leftover loops after a
  pull.

## Known issues
- Copper sheathing "By 1781" sentence has no full stop on Wikipedia; the
  passage matches that exactly.
- coffee-haiti no longer includes the Coffee page's sentence that
  plantation conditions "were a factor in the Haitian Revolution": it can't
  be reached by a link (Saint-Domingue doesn't link to Coffee).
- coffee-insurance lost its Mocha knot to the coffeehouse paragraph; a
  5-knot version (Mocha back as knot 2) is possible if wanted.
- Copper hole knot 3 hatnote has an added line ("Wikipedia still wants a
  source for this one") — owner to confirm.
- Haitian Revolution lead image (on the home card) is a massacre engraving.
- Re-fetching pinned revisions gives slightly different markup (Parsoid
  output changes, e.g. data-mw-wikitext attributes); text is identical.
- On a phone the home card now stretches to fill the screen, so the thread
  between the infoboxes hangs very long; a max card height would tighten it.
- Claims, hatnotes, payoffs and caveats for the 20 reading-copy holes are
  Claude's drafts; owner to review.
- Reading-copy passages are whole paragraphs (often 150–250 words) and many
  onward links sit mid-paragraph, so the thread crosses the rest of the
  passage on its way to the knot. Kept as-is for beta feedback (owner).
- Size: images 22 MB (step 17); entry script 178 KB gzipped (step 18);
  each article loads as its own chunk when opened.
- Some Commons credits read oddly (e.g. "Unknown authorUnknown a…") because
  the Artist metadata is messy; Sogdian language has no lead image.
- On the ending, [1–N] can wrap onto its own line under the claim.
- On the journey the ending's thread is drawn straight (a vertical rope with
  slack bunches up), so it no longer sags like the clothesline did.
- import-holes.mjs used to miss entry 100 (three-digit number); fixed.
- On a cold deploy the first visits can be slow enough to hit the 30 s test
  timeout (4 hole tests did once; the rerun passed all 60).
- Sign-in links need Supabase's URL settings: Site URL
  https://rabbit-holes-gules.vercel.app; redirect URLs
  https://rabbit-holes-gules.vercel.app/**, http://localhost:5173/**,
  http://192.168.0.2:5173/**. Until then links point at localhost:3000.
- Supabase's built-in email only reaches members of the owner's Supabase
  organisation and is rate-limited (a few per hour): fine for the owner,
  not for beta readers (step 30).
- Free Supabase projects pause after about a week without activity; sign-in
  and sync stop until it's resumed in the dashboard. The device shelf keeps
  working.
- Under heavy parallel load the journey test once hit its timeout at laptop
  size; it passes alone and in the next full run.
- Against the live site, the swipe-in timing tests fail when many tests load
  the site in parallel (network, not the app): 4/4 pass three runs in a row
  with --workers=1, which the README now uses for live checks.
- Caveat's Latin file has no ← → glyphs, so the hint's arrows use the
  system font.
- Mid-move the rope can show a small hook by the onward link for a frame
  or two (rope settling). Thread moves not yet tried on a real iPhone /
  Safari; checked in Chrome with emulated touch.
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
- 2026-10-09 (later): Owner decided the content rules; steps 19–20 turn them
  into tests and fix the original four holes; step 21 adds the handwritten
  swipe hint. Next: step 15, and owner review of the drafted hatnotes.
- 2026-10-10: Rewrote git history to drop old raster images (.git 87 → 25 MB,
  backup bundle kept); deployed to Vercel at rabbit-holes-gules.vercel.app;
  all 60 browser tests pass against it.
- 2026-10-10 (later): Owner's UI notes became steps 22–28, all done: pull
  label in Caveat, page name in the top bar, shuffled stack (?hole= links),
  knot goes both ways, journey on the ending, smooth swipe-in, shelf kept on
  device + optional email sign-in (Supabase). Next: owner sets Supabase URLs
  (29), redeploy, then 30 and 15. Redeployed; 85/86 live tests passed in
  parallel, and the remaining swipe-in tests pass 3/3 run one at a time.
  Owner asked why the swipe hint was missing: it hides after the first
  swipe by design (confirmed working on live for first-time visitors);
  owner to choose whether to change that. Handover section added.
- 2026-10-10 (later): Owner's second UI list: items 1, 3, 4, 5 were already
  steps 23, 25, 27, 26 (their 14 browser tests re-run, all pass). New:
  step 31 (swipe hint always shown) and 32 (stack order kept through
  refresh). 500 unit + 88 browser tests pass. Redeployed 2026-10-11;
  28 sprint tests pass live.
- 2026-10-11: Owner: the thread is the main issue (blank screen, doesn't
  go all the way, lag, laptop glitches). Reproduced each, step 33 rebuilt
  the tug: small tug moves at once, quick slide, no blank screen, wheel
  over the knot scrolls. 500 unit + 98 browser tests pass. Redeployed;
  44 thread/stack tests pass against the live site.
