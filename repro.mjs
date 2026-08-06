import { chromium } from 'playwright-core';

const browser = await chromium.launch();
let fails = 0;
for (let i = 0; i < 5; i++) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text().slice(0, 120)); });
  try {
    await page.goto('http://localhost:3000/ar', { waitUntil: 'networkidle', timeout: 60000 });
    await page.click('nav a[href="/ar/auth/login"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    const ok = url.includes('/ar/auth/login');
    if (!ok) fails++;
    console.log(`cycle ${i}: ${ok ? 'OK' : 'FAIL'} -> ${url} | errs: ${errs.length ? errs.join(' / ') : 'none'}`);
  } catch (e) {
    fails++;
    console.log(`cycle ${i}: EXCEPTION ${e.message.split('\n')[0]} | errs: ${errs.join(' / ')}`);
  }
  await page.close();
}
console.log(fails === 0 ? '\nALL OK — code is stable' : `\n${fails} FAILURES`);
await browser.close();
