import { expect, test, type Page } from '@playwright/test';
import { enterTopHole } from './helpers';

// PLAN step 33: the thread, on phone and laptop. A small tug moves on at once,
// nothing ever slides into a blank screen, and scrolling over the knot reads on.

const knotCentre = async (page: Page) => {
  const b = (await page.locator('.knot').boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

/** Top of the current page on screen (0 = flush with the window). */
const pageTop = (page: Page, n: number) =>
  page.locator('.page').filter({ has: page.locator('.art-head') }).nth(n).evaluate((el) => el.getBoundingClientRect().top);

test('a tug moves on before you let go, and lands quickly', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  const { x, y } = await knotCentre(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 4; i++) await page.mouse.move(x, y - 5 * i);
  // Still holding: the name and the knots have already moved on.
  await expect(page.locator('.bar-count')).toHaveText('2 / 4', { timeout: 150 });
  const t0 = Date.now();
  await page.mouse.up();
  // The track has finished moving within half a second.
  await expect
    .poll(async () => page.locator('.track').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42), { timeout: 600 })
    .toBeCloseTo(-page.viewportSize()!.height, 0);
  expect(Date.now() - t0).toBeLessThan(700);
});

test('quick tugs in a row each move one page', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  for (const want of ['2 / 4', '3 / 4', '4 / 4']) {
    const { x, y } = await knotCentre(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 10);
    await page.mouse.move(x, y - 20);
    await page.mouse.up();
    await expect(page.locator('.bar-count')).toHaveText(want);
  }
});

test('a back tug on the first page never shows a blank screen', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  const { x, y } = await knotCentre(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x, y + 20 * i);
  // Held well down: the page has given a little at most, hidden under the top bar.
  const top = await page.locator('.page').first().evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeLessThanOrEqual(40);
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(await page.locator('.page').first().evaluate((el) => el.getBoundingClientRect().top)).toBeCloseTo(0, 0);
});

test('scrolling with a trackpad or wheel over the knot scrolls the page', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  const scroller = page.locator('.page-scroll').first();
  const before = await scroller.evaluate((el) => el.scrollTop);
  const { x, y } = await knotCentre(page);
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(before + 200);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
});

test('moving the mouse over the knot without pressing does nothing', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  const { x, y } = await knotCentre(page);
  await page.mouse.move(x, y);
  await page.mouse.move(x, y - 200, { steps: 10 });
  await page.waitForTimeout(400);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  expect(await pageTop(page, 0)).toBeCloseTo(0, 0);
});
