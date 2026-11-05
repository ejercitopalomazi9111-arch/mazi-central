/* k6 · un cliente de District Roll de principio a fin, en un Chromium de verdad (agrega dos
   empanizados en martes, revisa el 2×1, llena el nombre y manda). Ver carga.js para instalar k6. */
import { browser } from 'k6/browser';
import { check } from 'k6';
export const options = { scenarios: { cliente: { executor: 'shared-iterations', vus: 1, iterations: 3, options: { browser: { type: 'chromium' } } } },
  thresholds: { checks: ['rate==1.0'], browser_web_vital_lcp: ['p(95)<2500'], browser_web_vital_cls: ['p(95)<0.1'] } };
const URL = (__ENV.URL || 'http://localhost:8765/district-roll/') + '?dia=2';
export default async function () {
  const page = await browser.newPage();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); window.__ab = []; window.open = (u) => { window.__ab.push(u); return null; }; });
    await page.locator('[aria-label^="Agregar Camaroncito Roll"]').click();
    await page.locator('[aria-label^="Agregar Supremo"]').click();
    await page.waitForTimeout(400);
    check(await page.locator('#flotaTotal').textContent(), { 'martes 2×1 cobra $169': (t) => t === '$169' });
    await page.locator('#flota').click();
    await page.waitForTimeout(400);
    await page.locator('#fNombre').fill('Cliente k6');
    await page.locator('#enviar').click();
    const url = await page.evaluate(() => window.__ab[0] || '');
    check(url, { 'manda a WhatsApp con la promo': (u) => u.startsWith('https://wa.me/524613441696') && decodeURIComponent(u).includes('Martes 2×1') });
  } finally { await page.close(); }
}
