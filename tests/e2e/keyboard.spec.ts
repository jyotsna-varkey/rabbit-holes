import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// SPEC (laptop): down arrow / click knot = pull, left arrow = back.
test('left arrow goes back a knot, and from the first knot back to the stack', async ({ page }, info) => {
  await page.goto('/');
  await enterTopHole(page);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  await expect(page.getByText("It started as a monk's way to stay up for night prayers.").first()).toBeInViewport();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `screenshots/e2e-back-${info.project.name}.png` });
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.hole')).toHaveCount(0);
  await expect(page.locator('.slot-0 .card-claim')).toContainText('Coffee built');
});

test('left arrow on the ending goes back to the last knot', async ({ page }) => {
  await page.goto('/');
  await enterTopHole(page);
  for (const n of [2, 3, 4]) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(`${n} / 4`);
  }
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.bar-count')).toHaveText('Cited');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.bar-count')).toHaveText('4 / 4');
  await expect(page.getByText('In London, the coffeehouse became the office.').first()).toBeInViewport();
});

test('clicking the knot pulls, like the down arrow', async ({ page }) => {
  await page.goto('/');
  await enterTopHole(page);
  await page.locator('.knot').click();
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
});
