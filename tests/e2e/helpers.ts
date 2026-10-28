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

/**
 * Pull the thread (PLAN step 41: scrolling is the pull). Scrolls on past the
 * passage like a trackpad: a stream of small wheel events 16 ms apart, sent
 * inside the page. A negative `by` goes back a page with the top bar's last
 * visited knot. (Was: drag the knot handle, removed in step 41.)
 */
export async function pullKnot(page: Page, by = 400) {
  if (by < 0) {
    await page.locator('.progress .progress-back').last().click();
    return;
  }
  await expect(page.locator('.page.is-landing')).toHaveCount(0, { timeout: 10_000 });
  await page.locator('.page[aria-current="page"] .page-scroll').evaluate(async (el, total) => {
    for (let done = 0; done < total; done += 10) {
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 16));
    }
  }, by);
}
