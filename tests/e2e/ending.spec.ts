import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

async function finishHole(page: import('@playwright/test').Page) {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  for (const n of [2, 3, 4]) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(`${n} / 4`);
  }
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.bar-count')).toHaveText('Cited');
}

// SPEC: end card swings in, the claim changes to [1–N], references replay the hole,
// then three options only.
test('the ending cites the claim, lists one reference per knot, and offers three doors', async ({ page }, info) => {
  await finishHole(page);
  const ending = page.locator('.ending');
  await expect(ending).toHaveClass(/stage-4/, { timeout: 8000 });
  await expect(ending.locator('.end-claim sup.cited')).toHaveText('[1–4]');
  await expect(ending.locator('.end-claim sup.cited')).toHaveCSS('opacity', '1');
  await expect(ending.locator('ol.refs > li')).toHaveCount(4);
  await page.screenshot({ path: `screenshots/e2e-ending-${info.project.name}.png` });
  await ending.locator('.doors').scrollIntoViewIfNeeded();
  await expect(ending.locator('.doors .door')).toHaveText([/Go deeper/, /Next hole/, /Keep it/]);
  await page.screenshot({ path: `screenshots/e2e-ending-doors-${info.project.name}.png` });
});
