import { expect, test, type Page } from '@playwright/test';
import { enterTopHole, pullKnot } from './helpers';

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

test('the thread is taut while reading, before and after a pull', async ({ page }) => {
  await page.goto('/?hole=coffee-insurance');
  await enterTopHole(page);
  await page.waitForTimeout(1200);
  expect(await worstBend(page)).toBeLessThan(1.5);
  await pullKnot(page, 30);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await page.waitForTimeout(1200);
  expect(await worstBend(page)).toBeLessThan(1.5);
});
