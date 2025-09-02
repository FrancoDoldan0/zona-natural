export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function formatPrice(cents?: number | null, currency = "USD", locale = "es-AR") {
  if (cents == null) return "";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
