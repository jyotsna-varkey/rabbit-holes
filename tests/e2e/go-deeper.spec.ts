import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// SPEC: Go deeper opens real Wikipedia at that passage.
test('Go deeper and every reference open Wikipedia at the passage', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
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
    "https://en.wikipedia.org/wiki/Temple_of_Amada#:~:text=The%20temple%20was%20pushed%20by%20double%2Daction%20jacks%20which%20are%20anchored",
  );
  await expect(deeper).toHaveAttribute('target', '_blank');

  const refs = await ending.locator('ol.refs > li > a.ref-up').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(refs).toEqual([
    "https://en.wikipedia.org/wiki/Tutankhamun#:~:text=Tutankhamun's%20artifacts%20have%20traveled%20the%20world%20with%20unprecedented%20visitorship.%20The",
    "https://en.wikipedia.org/wiki/Christiane_Desroches_Noblecourt#:~:text=In%201940%2C%20during%20World%20War%20II%2C%20she%20returned%20to%20Paris",
    "https://en.wikipedia.org/wiki/Christiane_Desroches_Noblecourt#:~:text=The%20Temple%20of%20Amada%20was%20a%20difficult%20case%2C%20because%20of",
    "https://en.wikipedia.org/wiki/Temple_of_Amada#:~:text=The%20temple%20was%20pushed%20by%20double%2Daction%20jacks%20which%20are%20anchored",
  ]);
});
