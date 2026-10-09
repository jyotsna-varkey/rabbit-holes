import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// Every hole in /holes can be entered and pulled through to its cited ending,
// with each knot's hatnote on screen in turn and no page errors.
const ROOT = new URL('../../', import.meta.url).pathname;
const holes = readdirSync(`${ROOT}holes`)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`${ROOT}holes/${f}`, 'utf8')) as {
    id: string;
    claim: string;
    knots: { hatnote: string }[];
  });

test.describe('every hole, end to end', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 500, 'phone only; one size is enough here');

  for (const hole of holes) {
    test(hole.id, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // Put this hole on top of the stack.
      await page.addInitScript((id) => {
        try {
          localStorage.setItem('rh.order', JSON.stringify([id]));
        } catch {
          // ignore
        }
      }, hole.id);
      await page.goto('/');
      await expect(page.locator('.slot-0 .card-claim')).toContainText(hole.claim);
      await page.screenshot({ path: `screenshots/holes/${hole.id}-1-card.png` });

      await enterTopHole(page);
      const n = hole.knots.length;
      for (let i = 0; i < n; i++) {
        await expect(page.locator('.bar-count')).toHaveText(`${i + 1} / ${n}`);
        await expect(page.getByText(hole.knots[i].hatnote, { exact: true }).first()).toBeInViewport();
        if (i === 0) {
          await page.waitForTimeout(500);
          await page.screenshot({ path: `screenshots/holes/${hole.id}-2-page.png` });
        }
        await page.keyboard.press('ArrowDown');
      }
      await expect(page.locator('.bar-count')).toHaveText('Cited');
      await expect(page.locator('.ending')).toHaveClass(/stage-4/, { timeout: 10_000 });
      await page.screenshot({ path: `screenshots/holes/${hole.id}-3-ending.png` });
      expect(errors).toEqual([]);
    });
  }
});
