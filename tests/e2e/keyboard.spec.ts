import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// SPEC (laptop): down arrow / click knot = pull, left arrow = back.
test('left arrow goes back a knot, and from the first knot back to the stack', async ({ page }, info) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  await expect(page.getByText("Tutankhamun's treasures first toured thanks to the end of a war.").first()).toBeInViewport();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `screenshots/e2e-back-${info.project.name}.png` });
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.hole')).toHaveCount(0);
  await expect(page.locator('.slot-0 .card-claim')).toContainText("An Egyptologist's jab");
});

test('left arrow on the ending goes back to the last knot', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  for (const n of [2, 3, 4]) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(`${n} / 4`);
  }
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.bar-count')).toHaveText('Cited');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.bar-count')).toHaveText('4 / 4');
  await expect(page.getByText('The plan: put the whole painted temple on rails and push it uphill.').first()).toBeInViewport();
});
