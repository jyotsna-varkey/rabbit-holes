import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// SPEC: Go deeper opens real Wikipedia at that passage.
test('Go deeper and every reference open Wikipedia at the passage', async ({ page }) => {
  await page.goto('/?hole=coffee-insurance');
  await enterTopHole(page);
  for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(label);
  }
  const ending = page.locator('.ending');
  await expect(ending).toHaveClass(/stage-4/, { timeout: 8000 });

  const deeper = ending.locator('.doors a.door', { hasText: 'Go deeper' });
  await expect(deeper).toHaveAttribute(
    'href',
    'https://en.wikipedia.org/wiki/Coffeehouse#:~:text=Coffeehouses%20not%20only%20boosted%20the%20popularity%20of%20print%20news%20culture',
  );
  await expect(deeper).toHaveAttribute('target', '_blank');

  const refs = await ending.locator('ol.refs > li > a.ref-up').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(refs).toEqual([
    'https://en.wikipedia.org/wiki/Coffee#:~:text=Though%20coffee%20has%20become%20a%20global%20commodity%2C%20it%20has%20a',
    'https://en.wikipedia.org/wiki/Coffee#:~:text=Within%20the%20Ottoman%20Empire%2C%20the%20first%20coffeehouse%20opened%20in%201555',
    'https://en.wikipedia.org/wiki/Coffeehouse#:~:text=Coffeehouses%20in%20Mecca%20became%20a%20concern%20of%20imams%2C%20who%20viewed',
    'https://en.wikipedia.org/wiki/Coffeehouse#:~:text=Coffeehouses%20not%20only%20boosted%20the%20popularity%20of%20print%20news%20culture',
  ]);
});
