import { expect, type Page } from '@playwright/test';

/** Drag the top home card sideways with the mouse, like a swipe. */
export async function swipeTopCard(page: Page, direction: 'right' | 'left') {
  const card = page.locator('.slot-0 .card');
  const box = (await card.boundingBox())!;
  const y = box.y + box.height * 0.3;
  const x0 = box.x + box.width / 2;
  const dx = direction === 'right' ? 220 : -220;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + (dx * i) / 8, y, { steps: 2 });
  await page.mouse.up();
}

/** Enter the top hole and wait until the first passage is in focus. */
export async function enterTopHole(page: Page) {
  await swipeTopCard(page, 'right');
  await expect(page.locator('.hole.phase-reading')).toBeVisible();
  await expect(page.locator('.page.is-focused').first()).toBeVisible({ timeout: 10_000 });
}

/** Drag the knot handle upward by `by` pixels. */
export async function pullKnot(page: Page, by = 400) {
  const knot = page.locator('.knot');
  const box = (await knot.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x, y - (by * i) / 10, { steps: 2 });
  await page.mouse.up();
}
