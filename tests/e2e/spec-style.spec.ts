import { expect, test } from '@playwright/test';

const GREY = 'rgb(114, 119, 125)'; // --ink-3, #72777d

// SPEC: each card shows the claim with a grey [citation needed].
test('the unproven claim on the home card has a grey [citation needed]', async ({ page }) => {
  await page.goto('/');
  const cn = page.locator('.slot-0 .card-claim sup.cn');
  await expect(cn).toHaveText('[citation needed]');
  await expect(cn).toHaveCSS('color', GREY);
  await expect(cn.locator('i')).toHaveCSS('color', GREY);
});
