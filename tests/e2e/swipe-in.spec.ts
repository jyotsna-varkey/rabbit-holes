import { expect, test } from '@playwright/test';

// PLAN step 27: swiping right carries straight on into the page.
test('the card does not spring back: the page starts growing right after release', async ({ page }) => {
  await page.goto('/?hole=coffee-insurance');
  const card = page.locator('.slot-0 .stack-drag');
  const box = (await card.boundingBox())!;
  const y = box.y + box.height * 0.3;
  const x0 = box.x + box.width / 2;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(x0 + 25 * i, y, { steps: 2 });
  const released = (await card.boundingBox())!.x;
  await page.mouse.up();
  // The tumble begins at once…
  await expect(page.locator('.hole')).toBeAttached({ timeout: 250 });
  // …and the card was never pulled back toward the centre in the meantime.
  expect((await card.boundingBox())!.x).toBeGreaterThanOrEqual(released - 2);
});

test('the page stays sharp while it scrolls to the passage; the blur comes after', async ({ page }) => {
  await page.goto('/?hole=coffee-insurance');
  const box = (await page.locator('.slot-0 .card').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width / 2 + 28 * i, box.y + 100, { steps: 2 });
  await page.mouse.up();
  const first = page.locator('.page').first();
  // While it travels to the passage, the veils are off.
  await expect(first).toHaveClass(/is-landing/, { timeout: 3000 });
  await expect(first.locator('.veil-top')).toHaveCSS('opacity', '0');
  // Once it lands, focus (and the blur) arrives.
  await expect(first).toHaveClass(/is-focused/, { timeout: 5000 });
  await expect(first).not.toHaveClass(/is-landing/);
});
