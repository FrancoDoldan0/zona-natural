// components/cart/CartButton.tsx
"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export default function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/carrito"
      className="relative flex items-center gap-2 rounded-full ring-1 ring-emerald-200 px-3 py-1 hover:bg-emerald-50"
      aria-label={`Carrito (${count})`}
    >
      {/* Ícono simple */}
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4h-2l-1 2h2l3.6 7.59-1.35 2.45A2 2 0 0 0 10.08 19h8.92v-2h-8.42l.93-1.68h5.99a2 2 0 0 0 1.79-1.1l3.58-6.82H7.42L7 4Z"
          fill="currentColor"
        />
      </svg>
      <span>Carrito</span>
      <span className="ml-1 rounded-full bg-emerald-600 px-2 text-xs text-white">{count}</span>
    </Link>
  );
}
