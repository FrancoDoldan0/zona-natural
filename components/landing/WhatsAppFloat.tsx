// components/landing/WhatsAppFloat.tsx
export default function WhatsAppFloat() {
  // número actual (E.164 sin +)
  const phone = "59897531583";
  const text = encodeURIComponent(
    "¡Hola! Vengo de la web de Zona Natural y quiero hacer un pedido 😊"
  );

  return (
    <a
      href={`https://wa.me/${phone}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir WhatsApp de Zona Natural"
      title="Escríbenos por WhatsApp"
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] grid place-items-center h-12 w-12 rounded-full bg-emerald-700 text-white shadow-lg ring-1 ring-emerald-800/30 hover:bg-emerald-800 transition-colors"
    >
      {/* Ícono WhatsApp (glyph sin círculo) */}
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M16.313 13.272c-.279-.139-1.648-.812-1.902-.904-.254-.093-.438-.139-.623.139-.186.279-.716.904-.877 1.09-.161.186-.323.209-.602.07-.279-.14-1.18-.435-2.25-1.385-.83-.74-1.39-1.656-1.55-1.935-.16-.279-.017-.43.122-.569.125-.125.279-.323.418-.484.139-.161.186-.279.279-.465.094-.186.047-.349-.023-.488-.07-.139-.623-1.504-.853-2.062-.224-.537-.451-.465-.623-.474-.161-.007-.347-.009-.532-.009-.186 0-.488.07-.744.349-.256.279-.976.953-.976 2.323s.999 2.695 1.137 2.882c.139.186 1.964 2.992 4.742 4.191.663.286 1.18.457 1.583.586.665.212 1.272.182 1.753.111.535-.08 1.648-.673 1.881-1.322.233-.649.233-1.205.163-1.322-.07-.116-.256-.186-.535-.325z"
        />
      </svg>

      <span className="sr-only">WhatsApp</span>
    </a>
  );
}
