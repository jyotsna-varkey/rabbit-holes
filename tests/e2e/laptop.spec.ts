import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

test.describe('laptop layout', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'laptop only');

  // Owner-approved (step 43): replaces "the margin thread runs just left of the
  // text column", which read the old thread's first line.
  test('the thread and its beads stay in the margin, never over the text', async ({ page }) => {
    await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
    await enterTopHole(page);
    await page.waitForTimeout(1500);
    const column = (await page.locator('.page .art-body').first().boundingBox())!;
    const bead = (await page.locator('.bead.is-current').boundingBox())!;
    expect(bead.x + bead.width).toBeLessThan(column.x);
    expect(bead.x).toBeGreaterThan(column.x - 50);
    const rightmost = await page.locator('.hole-thread [data-role="main"]').evaluateAll((paths) =>
      Math.max(0, ...paths.map((p) => {
        const path = p as SVGPathElement;
        if (!path.getAttribute('d')) return 0;
        const len = path.getTotalLength();
        let m = 0;
        for (let i = 0; i <= 30; i++) m = Math.max(m, path.getPointAtLength((len * i) / 30).x);
        return m;
      })));
    expect(rightmost).toBeLessThan(column.x);
  });

  test('the ending sits in one centred column', async ({ page }) => {
    await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
    await enterTopHole(page);
    for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('.bar-count')).toHaveText(label);
    }
    await expect(page.locator('.ending')).toHaveClass(/stage-4/, { timeout: 8000 });
    const lefts = await Promise.all(
      ['.end-kicker', '.end-claim', '.end-diagram', '.end-after'].map(
        async (sel) => (await page.locator(`.ending ${sel}`).boundingBox())!.x,
      ),
    );
    for (const x of lefts) expect(Math.abs(x - lefts[3])).toBeLessThan(2);
    expect(lefts[3]).toBeGreaterThan(200);
  });
});
