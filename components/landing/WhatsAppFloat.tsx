// components/landing/WhatsAppFloat.tsx
export default function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/59899608808"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp Zona Natural"
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] grid place-items-center h-12 w-12 rounded-full bg-emerald-700 text-white shadow-lg hover:bg-emerald-800"
    >
      {/* ícono simple (emoji para no depender de libs) */}
      <span className="text-2xl">🟢</span>
    </a>
  );
}
