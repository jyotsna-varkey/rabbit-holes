import { expect, test } from '@playwright/test';
import { enterTopHole, swipeTopCard } from './helpers';

// Owner decision (PLAN step 21): a handwritten swipe hint on home, in Caveat,
// shown until the reader's first swipe. The font ships with the app.
test('first-time readers see a handwritten swipe hint, from a bundled font', async ({ page }) => {
  const fontHosts: string[] = [];
  page.on('request', (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) fontHosts.push(r.url());
  });
  await page.goto('/');
  const hint = page.locator('.swipe-hint');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText(/swipe right/i);
  await expect(hint).toHaveCSS('font-family', /^Caveat/);
  expect(await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('500 22px Caveat');
  })).toBe(true);
  expect(fontHosts).toEqual([]);
});

test('the hint goes away after the first swipe, and stays away', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.swipe-hint')).toBeVisible();
  await swipeTopCard(page, 'left');
  await expect(page.locator('.swipe-hint')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.slot-0 .card')).toBeVisible();
  await expect(page.locator('.swipe-hint')).toHaveCount(0);
});

// PLAN step 22: the "Pull the thread" label next to the knot matches the swipe hint.
test('the pull-the-thread label is handwritten too', async ({ page }) => {
  await page.goto('/');
  await enterTopHole(page);
  const label = page.locator('.pull-hint');
  await expect(label).toBeVisible();
  await expect(label).toHaveCSS('font-family', /^Caveat/);
});
