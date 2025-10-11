// lib/price.ts
/** Formatea a moneda UYU (o "-" si no hay precio) */
export function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "-";
  try {
    return new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "UYU",
    }).format(Number(n));
  } catch {
    return String(n);
  }
}

/** Porcentaje de descuento redondeado (o null si no aplica) */
export function percentOff(
  finalPrice: number | null | undefined,
  originalPrice: number | null | undefined
): number | null {
  if (finalPrice == null || originalPrice == null) return null;
  const f = Number(finalPrice);
  const o = Number(originalPrice);
  if (!Number.isFinite(f) || !Number.isFinite(o) || o <= 0 || f >= o) return null;
  return Math.round(((o - f) / o) * 100);
}
