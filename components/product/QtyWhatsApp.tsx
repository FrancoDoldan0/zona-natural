// components/product/QtyWhatsApp.tsx
"use client";

import { useMemo, useState } from "react";

export default function QtyWhatsApp({
  phoneE164,        // "59897531583"
  productTitle,
  productUrl,       // URL absoluta al producto (para incluir en el mensaje)
  disabled = false,
}: {
  phoneE164: string;
  productTitle: string;
  productUrl: string;
  disabled?: boolean;
}) {
  const [qty, setQty] = useState<number>(1);

  const href = useMemo(() => {
    const text =
      `Hola! Quiero pedir este producto:\n` +
      `• ${productTitle}\n` +
      `• Cantidad: ${qty}\n` +
      `• Link: ${productUrl}`;
    return `https://wa.me/${phoneE164}?text=${encodeURIComponent(text)}`;
  }, [phoneE164, productTitle, productUrl, qty]);

  return (
    <div className="flex items-center gap-3">
      {/* selector de cantidad */}
      <div className="inline-flex items-center rounded-full border border-emerald-200 overflow-hidden">
        <button
          type="button"
          className="px-3 py-2 text-lg disabled:opacity-40"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={disabled || qty <= 1}
          aria-label="Disminuir cantidad"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="w-14 text-center outline-none py-2"
          aria-label="Cantidad"
        />
        <button
          type="button"
          className="px-3 py-2 text-lg disabled:opacity-40"
          onClick={() => setQty((q) => Math.min(999, q + 1))}
          disabled={disabled}
          aria-label="Aumentar cantidad"
        >
          +
        </button>
      </div>

      {/* CTA WhatsApp */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={
          "rounded-full px-5 py-2.5 text-white text-sm font-medium transition-colors " +
          (disabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-emerald-700 hover:bg-emerald-800")
        }
        aria-disabled={disabled}
      >
        Consultar por WhatsApp
      </a>
    </div>
  );
}
