import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

test.describe('laptop layout', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'laptop only');

  test('the margin thread runs just left of the text column', async ({ page }) => {
    await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
    await enterTopHole(page);
    await page.waitForTimeout(600);
    const column = (await page.locator('.page .art-body').first().boundingBox())!;
    // The first span starts at the top pin: "M<x> <y>".
    const d = await page.locator('.hole-thread .thread-main').first().getAttribute('d');
    const x = Number(d!.match(/^M(-?[\d.]+)/)![1]);
    expect(x).toBeLessThan(column.x);
    expect(x).toBeGreaterThan(column.x - 20);
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
