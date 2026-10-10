import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// PLAN step 23: the top bar always names the Wikipedia page you're on.
test('the top bar names the current Wikipedia page and follows every pull', async ({ page }) => {
  await page.goto('/');
  await enterTopHole(page);
  const name = page.locator('.hole-bar .bar-page');
  await expect(name).toHaveText('Coffee');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await expect(name).toHaveText('Coffee');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.bar-count')).toHaveText('3 / 4');
  await expect(name).toHaveText('Coffeehouse');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await expect(name).toHaveText('Coffee');
  await expect(name).toBeInViewport();
});
