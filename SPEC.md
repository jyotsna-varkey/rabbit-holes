# Rabbit Holes — Spec

## What it is
A stack of hand-built Wikipedia rabbit holes. Each hole connects two familiar
things (e.g. Coffee → Insurance) across at least 3 Wikipedia pages. The user
swipes right on a card to enter, then pulls a thread through real Wikipedia
passages until the connection is proven.

One line: an outrageous claim, [citation needed]; pull the thread to prove it.

## Who it's for
Curious people who want a fun, light learning habit instead of doomscrolling.
Trivia, not homework. Never self-important.

## Core experience
1. Home: a Tinder-style stack of hole cards, next two cards peeking behind.
   Each card shows the claim with a grey [citation needed], two endpoint
   "infobox" cards (start and end), a sagging thread between them, and
   "N knots · about M min".
   - Swipe right: enter the hole.
   - Swipe left: "not now" — card goes to the back of the stack, not deleted.
2. Tumble: on swipe right, the whole card grows into the first Wikipedia page
   on one spring that carries the swipe's speed, settling onto the passage as
   it grows (owner, 2026-10-28: "smooth like butter").
   - Nudge: until a reader's first swipe, the top card leans right, then
     left, now and then, showing both ways.
3. Page: looks like real Wikipedia. Auto-scrolls once to the passage, then
   stops. Text above and below is softly blurred; the passage is sharp with a
   faint highlight. One bridge line sits above it, styled as a Wikipedia
   hatnote. The onward link keeps its thread-blue underline.
   - The thread (owner, 2026-10-28, from the approved "D2 spine" preview)
     runs down the left margin, never across text: a bead beside the passage
     shows this page's picture, smaller beads above and below show the
     previous and next pages' (they rest at the screen edges until their
     passage is on screen). No bead above the first passage; a loose tail
     below the last. The beads zigzag slightly.
   - The blur is the way out (owner, 2026-10-28): only a click or tap on the
     blurred text opens the whole article. Then the thread runs down the
     margin to a knot docked at the bottom, gently breathing: click it (or
     the passage, or press Esc) to come back. No note for this.
4. Pull (owner, 2026-10-28): on the thread, any of these moves on — drag or
   swipe up (or a quick flick), scroll down, tap the passage, or hold it
   (the thread reels in, ticks speeding up, then lands). Drag/swipe down or
   scroll up goes back. The pull meets growing resistance; past the point
   there's a buzz and letting go moves on; short of it, everything springs
   back. Pages glide on a spring carrying the gesture's speed. The article
   itself doesn't scroll on the thread (a passage taller than the screen
   scrolls first). On the first page, pulling back only gives a little.
   Reading the whole article never pulls. Also back: tap a visited knot in
   the top bar, or scroll up past the top of the ending.
5. Progress: small knots along the screen edge — visited purple, unvisited grey.
6. Ending: the beads fall from the margin, on their thread, into the
   diagonal journey (owner, 2026-10-28); the end card swings in, the thread
   locks, the claim changes from
   [citation needed] to [1–N], and a Wikipedia-style references list replays
   the hole one line per knot.
7. After the ending, three options only: Go deeper (open real Wikipedia at
   that passage), Next hole, Keep it (save to shelf).

## Design language
- Everything is Wikipedia's own visual vocabulary plus one physical object:
  the thread.
- White page, near-black text, link blue (#3366cc), visited purple (#795cb2),
  hairline grey rules, serif titles (Linux Libertine / Georgia fallback),
  sans body text.
- Wikipedia elements and their jobs:
  - Infobox → endpoint cards
  - Hatnote → bridge line
  - [citation needed] → unproven claim, unvisited knots
  - Footnote superscripts [1–N] → proven claim
  - References list → recap and shelf
- The thread is the only thing with physics: a rope that hangs loose at
  rest, gets thinner and tighter as it's pulled (a glint runs along it when
  taut), and recoils when a page lands (owner, 2026-10-28; was "always
  taut", 2026-10-11). Thread colour is link blue.
- Nudges, not notes: until a reader's first pull, the thread tugs the
  passage up every few seconds; until the first swipe, the stack card leans
  both ways.
- Motion only for the thread, the focus blur, and the tumble.
- No stickies, badges, points, streaks, or emoji.
- One deliberate exception (owner, 2026-10-09): a handwritten swipe hint on
  home ("← not now · swipe right to go in →"), in the Caveat font shipped
  with the app. It is always shown on the stack (owner, 2026-10-10).
  (The "Pull the thread ↑" label went with the knot handle, 2026-10-28.)

## Platforms
- Web app first, phone-first. Must also work on laptop:
  scroll (trackpad or wheel) down / down arrow = next page, scroll up / up
  arrow = previous page, left arrow = back, Esc = back to the thread from
  the article (or leave the hole from the thread).
- Installable to home screen later (PWA). Not in v1.

## Content
- Holes are hand-authored JSON files in /holes (schema below).
- Passages are verbatim English Wikipedia text (CC BY-SA 4.0), footnote
  markers removed, nothing else changed.
- Each hole touches at least 3 distinct Wikipedia pages.
- Each page shows attribution and a link back to the article.
- Hatnotes, claims and payoffs are our own writing.

### Hole JSON schema
```json
{
  "id": "coffee-insurance",
  "claim": "Coffee built the world's insurance market.",
  "start": { "title": "Coffee", "description": "Brewed drink", "image": "" },
  "end": { "title": "Lloyd's of London", "description": "Insurance market", "image": "" },
  "knots": [
    {
      "page": "Coffee",
      "url": "https://en.wikipedia.org/wiki/Coffee",
      "revision": null,
      "section": "lead",
      "passage": "verbatim text…",
      "hatnote": "It began as a way for mystics to stay awake through night prayers.",
      "onwardLinkText": "coffeehouse",
      "nextPage": "Coffeehouse"
    }
  ],
  "payoff": "A drink Yemeni mystics used to stay awake became Lloyd's of London.",
  "caveats": ["Opening year differs between pages."]
}
```

## Must not (v1)
- No backend beyond one exception (owner, 2026-10-10): optional sign-in by
  emailed link (Supabase) whose only job is keeping a reader's shelf across
  devices. Without signing in, everything works and nothing leaves the
  device. No other accounts, data or tracking. Otherwise a static site.
- No live calls to Wikipedia at runtime. All content ships in /holes.
- No LLM calls at runtime.
