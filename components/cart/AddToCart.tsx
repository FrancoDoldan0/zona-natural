// components/cart/AddToCart.tsx
"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

type Props = {
  slug: string;
  title: string;
  price: number | null;
  image?: string | null;
  productUrl?: string | null;
  disabled?: boolean;

  // 🆕 variantes (opcionales si el producto no usa variantes)
  variantId?: number | null;
  variantLabel?: string | null;
  variantSku?: string | null;
};

export default function AddToCart({
  slug,
  title,
  price,
  image,
  productUrl,
  disabled,
  variantId,
  variantLabel,
  variantSku,
}: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const dec = () => setQty((n) => Math.max(1, n - 1));
  const inc = () => setQty((n) => Math.min(99, n + 1));

  const onAdd = () => {
    add({
      slug,
      title,
      price,
      image: image ?? undefined,
      productUrl: productUrl ?? undefined,
      qty,
      // 🆕 datos de variante
      variantId: variantId ?? undefined,
      variantLabel: variantLabel ?? undefined,
      variantSku: variantSku ?? undefined,
    });
    setQty(1);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center overflow-hidden rounded-full ring-1 ring-emerald-200">
        <button
          type="button"
            onClick={dec}
            className="px-3 py-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
            disabled={disabled}
          >
            –
          </button>
          <div className="w-10 text-center select-none">{qty}</div>
          <button
            type="button"
            onClick={inc}
            className="px-3 py-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
            disabled={disabled}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Agregar al carrito
        </button>
      </div>
  );
}
