import { expect, test, type Page } from '@playwright/test';
import { enterTopHole } from './helpers';

// SPEC: motion only for the thread, the focus blur, and the tumble (plus the end
// card swinging in and the thread locking, which the spec's ending describes).
const ALLOWED = [
  '.thread-main', '.thread-shadow', '.hole-thread', '.end-thread', '.end-knot', // the thread and its knots
  '.veil', // focus blur
  '.hole-bar', '.knot', // fade in as the tumble lands
  '.end-diagram .end-right', // the end card swings in
];

async function movingElements(page: Page) {
  return page.evaluate((allowed) => {
    const moving: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (allowed.some((sel) => el.matches(sel))) continue;
      const cs = getComputedStyle(el);
      const durations = cs.transitionDuration.split(',').map((d) => parseFloat(d));
      const animated = cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0;
      if (animated || durations.some((d) => d > 0)) {
        const name = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : el.tagName.toLowerCase();
        moving.push(`${name} (${animated ? `animation ${cs.animationName}` : `transition ${cs.transitionProperty}`})`);
      }
    }
    return [...new Set(moving)];
  }, ALLOWED);
}

test('nothing else on screen animates', async ({ page }) => {
  await page.goto('/?hole=coffee-insurance');
  const seen: string[] = [...(await movingElements(page))];
  await enterTopHole(page);
  seen.push(...(await movingElements(page)));
  for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(label);
  }
  await expect(page.locator('.ending')).toHaveClass(/stage-4/, { timeout: 8000 });
  seen.push(...(await movingElements(page)));
  expect([...new Set(seen)]).toEqual([]);
});
