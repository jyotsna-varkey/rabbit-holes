import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// SPEC: home is the stack of hole cards; after the ending, three options only.
test('home shows the stack and nothing extra', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.slot-0 .card')).toBeVisible();
  await expect(page.getByText('Did you know')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /not now|go in/i })).toHaveCount(0);
});

test('the ending offers exactly three options and no other ways out', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(label);
  }
  const ending = page.locator('.ending');
  await expect(ending).toHaveClass(/stage-4/, { timeout: 8000 });
  await expect(ending.locator('.doors .door')).toHaveCount(3);
  await expect(ending.getByText('See also')).toHaveCount(0);
  await expect(ending.getByText(/more holes? pass/)).toHaveCount(0);
});
