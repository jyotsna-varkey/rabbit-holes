import { expect, test, type Page } from '@playwright/test';
import { enterTopHole } from './helpers';

// PLAN step 34 (owner, 2026-10-11): the reading thread is always taut — every
// span a straight line, no sag or bunching.
const worstBend = (page: Page) =>
  page.locator('.hole-thread .thread-main').evaluateAll((paths) =>
    Math.max(0, ...paths.map((p) => {
      const path = p as SVGPathElement;
      if (!path.getAttribute('d') || path.closest('g')?.getAttribute('visibility') === 'hidden') return 0;
      const len = path.getTotalLength();
      const a = path.getPointAtLength(0);
      const b = path.getPointAtLength(len);
      const chord = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      let worst = 0;
      for (let i = 1; i < 20; i++) {
        const q = path.getPointAtLength((len * i) / 20);
        worst = Math.max(worst, Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / chord);
      }
      return worst;
    })),
  );

// PLAN step 41 (owner-approved): replaces "the thread is taut while reading,
// before and after a pull". The tactile thread has a slight give at rest and is
// drawn dead straight while you pull.
test('a slight give at rest, dead straight while you pull', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  await expect(page.locator('.page.is-landing')).toHaveCount(0, { timeout: 10_000 });
  await page.waitForTimeout(1500);
  expect(await worstBend(page)).toBeLessThan(12);
  // Pull most of the way and measure while still holding (in one go, so the pull can't end first).
  await page.locator('.page[aria-current="page"] .page-scroll').evaluate(async (el) => {
    for (let i = 0; i < 9; i++) {
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 16));
    }
    await new Promise((r) => setTimeout(r, 120));
  });
  expect(await worstBend(page)).toBeLessThan(1.5);
});
