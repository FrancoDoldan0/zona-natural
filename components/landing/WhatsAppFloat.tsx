// components/landing/WhatsAppFloat.tsx

// Teléfono en formato E.164 (sin +)
const PHONE_E164 = "59897531583";

// Mensaje prellenado para iniciar la conversación
const PRESET_MSG = encodeURIComponent(
  "¡Hola! Quiero hacer un pedido desde la web de Zona Natural."
);

export default function WhatsAppFloat() {
  const href = `https://wa.me/${PHONE_E164}?text=${PRESET_MSG}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatear por WhatsApp con Zona Natural"
      title="Chatear por WhatsApp"
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] grid place-items-center h-12 w-12 rounded-full bg-emerald-700 text-white shadow-lg ring-1 ring-black/10 hover:bg-emerald-800 transition"
    >
      {/* Ícono WhatsApp en SVG inline (accesible, sin librerías externas) */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="h-6 w-6"
        role="img"
      >
        <path
          fill="currentColor"
          d="M20.52 3.48A11.77 11.77 0 0 0 9.85.5C4.64.5.5 4.64.5 9.85c0 2.02.52 3.98 1.51 5.7L.5 23.5l7.95-1.49a11.78 11.78 0 0 0 5.4 1.38h.01c5.21 0 9.35-4.14 9.35-9.35 0-2.49-.97-4.83-2.69-6.56ZM9.86 20.51c-1.73 0-3.42-.46-4.9-1.33l-.35-.2-4.7.88.9-4.59-.23-.37A8.79 8.79 0 0 1 1.04 9.86c0-4.86 3.96-8.82 8.82-8.82 2.35 0 4.56.91 6.23 2.58a8.79 8.79 0 0 1 2.58 6.23c0 4.86-3.96 8.82-8.81 8.82Zm4.98-6.63c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.62.14-.18.27-.71.88-.87 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.6-1.5-1.86-.16-.27-.02-.41.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.46h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29 0 1.35.99 2.65 1.12 2.83.14.18 1.95 2.98 4.73 4.18.66.29 1.18.46 1.58.59.66.21 1.27.18 1.75.11.53-.08 1.6-.65 1.83-1.29.23-.64.23-1.19.16-1.29-.07-.11-.25-.18-.53-.32Z"
        />
      </svg>
    </a>
  );
}
