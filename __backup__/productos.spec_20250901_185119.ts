import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

function url(path: string, qs: Record<string, any> = {}): string {
  const u = new URL(path, BASE);
  for (const [k, v] of Object.entries(qs)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x) => u.searchParams.append(k, String(x)));
    else u.searchParams.set(k, String(v));
  }
  return u.toString();
}

// Acepta "Página X de Y", "Pag. X/Y", "PAGINA X - Y", o solo "Página X"
function paginaRe(now: number, total?: number) {
  const word = `P(?:á|a)g(?:\\.|ina)`; // "Pág.", "Pagina", "Página"
  const sep = `(?:\\s*(?:de|\\/|\\-|—)\\s*)`; // "de", "/", "-", "—"
  const y = total != null ? String(total) : `\\d+`;
  return new RegExp(`${word}\\s*${now}(?:${sep}${y})?`, 'i');
}

async function waitForCatalog(page: Page, timeout = 60_000) {
  await page.waitForLoadState('domcontentloaded');
  try {
    await page.waitForLoadState('networkidle', {
      timeout: Math.min(10_000, Math.floor(timeout / 2)),
    });
  } catch {}
  await page.waitForFunction(
    () => {
      const hasCards = !!document.querySelector('a[href^="/producto/"]');
      const bodyText =
        (document.body && (document.body.innerText || document.body.textContent)) || '';
      const hasCounter = /\d+\s*resultados/i.test(bodyText);
      return hasCards || hasCounter;
    },
    null,
    { timeout },
  );
}

async function countCards(page: Page) {
  return page.locator('a[href^="/producto/"]').count();
}

/**
 * Lee "total", "pageNow" y "pageCount" desde el body.
 * Si recibe "q", navega aplicando esos query params.
 * Usa fallbacks si el contador aún no se pintó completo.
 */
async function getCounter(
  page: Page,
  q: Record<string, any> = {},
  opts: { perPage?: number } = {},
): Promise<{ total: number; pageNow: number; pageCount: number }> {
  // Navegar con los params si vienen
  if (q && Object.keys(q).length) {
    const u = new URL(page.url());
    for (const [k, v] of Object.entries(q)) {
      if (v === null || v === undefined || v === '') u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    }
    await page.goto(u.toString());
  }

  // Leer conteos desde el body (tolerante a "Página X" o "Página X de Y")
  const parsed = await page.evaluate(() => {
    const t =
      (document.body && (document.body.innerText || (document.body as any).textContent)) || '';
    const mPagina = t.match(/Página\s*(\d+)(?:\s*de\s*(\d+))?/i);
    const mTotal = t.match(/(\d+)\s+resultados?/i);

    const pageNow = mPagina ? Number(mPagina[1]) : NaN;
    const pageCount = mPagina && mPagina[2] ? Number(mPagina[2]) : NaN;
    const total = mTotal ? Number(mTotal[1]) : NaN;

    return { total, pageNow, pageCount };
  });

  // Fallbacks por si el contador aún no se pintó completo
  const perPage = opts?.perPage ?? 20;
  const pageNowSafe = Number.isFinite(parsed.pageNow) && parsed.pageNow > 0 ? parsed.pageNow : 1;

  const pageCountSafe =
    Number.isFinite(parsed.pageCount) && parsed.pageCount > 0
      ? parsed.pageCount
      : Number.isFinite(parsed.total) && parsed.total > 0
        ? Math.max(1, Math.ceil((parsed.total as number) / perPage))
        : 1;

  const totalSafe = Number.isFinite(parsed.total) ? (parsed.total as number) : NaN;

  return { total: totalSafe, pageNow: pageNowSafe, pageCount: pageCountSafe };
}

test.describe('Productos — total filtrado, paginación y LCP priority', () => {
  test('1) Sin filtros: contador visible y consistente (perPage=99: total == cards)', async ({
    page,
  }) => {
    const perPage = 99;
    await page.goto(url('/productos', { perPage }));
    await waitForCatalog(page);

    const cards = await countCards(page);
    const { total, pageNow, pageCount } = await getCounter(page, { perPage }, { perPage });

    expect(total).toBe(cards);
    expect(pageNow).toBe(1);
    expect(pageCount).toBe(1);

    await expect
      .poll(
        async () => {
          const body = await page.evaluate(
            () => (document.body && (document.body.innerText || document.body.textContent)) || '',
          );
          return paginaRe(1, 1).test(body);
        },
        { timeout: 10_000 },
      )
      .toBeTruthy();
  });

  test('2) Con filtros (perPage=1): contador y paginación usan el mismo totalForView', async ({
    page,
  }) => {
    const perPage = 1;
    await page.goto(url('/productos', { onSale: 1, match: 'all', perPage }));
    await waitForCatalog(page);

    const cards = await countCards(page);
    if (cards === 0)
      test.skip(true, 'No hay productos con onSale=1 en este entorno; se salta la prueba.');

    const { total, pageCount } = await getCounter(page, { perPage }, { perPage });
    const expectedPages =
      !Number.isNaN(total) && total > 0
        ? Math.max(1, Math.ceil(total / perPage))
        : Math.max(1, pageCount);

    expect(pageCount).toBe(expectedPages);
    expect(cards).toBe(1);
  });

  test('3) Con filtros + perPage=1: "Página X de Y" refleja la navegación a page=2 cuando corresponde', async ({
    page,
  }) => {
    const perPage = 1;

    await page.goto(url('/productos', { onSale: 1, match: 'all', perPage }));
    await waitForCatalog(page);

    const c1 = await getCounter(page, { perPage }, { perPage });
    const expectedPages =
      !Number.isNaN(c1.total) && c1.total > 0
        ? Math.max(1, Math.ceil(c1.total / perPage))
        : Math.max(1, c1.pageCount);

    if (expectedPages > 1) {
      await page.goto(url('/productos', { onSale: 1, match: 'all', perPage, page: 2 }));
      await waitForCatalog(page);

      const c2 = await getCounter(page, { perPage }, { perPage });
      expect(c2.pageNow).toBe(2);
      expect(c2.pageCount).toBe(expectedPages);

      await expect
        .poll(
          async () => {
            const body = await page.evaluate(
              () => (document.body && (document.body.innerText || document.body.textContent)) || '',
            );
            return paginaRe(2, expectedPages).test(body);
          },
          { timeout: 10_000 },
        )
        .toBeTruthy();
    } else {
      const c2 = await getCounter(page, { perPage }, { perPage });
      expect(c2.pageNow).toBe(1);
      expect(c2.pageCount).toBe(1);

      await expect
        .poll(
          async () => {
            const body = await page.evaluate(
              () => (document.body && (document.body.innerText || document.body.textContent)) || '',
            );
            return paginaRe(1, 1).test(body);
          },
          { timeout: 10_000 },
        )
        .toBeTruthy();

      test.skip(true, 'Solo hay una página con onSale=1; no aplica navegar a page=2.');
    }
  });

  test('4) LCP: en página 1 hay entre 1 y 5 imágenes sin loading="lazy"', async ({ page }) => {
    await page.goto(url('/productos', { page: 1 }));
    await waitForCatalog(page);

    const nonLazy = await page.locator('img:not([loading="lazy"])').count();
    expect(nonLazy).toBeGreaterThanOrEqual(1);
    expect(nonLazy).toBeLessThanOrEqual(5);
  });

  test('5) LCP: en página 2 todas las imágenes son lazy (0 con prioridad)', async ({ page }) => {
    await page.goto(url('/productos', { page: 2 }));
    await waitForCatalog(page);

    const nonLazy = await page.locator('img:not([loading="lazy"])').count();
    expect(nonLazy).toBe(0);
  });
});
