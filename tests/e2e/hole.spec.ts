import { expect, test } from '@playwright/test';
import { enterTopHole, pullKnot } from './helpers';

const HATNOTES = [
  "It started as a monk's way to stay up for night prayers.",
  "From Yemen, coffee spread to Istanbul's coffeehouses, and on to Venice.",
];

test('home shows the coffee hole on top with an unproven claim', async ({ page }) => {
  await page.goto('/');
  const claim = page.locator('.slot-0 .card-claim');
  await expect(claim).toContainText("Coffee built the world's insurance industry.");
  await expect(claim).toContainText('citation needed');
  await expect(page.locator('.slot-0 .card-meta')).toHaveText('4 knots · about 4 min');
});

test('swiping right enters the hole and focuses the first passage', async ({ page }) => {
  await page.goto('/');
  await enterTopHole(page);
  await expect(page.getByText(HATNOTES[0]).first()).toBeInViewport();
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
});

test('dragging the knot up pulls the next page in', async ({ page }, info) => {
  await page.goto('/');
  await enterTopHole(page);
  await pullKnot(page);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await expect(page.getByText(HATNOTES[1]).first()).toBeInViewport();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `screenshots/e2e-pull-${info.project.name}.png` });
});

test('a short drag springs back without advancing', async ({ page }) => {
  await page.goto('/');
  await enterTopHole(page);
  await pullKnot(page, 60);
  await page.waitForTimeout(800);
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
});
