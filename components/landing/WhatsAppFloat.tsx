// components/landing/WhatsAppFloat.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function WhatsAppFloat() {
  // Teléfono en E.164 sin "+". Si existe, toma NEXT_PUBLIC_WA_PHONE
  const phone =
    (process.env.NEXT_PUBLIC_WA_PHONE as string) || "59897531583";

  const text = encodeURIComponent(
    "¡Hola! Vengo de la web de Zona Natural y quiero hacer un pedido 😊"
  );

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 8) setVisible(false);     // ocultar al bajar
      else if (y < lastY - 8) setVisible(true); // mostrar al subir
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a
        href={`https://wa.me/${phone}?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir WhatsApp de Zona Natural"
        title="Escríbenos por WhatsApp"
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] block
          transition-all duration-200
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}
          nudge`}
      >
        <span className="sr-only">WhatsApp</span>

        {/* Variante B: imagen con colita, SIN recortar en círculo */}
        <div className="h-14 w-14 drop-shadow-lg group-hover:scale-105">
          <Image
            src="/wa-bubble.png"       // poné tu PNG en /public/wa-bubble.png
            alt="WhatsApp"
            width={56}
            height={56}
            className="h-full w-full object-contain pointer-events-none select-none"
            priority={false}
          />
        </div>
      </a>

      {/* Nudge/bounce sutil sin libs */}
      <style jsx>{`
        @keyframes zn-nudge {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-2px); }
        }
        .nudge { will-change: transform, opacity; }
        @media (prefers-reduced-motion: no-preference) {
          .nudge { animation: zn-nudge 3.2s ease-in-out infinite; }
        }
        @media (prefers-reduced-motion: reduce) {
          .nudge { animation: none; }
        }
      `}</style>
    </>
  );
}
