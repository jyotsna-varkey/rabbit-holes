import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// SPEC: pulls start ONLY from the knot.
test('tapping the onward link in a passage does not pull the thread', async ({ page, context }) => {
  // The link may open Wikipedia in a new tab; keep that off the network.
  await context.route((url) => url.hostname.endsWith('wikipedia.org'), (r) => r.abort());
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(`${i + 2} / 4`);
  }
  const link = page.locator('a.rh-onward', { hasText: 'Temple of Amada' }).last();
  await expect(link).toBeInViewport();
  await link.click({ modifiers: [] });
  await page.waitForTimeout(1200);
  await expect(page.locator('.bar-count')).toHaveText('3 / 4');
  await expect(page.locator('.hole.phase-reading')).toBeVisible();
});
