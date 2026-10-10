import { expect, test } from '@playwright/test';
import { enterTopHole, pullKnot } from './helpers';

// PLAN step 25: the same knot goes both ways. Drag up = next page, drag down = previous.
test('dragging the knot down goes back a page', async ({ page }) => {
  await page.goto('/?hole=coffee-insurance');
  await enterTopHole(page);
  await pullKnot(page);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await pullKnot(page, -40);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
  await expect(page.getByText("It started as a monk's way to stay up for night prayers.").first()).toBeInViewport();
});

test('from the ending, the knot is still there and pulls back to the last page', async ({ page }, info) => {
  await page.goto('/?hole=coffee-insurance');
  await enterTopHole(page);
  for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(label);
  }
  await expect(page.locator('.ending')).toHaveClass(/stage-4/, { timeout: 8000 });
  await expect(page.locator('.knot')).toBeVisible();
  await expect(page.locator('.pull-hint')).toContainText(/go back/i);
  await page.screenshot({ path: `screenshots/e2e-ending-knot-${info.project.name}.png` });
  await pullKnot(page, -40);
  await expect(page.locator('.bar-count')).toHaveText('4 / 4');
  await expect(page.getByText('In London, the coffeehouse became the office.').first()).toBeInViewport();
});

test('dragging the knot down on the first page goes back to the stack', async ({ page }) => {
  await page.goto('/?hole=coffee-insurance');
  await enterTopHole(page);
  await pullKnot(page, -40);
  await expect(page.locator('.hole')).toHaveCount(0);
  await expect(page.locator('.slot-0 .card')).toBeVisible();
});
