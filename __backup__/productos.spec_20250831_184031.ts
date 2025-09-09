import { test, expect, Page } from '@playwright/test';

    
// Helper robusto para esperar que rendericen tarjetas de producto
async function waitForCards(page, timeout = 60000) {
  await page.waitForLoadState('domcontentloaded');
  // Pequeño intento de networkidle (no crítico)
  try { await page.waitForLoadState('networkidle', { timeout: Math.min(10000, Math.floor(timeout/2)) }); } catch {}
  // Esperar a que haya al menos tarjetas o el contador de "resultados"
  await page.waitForFunction(() => {
    const hasCards = !!document.querySelector('a[href^="/producto/"]');
    const bodyText = (document.body && (document.body.innerText || document.body.textContent)) || '';
    const hasCounter = /resultados/i.test(bodyText);
    return hasCards || hasCounter;
  }, null, { timeout });
}
  );
}


const BASE = 'http://localhost:3000';

function url(path: string, params: Record<string, any> = {}): string {
  const u = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach(val => u.searchParams.append(k, String(val)));
    else u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function countCards(page: Page): Promise<number> {
  return await page.locator('a[href^="/producto/"]').count();
}

function paginaRe(p: number, n: number): RegExp {
  // Soporta "PÃƒÆ’Ã‚Â¡gina", "PÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡gina" y similares
  return new RegExp(`P.{0,3}gina\\s*${p}\\s*de\\s*${n}`, 'i');
}

async function getCounter(page: Page, _opts: { perPage?: number } = {}) {
  // Tomamos el bloque que contiene "resultados"
  const node = page.locator('text=/resultados/i').first();
  const text = (await node.textContent() ?? '').replace(/\s+/g, ' ').trim();

  // X resultados
  const mTotal = /\b(\d+)\s*resultados\b/i.exec(text);
  const total = mTotal ? Number(mTotal[1]) : Number.NaN;

  // PÃƒÆ’Ã‚Â¡gina P de N (tolerante)
  const mPage = /P.{0,3}gina\s*(\d+)\s*de\s*(\d+)/i.exec(text);
  const pageNow = mPage ? Number(mPage[1]) : Number.NaN;
  const pageCount = mPage ? Number(mPage[2]) : Number.NaN;

  return { total, pageNow, pageCount, raw: text };
}

test.describe('Productos ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ total filtrado, paginaciÃƒÆ’Ã‚Â³n y LCP priority', () => {
  test('1) Sin filtros: contador visible y consistente (perPage=99: total == cards)', async ({ page }) => {
    const perPage = 99;
    await page.goto(url('/productos', { perPage }));
    await await waitForCards(page);

    const cards = await countCards(page);
    const { total, pageNow, pageCount } = await getCounter(page);

    expect(total).toBe(cards);
    expect(pageNow).toBe(1);
    expect(pageCount).toBe(1);
    await expect(page.getByText(paginaRe(1, 1))).toBeVisible();
  });

  test('2) Con filtros (perPage=1): contador y paginaciÃƒÆ’Ã‚Â³n usan el mismo totalForView', async ({ page }) => {
    const perPage = 1;
    await page.goto(url('/productos', { onSale: 1, match: 'all', perPage }));
    await page.locator('a[href^="/producto/"]').first().waitFor({ timeout: 5000 }).catch(() => {});

    const cards = await countCards(page);
    if (cards === 0) test.skip(true, 'No hay productos con onSale=1; se salta la prueba.');

    const { total, pageNow, pageCount } = await getCounter(page);

    expect(pageNow).toBe(1);

    const expectedPages =
      !Number.isNaN(total) && total > 0
        ? Math.max(1, Math.ceil(total / perPage))
        : Math.max(1, pageCount);

    expect(pageCount).toBe(expectedPages);
    expect(cards).toBe(1);
  });

  test('3) Con filtros + perPage=1: "PÃƒÆ’Ã‚Â¡gina X de Y" refleja la navegaciÃƒÆ’Ã‚Â³n a page=2 cuando corresponde', async ({ page }) => {
    const perPage = 1;

    // PÃƒÆ’Ã‚Â¡gina 1 con filtros activos
    await page.goto(url('/productos', { onSale: 1, match: 'all', perPage }));
    await page.locator('a[href^="/producto/"]').first().waitFor({ timeout: 5000 }).catch(() => {});
    const cardsP1 = await countCards(page);
    if (cardsP1 === 0) test.skip(true, 'No hay productos con onSale=1; se salta la prueba.');

    const c1 = await getCounter(page);
    const expectedPages =
      !Number.isNaN(c1.total) && c1.total > 0
        ? Math.max(1, Math.ceil(c1.total / perPage))
        : Math.max(1, c1.pageCount);

    if (expectedPages > 1) {
      await page.goto(url('/productos', { onSale: 1, match: 'all', perPage, page: 2 }));
      await page.waitForLoadState('networkidle');

      const c2 = await getCounter(page);
      expect(c2.pageNow).toBe(2);
      expect(c2.pageCount).toBe(expectedPages);
      await expect(page.getByText(paginaRe(2, expectedPages))).toBeVisible();
    } else {
      const c2 = await getCounter(page);
      expect(c2.pageNow).toBe(1);
      expect(c2.pageCount).toBe(1);
      await expect(page.getByText(paginaRe(1, 1))).toBeVisible();
    }
  });

  test('4) LCP: en pÃƒÆ’Ã‚Â¡gina 1 hay entre 1 y 3 imÃƒÆ’Ã‚Â¡genes sin loading="lazy"', async ({ page }) => {
    await page.goto(url('/productos', { page: 1 }));
    await await waitForCards(page);
    const nonLazy = await page.locator('img:not([loading="lazy"])').count();
    expect(nonLazy).toBeGreaterThanOrEqual(1);
    expect(nonLazy).toBeLessThanOrEqual(3);
  });

  test('5) LCP: en pÃƒÆ’Ã‚Â¡gina 2 todas las imÃƒÆ’Ã‚Â¡genes son lazy (0 con prioridad)', async ({ page }) => {
    await page.goto(url('/productos', { page: 2 }));
    await page.locator('body').waitFor();
    const nonLazy = await page.locator('img:not([loading="lazy"])').count();
    expect(nonLazy).toBe(0);
  });
});
