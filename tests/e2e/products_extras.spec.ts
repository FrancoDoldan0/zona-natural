import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const url = (p: string, qs: Record<string, any> = {}) => {
  const u = new URL(p, BASE);
  for (const [k, v] of Object.entries(qs)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach(x => u.searchParams.append(k, String(x)));
    else u.searchParams.set(k, String(v));
  }
  return u.toString();
};

async function waitForCatalog(page: Page, timeout = 60_000) {
  await page.waitForLoadState("domcontentloaded");
  try { await page.waitForLoadState("networkidle", { timeout: Math.min(10_000, Math.floor(timeout/2)) }); } catch {}
  await page.waitForFunction(() => {
    const hasCards = !!document.querySelector('a[href^="/producto/"]');
    const t = (document.body && (document.body.innerText || document.body.textContent)) || "";
    return hasCards || /\d+\s*resultados/i.test(t);
  }, null, { timeout });
}

test.describe("Productos - extras (search & WhatsApp)", () => {
  test("Filtro por búsqueda (q): devuelve resultados coherentes", async ({ page }) => {
    await page.goto(url("/productos", { perPage: 20 }));
    await waitForCatalog(page);

    // Extraer una palabra del primer card para usarla como q
    const firstCard = page.locator('a[href^="/producto/"]').first();
    await firstCard.waitFor();
    const text = (await firstCard.innerText()).trim();
    const term = (text.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/g) || [])[0];

    if (!term) test.skip(true, "No se pudo extraer término de búsqueda del primer card.");

    await page.goto(url("/productos", { q: term, perPage: 20 }));
    await waitForCatalog(page);

    const cards = await page.locator('a[href^="/producto/"]').count();
    expect(cards).toBeGreaterThan(0);

    // Al menos un card contiene el término (case-insensitive)
    let matches = 0;
    for (let i=0; i<cards; i++) {
      const txt = (await page.locator('a[href^="/producto/"]').nth(i).innerText()).toLowerCase();
      if (txt.includes(term.toLowerCase())) matches++;
    }
    expect(matches).toBeGreaterThan(0);
  });

  test("Producto: botón WhatsApp incluye slug y qty; cambia al editar cantidad", async ({ page }) => {
    await page.goto(url("/productos"));
    await waitForCatalog(page);

    const first = page.locator('a[href^="/producto/"]').first();
    await first.click();

    await page.waitForURL("**/producto/**");
    const slug = new URL(page.url()).pathname.split("/").pop()!;

    const wa = page.locator('a[href^="/api/public/wa"]');
    await wa.first().waitFor();

    // Incluye slug y qty=1 por defecto
    const href1 = await wa.getAttribute("href");
    expect(href1).toBeTruthy();
    expect(href1!).toMatch(new RegExp(`slug=${slug}`));
    expect(href1!).toMatch(/(?:\?|&)qty=1(?:&|$)/);

    // Cambiar cantidad a 3 (input del componente BuyViaWhatsApp)
    const qtyInput = page.locator('input#qty[type="number"]');
    if (await qtyInput.count() === 0) test.skip(true, "No se encontró el input de cantidad (#qty).");

    await qtyInput.fill("3");

    // Esperar a que el href refleje qty=3
    await expect
      .poll(async () => (await wa.getAttribute("href")) || "")
      .toMatch(/(?:\?|&)qty=3(?:&|$)/);
  });
});