# Instructions for Claude

## Start of every session
1. Read SPEC.md and PLAN.md before doing anything.
2. Run `git status` and `git log --oneline -5` to see where things stand.
3. Work only on the step marked "Current step" in PLAN.md unless told otherwise.
4. If anything in the request conflicts with SPEC.md, ask before proceeding.

## How to work
- One PLAN step at a time. Small changes. Don't touch files the step doesn't need.
- Before fixing a bug: explain the cause first, then write a test that
  reproduces it, then fix it.
- Never edit, weaken, or delete a test to make it pass. If a test seems wrong,
  say so and ask.
- Ask before adding any dependency.
- Don't refactor unrelated code. If you notice something worth changing,
  add it to "Known issues" in PLAN.md instead.
- Never claim a step is done without showing evidence: test output and, for
  anything visual, a screenshot you have actually looked at.

## Git
- Git is our checkpoint system. Commit after every step that works.
- A step is "green" when: it works, `npm test` passes, and screenshots look right.
- On green: `git add -A` then `git commit -m "Step N: <what works now>"`.
- Never commit with failing tests.
- If an attempt goes badly (two rounds of fixes haven't worked), stop and say so.
  Recommend reverting to the last commit rather than patching further.
- Before any destructive command (`git restore .`, `git reset --hard`,
  `git clean`), list exactly what will be lost and wait for confirmation.
- Never force-push. Never rewrite pushed history.
- Pushing to GitHub only when asked.

## Seeing your work
You can check your own work. Do it before asking me to look.

### One-time setup (step 0)
```bash
npm create vite@latest . -- --template vanilla
npm install
npm install -D vitest @playwright/test
npx playwright install chromium
```
Add to package.json scripts:
```json
"dev": "vite",
"test": "vitest run",
"shot": "node scripts/screenshot.mjs"
```

Create `scripts/screenshot.mjs`:
```js
// Usage: npm run shot -- [path] [name]
// Starts nothing; expects `npm run dev` to be running on port 5173.
import { chromium } from '@playwright/test';

const path = process.argv[2] || '/';
const name = process.argv[3] || 'shot';
const browser = await chromium.launch();

for (const [label, size] of [['phone', { width: 390, height: 844 }],
                             ['laptop', { width: 1280, height: 800 }]]) {
  const page = await browser.newPage({ viewport: size });
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173' + path);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `screenshots/${name}-${label}.png`, fullPage: false });
  console.log(`${label}: screenshots/${name}-${label}.png`);
  if (errors.length) console.log(`${label} console errors:\n  ` + errors.join('\n  '));
  await page.close();
}
await browser.close();
```
Add `screenshots/` to .gitignore.

### The check loop (every visual change)
1. Make sure the dev server is running (`npm run dev`, in the background).
2. Run `npm test`. Read the output.
3. Run `npm run shot -- / <name>`. Open both PNGs and look at them.
4. Read any console errors it printed.
5. Fix what you see, then repeat. Only report back when it looks right.

### Gestures
To check a drag (e.g. the knot pull), write a short Playwright test in
`tests/` that uses `page.mouse.move/down/move/up` on the knot, then asserts the
next knot's title is visible and takes a screenshot. Keep these tests; they
guard against regressions.

### If a tool is missing
If Playwright or a browser can't be installed or run in this environment, say
so plainly and fall back to `npm test` plus reading the built HTML. Don't
pretend to have looked at something you couldn't see.

## End of every session
1. Update PLAN.md: tick finished steps, set "Current step", add any decisions
   (including what was tried and why it failed), known issues, and one line in
   the session log.
2. Commit PLAN.md.
3. Tell me in two or three lines: what works now, what's next, anything I
   need to decide.
