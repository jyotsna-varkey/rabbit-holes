import { expect, test } from '@playwright/test';
import { enterTopHole } from './helpers';

// PLAN step 26: the ending shows every page the thread passed through.
test('the ending shows the whole journey, every page named, with pictures', async ({ page }, info) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(label);
  }
  const ending = page.locator('.ending');
  await expect(ending).toHaveClass(/stage-4/, { timeout: 8000 });
  const stops = ending.locator('.journey .j-knot');
  await expect(stops).toHaveCount(4);
  await expect(stops.locator('.j-title')).toHaveText([/^Tutankhamun/, /^Christiane Desroches Noblecourt/, /^Christiane Desroches Noblecourt/, /^Temple of Amada/]);
  // Two stops on the same page are told apart by their section.
  await expect(stops.nth(1).locator('.j-section')).not.toHaveText(await stops.nth(2).locator('.j-section').innerText());
  // Each stop has its page's picture, loaded, and opens Wikipedia at that passage.
  for (let i = 0; i < 4; i++) {
    const img = stops.nth(i).locator('img');
    await expect(img).toHaveJSProperty('complete', true);
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await expect(stops.nth(i).locator('a')).toHaveAttribute('href', /#:~:text=/);
  }
  await ending.locator('.journey').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `screenshots/e2e-journey-${info.project.name}.png` });
});

// PLAN step 35 (owner, 2026-10-11): the journey runs on one diagonal, start card
// top left to end card bottom right, every page's picture on the line.
test('the journey is one straight diagonal, top left to bottom right', async ({ page }) => {
  await page.goto('/?hole=tutankhamun-noblecourt-amada-rails');
  await enterTopHole(page);
  for (const label of ['2 / 4', '3 / 4', '4 / 4', 'Cited']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.bar-count')).toHaveText(label);
  }
  const ending = page.locator('.ending');
  await expect(ending).toHaveClass(/stage-4/, { timeout: 8000 });
  const centre = async (sel: string, n = 0) => {
    const b = (await ending.locator(sel).nth(n).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const start = await centre('.j-start .j-cap');
  const end = await centre('.j-end .j-cap');
  const startCard = (await ending.locator('.j-start .infobox').boundingBox())!;
  const endCard = (await ending.locator('.j-end .infobox').boundingBox())!;
  const list = (await ending.locator('.journey').boundingBox())!;
  expect(startCard.x - list.x).toBeLessThan(2);
  expect(list.x + list.width - (endCard.x + endCard.width)).toBeLessThan(2);
  let lastX = start.x;
  for (let i = 0; i < 4; i++) {
    const p = await centre('.end-knot', i);
    expect(p.x).toBeGreaterThan(lastX);
    lastX = p.x;
    const onLine = start.x + ((p.y - start.y) / (end.y - start.y)) * (end.x - start.x);
    expect(Math.abs(p.x - onLine)).toBeLessThan(2);
  }
});
