// lib/cart.ts
export type CartItem = {
  // 🆕 clave única por producto+variante
  itemKey: string;
  slug: string;
  title: string;
  price: number | null; // en pesos (consistente con fmtPrice)
  image?: string | null;
  productUrl?: string | null;
  qty: number;

  // 🆕 variante (opcionales si no hay variantes)
  variantId?: number | null;
  variantLabel?: string | null;
  variantSku?: string | null;
};

export const CART_KEY = "zn_cart_v1";

// 🆕 helper clave
export function buildItemKey(slug: string, variantId?: number | null) {
  return `${slug}:${variantId ?? "base"}`;
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? (JSON.parse(raw) as any[]) : [];
    if (!Array.isArray(arr)) return [];

    // 🆕 migración suave: si no hay itemKey, lo generamos
    const mapped: CartItem[] = arr.map((x) => {
      const slug = String(x.slug || "");
      const variantId =
        typeof x.variantId === "number" ? x.variantId
        : x.variantId == null ? null
        : Number(x.variantId);
      const itemKey: string = x.itemKey || buildItemKey(slug, variantId ?? null);
      const qty = Math.max(1, Math.floor(Number(x.qty || 1)));

      return {
        itemKey,
        slug,
        title: String(x.title || ""),
        price: x.price == null ? null : Number(x.price),
        image: x.image ?? null,
        productUrl: x.productUrl ?? null,
        qty,
        variantId: variantId ?? null,
        variantLabel: x.variantLabel ?? null,
        variantSku: x.variantSku ?? null,
      };
    });

    return mapped;
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("zn:cart")); // sincroniza otros componentes
  } catch {}
}

export function countItems(items: CartItem[]) {
  return items.reduce((n, it) => n + (it.qty || 0), 0);
}

export function subTotal(items: CartItem[]) {
  // precios en pesos → total en pesos
  return items.reduce((sum, it) => sum + (Number(it.price || 0) * (it.qty || 0)), 0);
}
