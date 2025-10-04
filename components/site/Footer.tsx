export const runtime = "edge";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="container py-10 grid gap-6 md:grid-cols-3 text-sm text-ink-500">
        <div>
          <div className="font-semibold text-ink-900 mb-2">Zona Natural</div>
          <p>Catálogo y ofertas.</p>
        </div>
        <div>
          <div className="font-semibold text-ink-900 mb-2">Secciones</div>
          <ul className="space-y-1">
            <li><Link href="/productos" className="hover:text-brand">Productos</Link></li>
            <li><Link href="/ofertas" className="hover:text-brand">Ofertas</Link></li>
            <li><Link href="/catalogo" className="hover:text-brand">Catálogo</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-ink-900 mb-2">Contacto</div>
          <ul className="space-y-1">
            <li><a href="https://wa.me/598..." target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
            <li><a href="https://instagram.com/..." target="_blank" rel="noopener noreferrer">Instagram</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Zona Natural
      </div>
    </footer>
  );
}
