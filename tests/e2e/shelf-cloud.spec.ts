import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// PLAN step 28: the shelf works with no account; signing in is optional.
test('readers who never sign in make no requests to the sign-in service', async ({ page }) => {
  const cloud: string[] = [];
  page.on('request', (r) => { if (/supabase\.co/.test(r.url())) cloud.push(r.url()); });
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(label);
  }
  await expect(page.locator('.ending')).toHaveClass(/stage-4/, { timeout: 8000 });
  await page.locator('.door', { hasText: 'Keep it' }).click();
  await expect(page.locator('.door', { hasText: 'On your shelf' })).toBeVisible();
  expect(cloud).toEqual([]);
});

test('the shelf offers an email sign-in link to keep it on every device', async ({ page }, info) => {
  let otp: { email?: string } | null = null;
  await page.route(/supabase\.co\/auth\/v1\/otp/, async (route) => {
    otp = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await page.locator('.head-link', { hasText: 'Shelf' }).click();
  const form = page.locator('.shelf-sync form');
  await expect(form).toBeVisible();
  await form.locator('input[type=email]').fill('reader@example.com');
  await form.locator('button[type=submit]').click();
  await expect(page.locator('.shelf-sync')).toContainText(/check your (email|inbox)/i);
  expect(otp?.email).toBe('reader@example.com');
  await page.screenshot({ path: `screenshots/e2e-shelf-sync-${info.project.name}.png` });
});
