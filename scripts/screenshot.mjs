// Usage: npm run shot -- [path] [name]
// Starts nothing; expects `npm run dev` to be running on port 5173.
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const path = process.argv[2] || '/';
const name = process.argv[3] || 'shot';
await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();

for (const [label, size] of [['phone', { width: 390, height: 844 }],
                             ['laptop', { width: 1280, height: 800 }]]) {
  const page = await browser.newPage({ viewport: size });
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173' + path);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `screenshots/${name}-${label}.png`, fullPage: false });
  console.log(`${label}: screenshots/${name}-${label}.png`);
  if (errors.length) console.log(`${label} console errors:\n  ` + errors.join('\n  '));
  await page.close();
}
await browser.close();
