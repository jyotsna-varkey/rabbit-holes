import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// PLAN step 24: a fresh shuffle every visit, holes you haven't opened first.
test('fresh visits start with different holes', async ({ browser }) => {
  const firsts = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/');
    firsts.add(await page.locator('.slot-0 .card-claim').innerText());
    await context.close();
  }
  expect(firsts.size).toBeGreaterThan(1);
});

test('a hole you have opened goes behind the ones you have not', async ({ page }) => {
  await page.goto('/');
  const opened = await page.locator('.slot-0 .card-claim').innerText();
  await enterTopHole(page);
  await page.locator('.bar-close').click();
  for (let i = 0; i < 5; i++) {
    await page.goto('/');
    await expect(page.locator('.slot-0 .card-claim')).not.toHaveText(opened);
  }
});

test('a ?hole= link puts that hole on top', async ({ page }) => {
  await page.goto('/?hole=gold-alchemy');
  await expect(page.locator('.slot-0 .card-claim')).toContainText('Isaac Newton put Britain on the gold standard');
});
