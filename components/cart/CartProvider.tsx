// components/cart/CartProvider.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CartItem, readCart, writeCart, countItems, subTotal, buildItemKey } from "@/lib/cart";

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty" | "itemKey"> & { qty?: number }) => void;
  setQty: (keyOrSlug: string, qty: number) => void;
  remove: (keyOrSlug: string) => void;
  clear: () => void;
  count: number;
  total: number;
};

const Ctx = createContext<CartCtx | null>(null);

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // cargar
  useEffect(() => {
    setItems(readCart());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "zn_cart_v1") setItems(readCart());
    };
    const onCustom = () => setItems(readCart());
    window.addEventListener("storage", onStorage);
    window.addEventListener("zn:cart", onCustom as any);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("zn:cart", onCustom as any);
    };
  }, []);

  const api = useMemo<CartCtx>(() => {
    const persist = (next: CartItem[]) => {
      setItems(next);
      writeCart(next);
    };

    return {
      items,
      add: (it) => {
        const qty = Math.max(1, Math.floor(it.qty ?? 1));

        // 🆕 clave incluye variante
        const itemKey = (it as any).itemKey ?? buildItemKey(it.slug, it.variantId ?? null);

        const idx = items.findIndex((x) => x.itemKey === itemKey);
        if (idx >= 0) {
          const next = [...items];
          next[idx] = {
            ...next[idx],
            qty: next[idx].qty + qty,
            price: it.price ?? next[idx].price,
            image: it.image ?? next[idx].image,
            productUrl: it.productUrl ?? next[idx].productUrl,
            // mantener datos de variante si llegan
            variantId: it.variantId ?? next[idx].variantId,
            variantLabel: it.variantLabel ?? next[idx].variantLabel,
            variantSku: it.variantSku ?? next[idx].variantSku,
          };
          persist(next);
        } else {
          const item: CartItem = {
            itemKey,
            slug: it.slug,
            title: it.title,
            price: it.price ?? null,
            image: it.image,
            productUrl: it.productUrl,
            qty,
            variantId: it.variantId ?? null,
            variantLabel: it.variantLabel ?? null,
            variantSku: it.variantSku ?? null,
          };
          persist([...items, item]);
        }
      },

      // 🆕 acepta itemKey o slug (fallback legacy)
      setQty: (keyOrSlug, qtyRaw) => {
        const qty = Math.max(0, Math.floor(qtyRaw));
        const isKey = keyOrSlug.includes(":");
        const next = items
          .map((x) =>
            (x.itemKey === keyOrSlug || (!isKey && x.slug === keyOrSlug))
              ? { ...x, qty }
              : x
          )
          .filter((x) => x.qty > 0);
        persist(next);
      },

      remove: (keyOrSlug) => {
        const isKey = keyOrSlug.includes(":");
        persist(items.filter((x) => !(x.itemKey === keyOrSlug || (!isKey && x.slug === keyOrSlug))));
      },

      clear: () => persist([]),

      count: countItems(items),
      total: subTotal(items),
    };
  }, [items]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
