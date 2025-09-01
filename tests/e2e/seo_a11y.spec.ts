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

test.describe("SEO & A11Y", () => {
  test("Productos: canonical y JSON-LD presentes", async ({ page }) => {
    await page.goto(url("/productos"));
    await waitForCatalog(page);

    // canonical
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href");
    expect(canonical).toBeTruthy();
    expect(canonical!).toContain("/productos");

    // JSON-LD
    const ld = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(el => {
          try {
            const o = JSON.parse(el.textContent || "{}");
            return { ctx: o["@context"], type: o["@type"] };
          } catch { return {}; }
        });
    });
    expect(ld.length).toBeGreaterThan(0);
    expect(ld.some((x: any) => String(x.ctx||"").toLowerCase().includes("schema.org"))).toBeTruthy();
  });

  test("Producto: canonical + JSON-LD Product", async ({ page }) => {
    await page.goto(url("/productos"));
    await waitForCatalog(page);

    const first = page.locator('a[href^="/producto/"]').first();
    await first.waitFor();
    await first.click();

    await page.waitForURL("**/producto/**");
    const pathname = new URL(page.url()).pathname;

    // canonical
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href");
    expect(canonical).toBeTruthy();
    expect(canonical!).toContain(pathname);

    // JSON-LD Product
    const ld = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(el => {
          try { return JSON.parse(el.textContent || "{}"); } catch { return {}; }
        });
    });
    const hasProduct = ld.some((o: any) => {
      const t = o?.["@type"];
      return t === "Product" || (Array.isArray(t) && t.includes("Product"));
    });
    expect(hasProduct).toBeTruthy();
  });

  test("Productos: imágenes de cards con alt no vacío", async ({ page }) => {
    await page.goto(url("/productos"));
    await waitForCatalog(page);

    const imgs = page.locator('a[href^="/producto/"] img');
    const n = await imgs.count();
    if (n === 0) test.skip(true, "No se encontraron imágenes en las cards.");
    let empties = 0;
    for (let i=0; i<n; i++) {
      const alt = (await imgs.nth(i).getAttribute("alt")) || "";
      if (alt.trim().length === 0) empties++;
    }
    expect(empties).toBe(0);
  });
});