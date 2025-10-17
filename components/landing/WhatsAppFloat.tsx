// components/landing/WhatsAppFloat.tsx
"use client";

import { useEffect, useState } from "react";

/** Logo oficial (círculo verde + burbuja blanca) */
function WhatsAppMarkCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" {...props}>
      {/* Círculo verde */}
      <path
        fill="#25D366"
        d="M256 0C114.6 0 0 114.6 0 256c0 45.2 11.8 89.1 34.2 127.8L0 512l132.6-34.6C170.2 500.7 212.2 512 256 512c141.4 0 256-114.6 256-256S397.4 0 256 0z"
      />
      {/* Burbuja/auricular blanco (marca simplificada) */}
      <path
        fill="#FFFFFF"
        d="M379.7 338.7c-5.2 14.8-23.7 27.2-38.7 31.1-20.6 5.2-47.6 9.7-139.3-26.7-116.2-46.5-141-111.7-144-130.9-3.0-19.2-9.1-61.4 25.0-97.5 16.8-17.5 38.1-26.6 62.4-26.6 7.3 0 14.0.6 20.2 1.3 6.5.7 12.2 4.9 15 10.8 11.4 24.8 34.0 78.4 36.7 84.1 2.7 5.7 2.3 12.3-1.2 17.5-3.2 4.8-6.6 9.7-10.0 13.6-4.3 5.2-8.8 10.7-8.3 14.5 1.3 9.5 21.1 32.4 40.3 44.7 21.3 13.6 38.5 18.4 47.6 20.4 4.1.9 9.0-1.4 12.6-4.8 4.4-4.2 12.1-12.9 15.7-17.3 3.7-4.4 8.6-5.4 13.7-3.7 5.1 1.8 32.3 15.3 38.0 18.4 5.7 3.1 9.4 5.1 10.2 8.5.9 3.3-.3 13.1-2.8 20.1z"
      />
    </svg>
  );
}

export default function WhatsAppFloat() {
  // Teléfono en E.164 sin "+"; si definís NEXT_PUBLIC_WA_PHONE lo toma primero.
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
      const down = y > lastY + 8;
      const up = y < lastY - 8;
      if (down) setVisible(false);
      else if (up) setVisible(true);
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
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] group
          transition-all duration-200
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}
          nudge`}
      >
        <span className="sr-only">WhatsApp</span>

        {/* Contenedor con sombra/hover; el color ya lo trae el SVG */}
        <div className="h-12 w-12 rounded-full shadow-lg ring-1 ring-black/5 group-hover:scale-105">
          <WhatsAppMarkCircle className="h-12 w-12" />
        </div>
      </a>

      {/* Nudge/bounce sutil sin libs */}
      <style jsx>{`
        @keyframes zn-nudge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
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
