import { expect, test } from '@playwright/test';
import { enterTopHole, swipeTopCard } from './helpers';

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

// Step 32 changed this from reloading the same tab (which now keeps the order)
// to opening fresh tabs: each is a new visit with a new shuffle.
test('a hole you have opened goes behind the ones you have not', async ({ page, context }) => {
  await page.goto('/');
  const opened = await page.locator('.slot-0 .card-claim').innerText();
  await enterTopHole(page);
  await page.locator('.bar-close').click();
  for (let i = 0; i < 5; i++) {
    const visit = await context.newPage();
    await visit.goto('/');
    await expect(visit.locator('.slot-0 .card-claim')).not.toHaveText(opened);
    await visit.close();
  }
});

// PLAN step 32: the shuffle happens once per visit; refreshing keeps the order,
// including cards sent to the back.
test('refresh keeps the same order', async ({ page }) => {
  await page.goto('/');
  const claims = () => page.locator('.stack-slot .card-claim').allInnerTexts();
  await swipeTopCard(page, 'left');
  const before = await claims();
  for (let i = 0; i < 3; i++) {
    await page.reload();
    await expect(page.locator('.slot-0 .card')).toBeVisible();
    expect(await claims()).toEqual(before);
  }
});

test('a ?hole= link puts that hole on top', async ({ page }) => {
  await page.goto('/?hole=gold-alchemy');
  await expect(page.locator('.slot-0 .card-claim')).toContainText('Isaac Newton put Britain on the gold standard');
});
