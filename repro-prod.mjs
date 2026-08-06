import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
page.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url() + ' :: ' + (r.failure()?.errorText || '')));

try {
  await page.goto('http://localhost:3100/ar', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('landing URL:', page.url());
  console.log('login link href:', await page.getAttribute('nav a', 'href').catch(() => 'N/A'));

  await page.click('text=تسجيل الدخول', { timeout: 15000 });
  await page.waitForTimeout(4000);
  console.log('after click URL:', page.url());
} catch (e) {
  console.log('EXCEPTION:', e.message.split('\n')[0]);
}
console.log('errs:', errs.length ? errs.join('\n  ') : 'none');
await browser.close();
