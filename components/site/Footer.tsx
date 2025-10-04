// components/site/Footer.tsx
import Link from "next/link";

export const runtime = "edge";

export default function Footer() {
  return (
    <footer className="border-t mt-10">
      <div className="container py-8 text-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>© {new Date().getFullYear()} Zona Natural</div>
        <nav className="flex items-center gap-4">
          <Link href="/productos" className="hover:text-brand">Productos</Link>
          <Link href="/ofertas" className="hover:text-brand">Ofertas</Link>
          <Link href="/catalogo" className="hover:text-brand">Catálogo</Link>
        </nav>
      </div>
    </footer>
  );
}
