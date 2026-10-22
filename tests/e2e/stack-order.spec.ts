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

// PLAN step 37 (owner, 2026-10-22): nothing leaves the stack, but a hole swiped
// left or opened goes behind everything unseen, on this device, for good.
test('holes swiped left or opened stay at the back on later visits, most recent last', async ({ page, context }) => {
  const order = (p: typeof page) => p.evaluate(() => JSON.parse(sessionStorage.getItem('rh.session-order') ?? '[]') as string[]);
  await page.goto('/');
  const skipped = (await order(page))[0];
  await swipeTopCard(page, 'left');
  // Wait for the skipped card to fly off and the next one to settle on top.
  await expect.poll(async () => (await order(page))[0]).not.toBe(skipped);
  await page.waitForTimeout(800);
  const opened = (await order(page))[0];
  await enterTopHole(page);
  await page.locator('.bar-close').click();
  for (let i = 0; i < 3; i++) {
    const visit = await context.newPage();
    await visit.goto('/');
    await expect(visit.locator('.slot-0 .card')).toBeVisible();
    const ids = await order(visit);
    expect(ids.slice(-2)).toEqual([skipped, opened]);
    await visit.close();
  }
});
