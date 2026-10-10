import { expect, test } from '@playwright/test';
import { enterTopHole, swipeTopCard } from './helpers';

// Owner decision (PLAN step 21): a handwritten swipe hint on home, in Caveat.
// The font ships with the app.
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

// PLAN step 31 (owner, 2026-10-10): the hint is always on the stack, not just
// for first-timers. Replaces "the hint goes away after the first swipe".
test('the hint is still there after a swipe and after a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.swipe-hint')).toBeVisible();
  await swipeTopCard(page, 'left');
  await expect(page.locator('.swipe-hint')).toBeVisible();
  await page.reload();
  await expect(page.locator('.slot-0 .card')).toBeVisible();
  await expect(page.locator('.swipe-hint')).toBeVisible();
});

// PLAN step 22: the "Pull the thread" label next to the knot matches the swipe hint.
test('the pull-the-thread label is handwritten too', async ({ page }) => {
  await page.goto('/');
  await enterTopHole(page);
  const label = page.locator('.pull-hint');
  await expect(label).toBeVisible();
  await expect(label).toHaveCSS('font-family', /^Caveat/);
});
