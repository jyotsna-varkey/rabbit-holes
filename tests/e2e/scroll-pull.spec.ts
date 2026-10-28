import { expect, test, type Page } from '@playwright/test';
import { enterTopHole } from './helpers';

// PLAN steps 41–42 (owner, 2026-10-28): scrolling is the pull. On the thread,
// any scroll moves between pages — down to the next, up to the previous — and
// the article itself doesn't scroll. Only a click or tap on the blur opens the
// article; then the thread runs down to a docked knot: click it (or the
// passage, or Esc) to come back. Visited knots in the top bar go back; so does
// scrolling up past the top of the ending.

const HOLE = '/?hole=tutankhamun-noblecourt-amada-rails';

async function open(page: Page, { firstTime = false } = {}) {
  await page.goto(HOLE);
  if (!firstTime) {
    await page.evaluate(() => localStorage.setItem('rh.pulled', 'true'));
    await page.reload();
  }
  await enterTopHole(page);
  // Wait for the page to finish gliding down to the passage.
  await expect(page.locator('.page.is-landing')).toHaveCount(0, { timeout: 10_000 });
  await page.waitForTimeout(300);
}

const current = (page: Page) => page.locator('.page[aria-current="page"]');
const scroller = (page: Page) => current(page).locator('.page-scroll');

/** A continuous wheel scroll (one gesture), `total` px in steps of `step`. */
async function wheel(page: Page, total: number, step = 15) {
  const vp = page.viewportSize()!;
  await page.mouse.move(vp.width / 2, vp.height / 2);
  for (let done = 0; Math.abs(done) < Math.abs(total); done += Math.sign(total) * step) {
    await page.mouse.wheel(0, Math.sign(total) * step);
    await page.waitForTimeout(16);
  }
}

/**
 * Scroll on past the passage like a trackpad does: a stream of small wheel
 * events 16 ms apart, sent inside the page (Playwright's own wheel calls can be
 * 200 ms apart on a busy machine). Resolves with the thread's tension at the end.
 */
const trackpad = (page: Page, total: number) =>
  current(page).locator('.page-scroll').evaluate(async (el, total) => {
    for (let done = 0; done < Math.abs(total); done += 10) {
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: Math.sign(total) * 10, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 16));
    }
    return Number(document.querySelector<HTMLElement>('.hole')!.style.getPropertyValue('--tension'));
  }, total);

const trackY = (page: Page) =>
  page.locator('.track').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);

// Owner-approved: replaces "on the thread, the passage is the end of the scroll".
test('on the thread, scrolling never moves the article itself', async ({ page }) => {
  await open(page);
  const top = () => scroller(page).evaluate((el) => Math.round(el.scrollTop));
  const before = await top();
  await wheel(page, 45); // short of a page: drops back
  await page.waitForTimeout(600);
  await wheel(page, -45);
  await page.waitForTimeout(600);
  expect(await top()).toBe(before);
  await expect(current(page)).toHaveClass(/is-focused/);
  await expect(current(page).locator('.rh-passage')).toBeInViewport();
});

test('scrolling on past the passage pulls the next page in', async ({ page }) => {
  await open(page);
  await wheel(page, 200);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  // One scroll gesture moves one page, however long it runs on.
  await page.waitForTimeout(600);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
});

test('a short scroll past the passage drops back', async ({ page }) => {
  await open(page);
  await wheel(page, 45);
  await page.waitForTimeout(600);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  expect(await trackY(page)).toBeCloseTo(0, 0);
});

// Owner-approved (step 43): replaces "the thread tightens as you pull", which
// expected the old thread to get thicker. The approved thread thins as it's pulled taut.
test('the thread gets thinner and tighter as you pull', async ({ page }) => {
  await open(page);
  const width = () => page.locator('.hole-thread [data-span="lo"][data-role="main"]').evaluate((el) => parseFloat(el.getAttribute('stroke-width') ?? '0'));
  const before = await width();
  expect(await trackpad(page, 80)).toBeGreaterThan(0.5);
  expect(await width()).toBeLessThan(before);
});

// Owner-approved: replaces "a scroll already moving stops at the passage
// instead of pulling" (it felt like hitting a wall).
test('one long scroll always moves on, one page, no wall', async ({ page }) => {
  await open(page);
  await trackpad(page, 600);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await page.waitForTimeout(600);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
});

test('tapping the blur opens the whole article, and scrolling it never pulls', async ({ page, context }) => {
  await open(page);
  const popups: string[] = [];
  context.on('page', (p) => popups.push(p.url()));
  // A spot in the blurred text above the passage.
  const hatnote = (await current(page).locator('.rh-hatnote').boundingBox())!;
  await page.mouse.click(page.viewportSize()!.width / 2, hatnote.y - 60);
  await expect(page.locator('.page.is-focused')).toHaveCount(1); // only the next page, waiting
  await expect(page.locator('.page').first()).not.toHaveClass(/is-focused/);
  expect(popups).toEqual([]); // a link under the blur didn't open on that tap
  await wheel(page, 600);
  await page.waitForTimeout(500);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
});

// Owner-approved: replaces "scrolling up into the article dissolves the blur".
test('scrolling up goes to the previous page; on the first page it only gives a little', async ({ page }) => {
  await open(page);
  await trackpad(page, 150);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await page.waitForTimeout(500);
  await trackpad(page, -150);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  await page.waitForTimeout(500);
  await trackpad(page, -300);
  await page.waitForTimeout(500);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  await expect(current(page)).toHaveClass(/is-focused/);
});

// Coming back to the first page used to open the article at its top, off the
// thread (the page is rebuilt and waited for a first-arrival glide).
test('coming back to the first page lands on its passage, on the thread', async ({ page }) => {
  await open(page);
  for (const label of ['2 / 4', '3 / 4']) {
    await trackpad(page, 150);
    await expect(page.locator('.bar-count')).toHaveText(label);
    await page.waitForTimeout(500);
  }
  await page.locator('.progress .progress-back').first().click();
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  await expect(current(page)).toHaveClass(/is-focused/);
  await expect(current(page).locator('.rh-hatnote')).toBeInViewport();
});

/** Open the article by clicking the blur above the passage. */
async function readArticle(page: Page) {
  const hatnote = (await current(page).locator('.rh-hatnote').boundingBox())!;
  await page.mouse.click(page.viewportSize()!.width / 2, Math.max(70, hatnote.y - 60));
  await expect(current(page)).not.toHaveClass(/is-focused/);
}

// Owner-approved: replaces "reading the article, the thread hangs loose; tapping it comes back".
test('reading the article, the thread runs to a docked knot; clicking it comes back', async ({ page }) => {
  await open(page);
  await readArticle(page);
  const dock = page.locator('.thread-dock');
  await expect(dock).toBeVisible();
  await wheel(page, 400); // the article scrolls normally
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  await expect(dock).toBeInViewport();
  await dock.click();
  await expect(current(page)).toHaveClass(/is-focused/);
  await expect(current(page).locator('.rh-passage')).toBeInViewport({ timeout: 6000 });
  await expect(dock).toBeHidden();
});

// PLAN step 46 (owner, 2026-10-28): reading the article, the whole thread is the
// way back — the passage, any bead, or the thread itself.
test('reading the article, clicking a bead or the thread itself goes back to the thread', async ({ page }) => {
  await open(page);
  await readArticle(page);
  await expect(page.locator('.hole')).toHaveClass(/is-reading/);
  await page.locator('.bead.is-current').click();
  await expect(current(page)).toHaveClass(/is-focused/);

  await page.waitForTimeout(1600);
  await readArticle(page);
  // A point on the thread's lower half (between this page's bead and the dock).
  const pt = await page.locator('.hole-thread [data-span="lo"][data-role="main"]').evaluate((p) => {
    const path = p as SVGPathElement;
    const q = path.getPointAtLength(path.getTotalLength() * 0.6);
    const box = path.ownerSVGElement!.getBoundingClientRect();
    return { x: box.left + q.x, y: box.top + q.y };
  });
  await page.mouse.click(pt.x, pt.y);
  await expect(current(page)).toHaveClass(/is-focused/);
});

test('reading the article, Esc goes back to the thread', async ({ page }) => {
  await open(page);
  await readArticle(page);
  await page.keyboard.press('Escape');
  await expect(current(page)).toHaveClass(/is-focused/);
  await expect(page.locator('.hole')).toHaveCount(1);
});

test('reading the article, tapping the passage comes back to the thread', async ({ page }) => {
  await open(page);
  const first = page.locator('.page').first();
  await readArticle(page);
  const passage = first.locator('.rh-passage');
  await passage.scrollIntoViewIfNeeded();
  const box = (await passage.boundingBox())!;
  // Click plain text, not a link: the passage's first characters.
  await page.mouse.click(box.x + 4, box.y + 6);
  await expect(first).toHaveClass(/is-focused/);
});

test('a visited knot in the top bar goes back to its page', async ({ page }) => {
  await open(page);
  await trackpad(page, 150);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await page.waitForTimeout(500);
  await trackpad(page, 150);
  await expect(page.locator('.bar-count')).toHaveText('3 / 4');
  await page.locator('.progress li').first().locator('.progress-back').click();
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
});

test('from the ending, scrolling up past the top pulls back to the last page', async ({ page }) => {
  await open(page);
  for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(label);
  }
  await page.waitForTimeout(600);
  await wheel(page, -200);
  await expect(page.locator('.bar-count')).toHaveText('4 / 4');
});

test('first-time readers see the thread give a small tug by itself', async ({ page }) => {
  await open(page, { firstTime: true });
  await expect.poll(() => trackY(page), { timeout: 4000, intervals: [50] }).toBeLessThan(-10);
  await expect.poll(() => trackY(page), { timeout: 3000 }).toBeCloseTo(0, 0);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
});

// Found by the every-hole test: moving on while that tug played left the
// screen on the old page (the tug kept setting the position).
test('moving on during the first-time tug still lands on the next page', async ({ page }) => {
  await open(page, { firstTime: true });
  await expect.poll(() => trackY(page), { timeout: 4000, intervals: [30] }).toBeLessThan(-5);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await expect(page.locator('.page[aria-current="page"] .rh-hatnote')).toBeInViewport();
  await page.waitForTimeout(1200);
  expect(await trackY(page)).toBeCloseTo(-page.viewportSize()!.height, 0);
});

// Owner, 2026-10-28: on a laptop, a second swipe had to wait seconds. A Mac
// trackpad keeps sending fading "coasting" events after the fingers lift; a
// new swipe while it coasts must still move on.
test('a new trackpad swipe moves on straight away, even while the last one coasts', async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    // Like a real trackpad: each event goes to whatever is under the cursor (the
    // next page once it has slid in).
    const send = async (d: number) => {
      const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)!;
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: d, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 16));
    };
    for (let i = 0; i < 8; i++) await send(25);                 // swipe: moves on
    for (let d = 24; d > 3; d *= 0.9) await send(Math.round(d)); // coasting, fading out
    for (const d of [6, 14, 26, 30, 30, 30, 30]) await send(d);  // a new swipe while it coasts
  });
  await expect(page.locator('.bar-count')).toHaveText('3 / 4');
});

// A quick flick moves on even if it's short; a slow drag of the same length
// that pauses before lifting drops back. (Pointer events sent inside the page,
// 16 ms apart, so the timing is exact.)
test('a quick flick moves on; the same distance dragged slowly drops back', async ({ page }) => {
  await open(page);
  const gesture = (ys: number[], pause = 0) => page.evaluate(async ({ ys, pause }) => {
    const x = innerWidth / 2;
    const el = document.elementFromPoint(x, ys[0])!;
    const opts = (y: number) => ({ pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true });
    el.dispatchEvent(new PointerEvent('pointerdown', opts(ys[0])));
    for (const y of ys.slice(1)) {
      await new Promise((r) => setTimeout(r, 16));
      window.dispatchEvent(new PointerEvent('pointermove', opts(y)));
    }
    if (pause) await new Promise((r) => setTimeout(r, pause));
    window.dispatchEvent(new PointerEvent('pointerup', opts(ys[ys.length - 1])));
  }, { ys, pause });
  const y0 = page.viewportSize()!.height * 0.6;
  await gesture([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((d) => y0 - d), 250);
  await page.waitForTimeout(700);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  await gesture([0, 12, 30, 50].map((d) => y0 - d));
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  async function swipe(page: Page, dy: number, { hold = false } = {}) {
    const cdp = await page.context().newCDPSession(page);
    const vp = page.viewportSize()!;
    const x = vp.width / 2;
    const y = vp.height * 0.75;
    const touch = (type: string, ty?: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: ty == null ? [] : [{ x, y: ty }] } as never);
    await touch('touchStart', y);
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', y + (dy * i) / 8);
      await page.waitForTimeout(16);
    }
    if (!hold) await touch('touchEnd');
    return () => touch('touchEnd');
  }

  test('a swipe up past the passage pulls the next page in; a short one drops back', async ({ page }) => {
    await open(page);
    const release = await swipe(page, -40, { hold: true });
    expect(await trackY(page)).toBeLessThan(-10);
    await release();
    await page.waitForTimeout(500);
    await expect(page.locator('.bar-count')).toHaveText('1 / 4');
    await swipe(page, -110);
    await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  });
});
