// lib/price.ts
export function fmtPriceUYU(n?: number | null) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 2,
  }).format(n);
}

export function discountPercent(original?: number | null, final?: number | null) {
  if (original == null || final == null) return null;
  if (original <= 0 || final >= original) return null;
  return Math.round(100 - (final / original) * 100);
}
