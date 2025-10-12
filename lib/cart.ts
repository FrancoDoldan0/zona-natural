// lib/cart.ts
export type CartItem = {
  slug: string;
  title: string;
  price: number | null; // puede venir null
  image?: string | null;
  productUrl?: string | null;
  qty: number;
};

export const CART_KEY = "zn_cart_v1";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(arr) ? arr : [];
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
  return items.reduce((sum, it) => sum + (Number(it.price || 0) * (it.qty || 0)), 0);
}
