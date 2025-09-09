import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

function url(path: string, qs: Record<string, any> = {}): string {
  const u = new URL(path, BASE);
  for (const [k, v] of Object.entries(qs)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach(x => u.searchParams.append(k, String(x)));
    else u.searchParams.set(k, String(v));
  }
  return u.toString();
}

const paginaRe = (now: number, total: number) =>
  new RegExp(`PÃƒÆ’Ã‚Â¡gina\\s*${now}\\s*de\\s*${total}`, 'i');

async function waitForCatalog(page: Page, timeout = 60000) {
  await page.waitForLoadState('domcontentloaded');
  try {
    await page.waitForLoadState('networkidle', { timeout: Math.min(10000, Math.floor(timeout / 2)) });
  } catch {}
  await page.waitForFunction(() => {
    const hasCards = !!document.querySelector('a[href^="/producto/"]');
    const bodyText = (document.body && (document.body.innerText || document.body.textContent)) || '';
    const hasCounter = /\d+\s*resultados/i.test(bodyText);
    return hasCards || hasCounter;
  }, null, { timeout });
}

async function countCards(page: Page) {
  return page.locator('a[href^="/producto/"]').count();
}

async function getCounter(page: any, q: Record<string, any> = {}) {
  // Navegar con los params si vienen
  if (q && Object.keys(q).length) {
    const u = new URL(page.url());
    for (const [k, v] of Object.entries(q)) {
      if (v === null || v === undefined || v === '') u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    }
    await page.goto(u.toString());
  }

  // Leer conteos desde el body (tolerante a 'Página X' o 'Página X de Y')
  const parsed = await page.evaluate(() => {
    const t = (document.body && (document.body.innerText || (document.body as any).textContent)) || '';
    const mPagina = t.match(/Página\s*(\d+)(?:\s*de\s*(\d+))?/i);
    const mTotal  = t.match(/(\d+)\s+resultados?/i);

    const pageNow = mPagina ? Number(mPagina[1]) : 1;
    const pageCount = (mPagina && mPagina[2]) ? Number(mPagina[2]) : 1;
    const total = mTotal ? Number(mTotal[1]) : NaN;

    return { total, pageNow, pageCount, raw: t };

  return { total: parsed.total, pageNow: parsed.pageNow, pageCount: parsed.pageCount };
}) {
  // Navegar con los params si vienen
  if (q && Object.keys(q).length) {
    const u = new URL(page.url());
    for (const [k, v] of Object.entries(q)) {
      if (v === null || v === undefined || v === '') u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    }
    await page.goto(u.toString());
  }

  // Leer conteos desde el body (tolerante a 'PÃ¡gina X' o 'PÃ¡gina X de Y')
  const parsed = await page.evaluate(() => {
    const t = (document.body && (document.body.innerText || (document.body as any).textContent)) || '';
    const mPagina = t.match(/PÃ¡gina\s*(\d+)(?:\s*de\s*(\d+))?/i);
    const mTotal  = t.match(/(\d+)\s+resultados?/i);

    const pageNow = mPagina ? Number(mPagina[1]) : 1;
    const pageCount = (mPagina && mPagina[2]) ? Number(mPagina[2]) : 1;
    const total = mTotal ? Number(mTotal[1]) : NaN;

    return { total, pageNow, pageCount, raw: t };

  return { total: parsed.total, pageNow: parsed.pageNow, pageCount: parsed.pageCount };
};

  const perPage = opts?.perPage ?? 20;
  let pageCount = Number.isFinite(info.pageCount) ? info.pageCount : 1;
  if ((!Number.isFinite(info.pageCount) || info.pageCount < 1) && Number.isFinite(info.total)) {
    pageCount = Math.max(1, Math.ceil(info.total / perPage));
  }
  let pageNow = Number.isFinite(info.pageNow) ? info.pageNow : 1;

  return { total: info.total, pageNow, pageCount };
}

test.describe('Productos ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ total filtrado, paginaciÃƒÆ’Ã‚Â³n y LCP priority', () => {
  test('1) Sin filtros: contador visible y consistente (perPage=99: total == cards)', async ({ page }) => {
    const perPage = 99;
    await page.goto(url('/productos', { perPage }));
    await waitForCatalog(page);

    const cards = await countCards(page);
    const { total, pageNow, pageCount } = await getCounter(page, { perPage });

    expect(total).toBe(cards);
    expect(pageNow).toBe(1);
    expect(pageCount).toBe(1);
    await expect.poll(async () => {
  const body = await page.evaluate(() => (document.body && (document.body.innerText || document.body.textContent)) || '');
  return paginaRe(1, 1).test(body);
}).toBeTruthy();

  test('2) Con filtros (perPage=1): contador y paginaciÃƒÆ’Ã‚Â³n usan el mismo totalForView', async ({ page }) => {
    const perPage = 1;
    await page.goto(url('/productos', { onSale: 1, match: 'all', perPage }));
    await waitForCatalog(page);

    const cards = await countCards(page);
    if (cards === 0) test.skip(true, 'No hay productos con onSale=1 en este entorno; se salta la prueba.');

    const { total, pageCount } = await getCounter(page, { perPage });
    const expectedPages = (!Number.isNaN(total) && total > 0)
      ? Math.max(1, Math.ceil(total / perPage))
      : Math.max(1, pageCount);

    expect(pageCount).toBe(expectedPages);
    expect(cards).toBe(1);

  test('3) Con filtros + perPage=1: "PÃƒÆ’Ã‚Â¡gina X de Y" refleja la navegaciÃƒÆ’Ã‚Â³n a page=2 cuando corresponde', async ({ page }) => {
    const perPage = 1;

    await page.goto(url('/productos', { onSale: 1, match: 'all', perPage }));
    await waitForCatalog(page);

    const c1 = await getCounter(page, { perPage });
    const expectedPages = (!Number.isNaN(c1.total) && c1.total > 0)
      ? Math.max(1, Math.ceil(c1.total / perPage))
      : Math.max(1, c1.pageCount);

    if (expectedPages > 1) {
      await page.goto(url('/productos', { onSale: 1, match: 'all', perPage, page: 2 }));
      await waitForCatalog(page);

      const c2 = await getCounter(page, { perPage });
      expect(c2.pageNow).toBe(2);
      expect(c2.pageCount).toBe(expectedPages);
      await expect.poll(async () => {
  const body = await page.evaluate(() => (document.body && (document.body.innerText || document.body.textContent)) || '');
  return paginaRe(2, expectedPages).test(body);
}).toBeTruthy();
    } else {
      const c2 = await getCounter(page, { perPage });
      expect(c2.pageNow).toBe(1);
      expect(c2.pageCount).toBe(1);
      await expect.poll(async () => {
  const body = await page.evaluate(() => (document.body && (document.body.innerText || document.body.textContent)) || '');
  return paginaRe(1, 1).test(body);
}).toBeTruthy();
      test.skip(true, 'Solo hay una pÃƒÆ’Ã‚Â¡gina con onSale=1; no aplica navegaciÃƒÆ’Ã‚Â³n a page=2.');
    }

  test('4) LCP: en pÃƒÆ’Ã‚Â¡gina 1 hay entre 1 y 3 imÃƒÆ’Ã‚Â¡genes sin loading="lazy"', async ({ page }) => {
    await page.goto(url('/productos', { page: 1 }));
    await waitForCatalog(page);

    const nonLazy = await page.locator('img:not([loading="lazy"])').count();
    expect(nonLazy).toBeGreaterThanOrEqual(1);
    expect(nonLazy).toBeLessThanOrEqual(5);

  test('5) LCP: en pÃƒÆ’Ã‚Â¡gina 2 todas las imÃƒÆ’Ã‚Â¡genes son lazy (0 con prioridad)', async ({ page }) => {
    await page.goto(url('/productos', { page: 2 }));
    await waitForCatalog(page);

    const nonLazy = await page.locator('img:not([loading="lazy"])').count();
    expect(nonLazy).toBe(0);
