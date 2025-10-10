// lib/metrics.ts
/** Incrementa el contador de clics de un producto en localStorage (por slug) */
export function bumpProductClick(slug?: string) {
  if (typeof window === "undefined" || !slug) return;
  try {
    const key = `clicks:${slug}`;
    const n = Number(localStorage.getItem(key) || "0") + 1;
    localStorage.setItem(key, String(n));

    // índice agregado para lectura rápida
    const idxRaw = localStorage.getItem("clicks:index");
    const idx = idxRaw ? JSON.parse(idxRaw) : {};
    idx[slug] = n;
    localStorage.setItem("clicks:index", JSON.stringify(idx));
  } catch {}
}

/** Devuelve el mapa { slug: clicks } de localStorage */
export function getClicksMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const idxRaw = localStorage.getItem("clicks:index");
    return idxRaw ? JSON.parse(idxRaw) : {};
  } catch {
    return {};
  }
}
