import { expect, test } from '@playwright/test';
import { enterTopHole, pullKnot } from './helpers';

const HATNOTES = [
  "Tutankhamun's treasures first toured thanks to the end of a war.",
  "The curator behind the show had a wartime past.",
];

test('home shows the linked hole on top with an unproven claim', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  const claim = page.locator('.slot-0 .card-claim');
  await expect(claim).toContainText("An Egyptologist's jab at de Gaulle put an ancient temple on rails.");
  await expect(claim).toContainText('citation needed');
  await expect(page.locator('.slot-0 .card-meta')).toHaveText('4 knots · about 4 min');
});

test('swiping right enters the hole and focuses the first passage', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  await expect(page.getByText(HATNOTES[0]).first()).toBeInViewport();
  await expect(page.locator('.bar-count')).toHaveText('1 / 4');
});

test('dragging the knot up pulls the next page in', async ({ page }, info) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  await pullKnot(page);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await expect(page.getByText(HATNOTES[1]).first()).toBeInViewport();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `screenshots/e2e-pull-${info.project.name}.png` });
});
