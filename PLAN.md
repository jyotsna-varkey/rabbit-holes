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
- [x] 34. Thread always taut while reading (owner, 2026-10-11: prefers the
         taut look; some spans looked slack / stretched). Every span of the
         reading thread is now a straight line (slack 1.0; was 1.035 at rest,
         sagging up to ~55 px). SPEC.md notes it. The home card's thread
         still hangs between the two infoboxes. Test: tests/e2e/taut.spec.ts.
- [x] 35. Ending journey on a diagonal again: start card top-left down to
         the end card bottom-right, the middle pages stepping along the
         diagonal between them (owner liked the old clothesline placement;
         keep every page named with its picture). Done: one straight, taut
         thread from the start card's bottom middle to the end card's top
         middle; each page's picture is a round bead on it (the knot; its
         ring turns purple in turn), placed by Ending.tsx where the line is
         at that row's height; names sit beside the bead on the side away
         from the line (right in the top half, left in the bottom half), so
         the thread never crosses text. Taller rows on laptop keep the line
         steep enough. Test: journey.spec "one straight diagonal".
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
- [x] 36. New content (owner, 2026-10-21): 132 holes. Deleted the original
         four (coffee-insurance, sandwich-hawaii, coffee-haiti,
         sandwich-copper-bottomed); kept the 20 reading-copy holes; added the
         100 from the Claude library (~/Documents/rabbit_hole_library, ranked by
         four judges) and the 12 GPT studio holes whose pages are joined by
         real links (the other 88 aren't: owner chose to leave them out). All
         snapshotted and verified by fetch-content.mjs. Hole text now loads on
         demand: the stack gets each hole's card (claim, ends, knot and word
         counts) from a Vite transform (holes/<id>.json?card) and a slim
         manifest (manifest.json?card: credits + non-default URLs); a hole's
         passages and the full manifest load when it opens, warmed for the top
         card. Entry script back under the 250 KB test. Image budget test
         raised 25 → 90 MB (owner-approved, until the weed-out). Browser tests
         that used coffee-insurance now use tutankhamun-noblecourt-amada-rails
         (owner-approved; same checks, new content). Review sheet for the
         owner: HOLES_REVIEW.md, holes-review.csv.
- [x] 37. Seen holes stay at the back (owner, 2026-10-22): nothing leaves
         the stack, but a hole swiped left, swiped into or finished goes behind
         every unseen hole on this device for good, the most recent last. Kept
         in localStorage rh.back (one timestamp per hole, no cap; older
         rh.swipes and rh.finished still count). Unseen holes are still
         shuffled per visit. Tests: order.test.ts (2 new), stack-order.spec.ts
         "holes swiped left or opened stay at the back…".
- [x] 38. Owner's content pass (2026-10-22): from the owner's notes on the
         first 16 holes, four reviewers rated all 379 for darkness,
         connection and balance. 51 cut as too dark (18 were in the app,
         now deleted; list in holes-cut-dark.csv). 115 loose, broken or
         lopsided holes salvaged on the same pages (re-cut passages, dropped
         filler, new hooks, bridges, payoffs; every passage re-verified),
         29 of them in the app. 55 recommended cuts (unsalvageable or
         duplicates) left in the sheet for the owner. App: 114 holes.
         holes-review.csv regenerated with verdict and what-changed columns.
- [x] 39. Owner's second content pass (2026-10-24): notes on rows 17–56
         (abrupt endings, one-fact holes, lingering pages, weak hooks)
         became five rules (review/REFINE.md in the library); 183 of 273
         holes refined and re-verified, 80 of them in the app. Two judges
         gated the 162 refined holes not in the app against 20 owner-approved
         anchors: 104 added, 49 fixed and re-judged (24 more added). App now
         242 holes. Fetch script: requests moved to scripts/http.mjs, which
         also retries dropped connections (the run kept crashing on
         ETIMEDOUT); test tests/unit/http.test.ts. Article images re-encoded
         at WebP quality 60 (owner: shrink a little and raise the budget):
         133.9 → 122.2 MB; image budget test 90 → 140 MB. Bundle size test
         now builds in production mode (it measured React's development
         build under the test runner); real entry 227 KB, budget unchanged.
- [x] 40. Hosting moved to GitHub Pages (owner, 2026-10-27): public repo
         https://github.com/jyotsna-varkey/rabbit-holes; every push to main
         builds with --base=/rabbit-holes/ and deploys
         (.github/workflows/pages.yml). Live:
         https://jyotsna-varkey.github.io/rabbit-holes/ (steps 36–40). The
         emailed sign-in link now returns to the app's base path
         (signInRedirect, tested). Checked live: cards, a hole and its
         article images load with no errors.
- [x] 41. Scrolling is the pull (owner, 2026-10-28). The knot handle goes:
         the reader scrolls through the passage and keeps scrolling past
         its end to pull the thread (pull-to-refresh style): the thread
         tightens from the onward link, the page resists, let go past the
         point → snap to the next page; short → drops back. Scrolling up
         past the passage's start pulls back to the previous page.
         Tactile thread: slack at rest, tightens, brightens and thickens as
         you pull, trembles near the snap, haptic ticks; on the snap one
         crisp buzz, recoil with overshoot, the new link "catches" it.
         The blur is the way out: tap the blurred text to read the whole
         article (blur lifts from the tap; scrolling no longer pulls; the
         thread hangs slack from the onward link). Tap the passage or the
         hanging thread to come back. Blur lighter near the passage.
         No new notes. Replaces "Back to the thread" and the knot handle;
         SPEC core experience 3–4 change. The 2026-10-27 reel-in work is
         parked on branch thread-reel (commit fab41673).
         Done: src/lib/edgePull.ts (touch + wheel, only a gesture that
         starts at the edge pulls; snap at 72 px of finger / 110 px of
         wheel, without letting go); ArticlePage folds the article under
         the passage (.page-inner height), dissolves the blur over 180 px
         of upward scroll, taps on the blur reveal from the tap point, taps
         on the passage come back; HoleView: no knot handle, thread runs
         link → next page's hatnote with a small knot at the link, tension
         drives thickness/colour/tremble, haptic ticks at 1/3 and 2/3,
         recoil + knot pop after a snap, loose hanging end (Rope.stepHanging)
         with a tap target; visited knots in the top bar go back; the
         ending pulls back by scrolling up past its top; first-time
         readers get one demo tug after the passage lands (rh.pulled).
         Found while testing: the wheel "gesture ended" timer was shorter
         than the gap that starts a new gesture, so a slow trackpad or a
         notched mouse cancelled pulls mid-way (fixed, both 260 ms); the
         resting slack sagged 30–60 px over the long span (1.012 → 1.0001);
         moving on (↓ or a top-bar knot) during the first-time demo tug
         left the screen on the old page, because the tug kept setting the
         position (found by the every-hole test; now any move stops it).
         Tests: tests/e2e/scroll-pull.spec.ts (15), rope.test (hanging).
         Owner-approved test changes: pullKnot helper now scrolls past the
         passage (negative = top-bar knot back); removed pull-back.spec,
         thread-tug.spec, and the knot-click / short-tug / pull-label
         tests; taut.spec → "slight give at rest, straight while pulling".
         Page you're on carries aria-current="page".
- [x] 42. Scrolling always moves between pages (owner, 2026-10-28, after
         trying 41 on a laptop: scrolling "hit a wall", scrolling up fell
         into the article with no clear way back). On the thread, any
         scroll (wheel, trackpad, swipe) goes down = next page, up =
         previous page, from anywhere, no wall; the article itself doesn't
         scroll (a passage taller than the screen scrolls first). Only a
         click/tap on the blur opens the article. Reading the article, the
         thread runs down to a knot docked at the bottom, gently pulsing:
         click it (or the passage, or Esc) to go back. Same on phone. Push
         to GitHub when green (owner asked).
         Done: src/lib/threadScroll.ts replaces edgePull on pages (every
         gesture: first scrolls a tall passage within its range, the rest
         is the pull, signed; overflow hidden + touch-action none on the
         thread). edgePull (ending) now starts a pull mid-gesture when the
         scroll reaches the top. Docked knot (.thread-dock) with a breathing
         ring replaces the loose end; ↑ = previous page; Esc from the
         article = back to the thread. Fold wrapper and scroll-up dissolve
         removed. Found and fixed: coming back to the first page rebuilt it
         and it waited for a first-arrival glide that never came, so it
         opened at the top of the article, off the thread (likely what the
         owner hit). Tests: scroll-pull.spec (16), 4 owner-approved
         replacements + 2 new (first-page return, Esc).
- Thread rebuild from the approved preview (owner, 2026-10-28; preview at
  https://claude.ai/artifact/Nf8VdcwCitcUN65egT2gR6, source
  mockups/thread-preview.html, based on the owner's "D2 spine, one pin per
  passage" exploration). Only the thread and its animations change;
  everything else (Wikipedia look, stack, ending layout, blur) stays.
- [x] 43. Margin thread: D2 rope physics (Verlet, slight slack, thins and
         glints when taut) held inside the left margin so it never crosses
         text; picture beads (current larger, previous and next smaller,
         slight zigzag; none before the first, a loose tail after the last;
         previous/next rest at the screen edges until their passage is on
         screen). Reading the article: thread runs to the docked knot,
         now at the bottom left. Phone margin widens to 46 px.
- [x] 44. Gestures and motion: swipe/drag up (or flick), scroll down, tap
         the passage, hold (ratchet reel with speeding haptic ticks) all
         move on; swipe down / scroll up go back; resistance and a ready
         buzz; pages glide on a spring carrying the gesture's speed. Nudges:
         the thread tugs up every few seconds until the first pull; the
         stack card leans right then left until the first swipe. Stack →
         hole: the whole card grows into the page on one spring (uniform
         scale + clip, carries the swipe's speed), no pause.
- [x] 45. The fall: on reaching the ending, the beads drop from the margin
         into the diagonal journey, the thread following them.
         Done (43–45, one commit): src/lib/marginRope.ts (Verlet rope kept in
         the margin band, loose tail for the last page; unit-tested);
         threadScroll.ts now pointer-based (drag, flick velocity, hold,
         wheel); HoleView pull model from the preview (resistance 200,
         READY 70, wheel 110, track follows 0.35, passage lifts 0.3, glide
         spring 150/17, gestures re-enabled 260 ms after a move while the
         glide finishes); beads show page pictures; dock at the bottom of
         the margin; stack nudge (Home) and whole-card spring entry with
         the swipe's speed, page settling onto the passage while it grows
         (resting position now measured from layout, not the scaled
         screen); Ending: beads fall from a margin column into the
         diagonal (CSS transitions on .end-knot, staggered), thread loose
         while falling. Phone article margin 46 px (not the ending).
         Found while testing: a held reel's lift-off click opened the next
         page's article (now swallowed on any page); the rope crashed the
         frame loop going from the last page's tail back to a full rope;
         the stack nudge snapped a swiped card back to centre; presses on
         links didn't pull; the tug was too faint (now a deliberate 40 px
         lift-and-release every ~4 s until the first pull).
         Owner-approved test updates: "thinner and tighter as you pull",
         "hangs loose at rest, straighter while you pull", "thread and
         beads stay in the margin". New: tests/unit/margin-rope.test.ts.
- [ ] 15. Cover the remaining [~] steps with tests: swipe left sends the card
         to the back (8); "Back to the thread" re-centres and blur returns (3);
         progress knot colours (6); the tumble lands on the first passage (9).

## Current step
43–45 done; deploy (owner asked), then owner feedback. Before:
41–42 done and pushed to GitHub (live). Owner tries them on phone and
laptop and gives feedback. 41 done (not pushed: pushing main republishes the site). Next:
owner tries it; possible step 42, the stack card's idle lean-right nudge
(idea 3, not built yet). Before that: 36–40 done and live on GitHub Pages. Owner reviews the 132 holes in holes-review.csv
(keep / edit / cut); then trim, tighten the image budget, redeploy. Still
open: 29 (owner sets Supabase URLs), then 15. Open owner decisions are listed
under "Handover" below.

## Handover (for a new session)
- Live: https://jyotsna-varkey.github.io/rabbit-holes/ (GitHub Pages; repo
  https://github.com/jyotsna-varkey/rabbit-holes, public). Republish: push
  to main. The old Vercel site (rabbit-holes-gules.vercel.app) still serves
  the 24-hole version; Vercel's free plan can't take this release (5,000
  file uploads a day). Check live: `BASE_URL=… npm run test:e2e
  -- --workers=1`.
- Local: `npm run dev -- --host` (phone: http://192.168.0.2:5173).
  Tests: `npm test` (4662 unit/data), `npm run test:e2e` (572 browser incl. 484 all-holes; phone-only ones skip on laptop).
- Content: 242 holes in holes/*.json (step 39); review sheet HOLES_REVIEW.md; import more from "Rabbit Holes — Reading
  Copy.txt" with `node scripts/import-holes.mjs "<txt>" 21-40`, then
  `node scripts/fetch-content.mjs`, then write claim/hatnotes/payoff.
- Supabase: project rabbit-holes, id zqrfcmdhbdatrjooipif, org
  jyotsna-varkey, table public.shelves (RLS). Publishable key is in
  src/lib/cloud.ts (public by design).
- Git: remote origin = GitHub (public); history was rewritten on 2026-10-10,
  before the first push. Backup bundle
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
- Scrolling is the pull (owner, 2026-10-28): replaces the knot handle.
  Going back = visited knots in the top bar, ←, or scrolling up past the
  top of the ending (scrolling up on a page reads the article instead).
  Tried before and parked: reel-in drag with a peek tab (branch
  thread-reel); knot handle (steps 25, 33).
- Current page name sits centred in the top bar above the progress knots
  (serif, like a Wikipedia title; long names get an ellipsis); on the ending
  it reads "The whole thread".
- The rope is string, not a rod: it resists stretching only. A two-sided
  constraint made the slack zigzag. Spans that are taut are drawn straight,
  and a span whose ends jump > 140px is reset, to stop leftover loops after a
  pull.

- Content swap (owner, 2026-10-21): GPT studio holes are imported only when
  every page jump is a real link inside the passage (12 of 100). Their hooks
  are GPT's (questions, not claims); hatnotes/payoffs drafted by Claude.
  Three needed a trailing paragraph dropped (the app's onward link must be in
  the last passage on a page) and one 270-word Bic Cristal "paragraph" was
  really three, now two single-paragraph knots.
- Passages must match the page as the app reads it: superscripts dropped
  ("km2" → "km"), interlanguage markers kept (" [ja]", " [ru]"), maths kept
  as its text. The passage string is only for matching, counts and links; the
  reader sees the snapshot.
- Hole text loads on demand (step 36) rather than raising the 250 KB entry
  budget (owner's choice). The card transform lives in vite.config.ts and
  needs no Node types (it works on the file text Vite passes in).

- Stack memory (owner, 2026-10-22): per device is enough; left swipes count
  as seen, same as opening; nothing is ever removed from the stack.

- Darkness (owner, 2026-10-22): no hole whose core is death, atrocity,
  disaster or gruesome detail (Ugolino, Fallen Astronaut, Fustat cut);
  history told lightly is fine (Bamboo, Taxi, Maize kept). Holes must be
  connected (not pages joined by coincidence) and balanced (no page takes
  over). Hole ids are kept when a salvage changed the start or end page
  (renaming would break saved shelves and links).

- Hole standards (owner, 2026-10-24): a real ending that answers the hook;
  a chain of connections, not one fact; no page with more than 2 passages;
  about 280–420 words; plain, compelling hooks. Holes join the app only
  after two judges rate them at least as good as holes the owner approved.
- Article images at WebP quality 60, card images at 70 (owner, 2026-10-24).

- Hosting (owner, 2026-10-27): GitHub Pages from a public repo, instead of
  Vercel, whose free plan caps uploads at 5,000 files a day.

## Known issues
- Supabase sign-in: add https://jyotsna-varkey.github.io/rabbit-holes/ to
  Authentication → URL Configuration (Site URL / Redirect URLs), or emailed
  links will be refused (owner, with step 29).
- Live browser tests (BASE_URL=…) assume the site is at a domain root; on
  GitHub Pages' /rabbit-holes/ they'd need a base-aware goto. Checked by a
  scripted run instead for step 40.
- GPT studio hooks are questions, so "[citation needed]" after them reads
  oddly; Ballpoint pen and Bic Cristal cards show the same photo.
- Overlapping trails (flagged in the review sheet): red-cactoblastis-cactorum
  vs cactus-moth-memorial-hall; umbrella-chimney-sweepers-act vs
  umbrella-chimney-sweep (and umbrella-thomas-coram); nutmeg-treaty-of-breda
  vs nutmeg-dutch-conquest-of-the-banda-islands.
- tea-wardian-case (667 words) and umbrella-chimney-sweepers-act (518) are
  long: GPT used whole paragraphs.
- Images 82 MB in the repo (budget 90 MB until the weed-out).
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
- The test suite is slow when the Mac is busy (the Claude app at 100%+
  CPU): 30–60 s per browser test, timeouts in data tests. Run browser
  tests with --workers=1 --timeout=60000 then; all-holes takes ~10 min.
- Live checks against GitHub Pages: the browser tests open "/?hole=…",
  which on https://jyotsna-varkey.github.io/rabbit-holes/ points at the
  domain root, so `BASE_URL=… npm run test:e2e` times out there. Step 42
  was checked live with a script instead (all flows pass). Fix: make the
  tests' paths relative ("./?hole=…") or add a goto helper.
- Scroll-pull on a real iPhone / Safari not tried yet (touch checked in
  Chrome with emulated touch events).
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
- 2026-10-11 (later): Owner happy with the thread. Step 34: reading thread
  always taut. Step 35: the ending's journey back on the diagonal (start
  top left → end bottom right), pages as picture beads on one straight
  thread. 500 unit + 102 browser tests pass. Redeployed; 20 live checks
  pass (2 laptop-only skipped at phone size).
- 2026-10-21: Step 36: 132 holes (100 Claude library + 12 linked GPT + 20 old;
  original four deleted), hole text loads on demand, review sheet written.
  2504 unit + 210 browser tests pass (all 132 holes played end to end).
  Not deployed. Next: owner's keep/edit/cut pass.
- 2026-10-22: Step 37: swiped-left and opened holes stay at the back for good
  (per device). 2506 unit + 212 browser tests pass. Not deployed.
- 2026-10-22: Step 38: owner's content pass applied (51 dark cut, 115 salvaged,
  55 recommended cuts). App 114 holes; 2164 unit + 190 browser tests pass.
  Not deployed. Next: owner reviews the new holes-review.csv.
- 2026-10-24: Step 39: second content pass; app 242 holes; fetch survives dropped
  connections; images shrunk a step. 4659 unit + 322 browser tests pass.
  Not deployed. Next: owner reviews holes-review.csv.
- 2026-10-27: Step 40: moved to GitHub Pages; pushed; steps 36–40 live at
  https://jyotsna-varkey.github.io/rabbit-holes/ (242 holes).
- 2026-10-28: Owner: the thread felt unintuitive. Step 41: scrolling is the
  pull, tactile thread, tap the blur to read the article. Old knot tests
  replaced with owner approval. 4662 unit/data tests, all browser specs,
  and all 242 holes end to end pass (machine was overloaded, so run with
  1–2 workers). Not pushed.
- 2026-10-28 (later): Owner tried 41 on a laptop: scrolling hit a wall and
  fell into the article with no way back. Step 42: every scroll moves
  between pages, only the blur opens the article, a docked knot brings you
  back; fixed the first-page rebuild bug. Pushed (owner asked).
- 2026-10-28 (later): Owner approved the thread preview (D2 physics in the
  margin, picture beads). Steps 43–45 built it into the app with the
  smooth entry, nudges and the fall into the journey; everything else
  unchanged.
