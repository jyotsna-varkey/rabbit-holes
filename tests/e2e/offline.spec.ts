import { expect, test } from '@playwright/test';
import { enterTopHole, pullKnot } from './helpers';

// SPEC: no live calls to Wikipedia at runtime.
test('reading a hole makes no requests to Wikipedia or Wikimedia', async ({ page }) => {
  const remote: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (/(^|\.)(wikipedia|wikimedia)\.org$/.test(host)) remote.push(r.url());
  });
  await page.goto('/');
  await enterTopHole(page);
  // Scroll the whole first article so lazy images would load.
  await page.locator('.page-scroll').first().evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(800);
  await pullKnot(page);
  await expect(page.locator('.bar-count')).toHaveText('2 / 4');
  await page.waitForTimeout(500);
  expect(remote).toEqual([]);
});
