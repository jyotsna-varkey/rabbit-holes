import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// PLAN step 26: the ending shows every page the thread passed through.
test('the ending shows the whole journey, every page named, with pictures', async ({ page }, info) => {
  await page.goto('/?hole=coffee-insurance');
  await enterTopHole(page);
  for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(label);
  }
  const ending = page.locator('.ending');
  await expect(ending).toHaveClass(/stage-4/, { timeout: 8000 });
  const stops = ending.locator('.journey .j-knot');
  await expect(stops).toHaveCount(4);
  await expect(stops.locator('.j-title')).toHaveText([/^Coffee/, /^Coffee/, /^Coffeehouse/, /^Coffeehouse/]);
  // Two stops on the same page are told apart by their section.
  await expect(stops.nth(0).locator('.j-section')).not.toHaveText(await stops.nth(1).locator('.j-section').innerText());
  // Each stop has its page's picture, loaded, and opens Wikipedia at that passage.
  for (let i = 0; i < 4; i++) {
    const img = stops.nth(i).locator('img');
    await expect(img).toHaveJSProperty('complete', true);
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await expect(stops.nth(i).locator('a')).toHaveAttribute('href', /#:~:text=/);
  }
  await ending.locator('.journey').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `screenshots/e2e-journey-${info.project.name}.png` });
});
