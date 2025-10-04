// components/site/Header.tsx
import Link from "next/link";

export const runtime = "edge";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="container h-16 flex items-center gap-4">
        <Link href="/" className="font-semibold text-lg">Zona Natural</Link>

        <form action="/productos" className="flex-1 max-w-xl">
          <input
            name="q"
            placeholder="Buscar productos…"
            className="w-full h-10 rounded-xl border px-3"
          />
        </form>

        <nav className="hidden md:flex items-center gap-4">
          <Link href="/productos" className="hover:text-brand">Productos</Link>
          <Link href="/ofertas" className="hover:text-brand">Ofertas</Link>
          <Link href="/catalogo" className="hover:text-brand">Catálogo</Link>
        </nav>
      </div>

      <div className="border-t">
        <div className="container py-2 flex gap-2 overflow-x-auto">
          {/* chips de categorías */}
          <Link className="px-3 py-1 rounded-full border text-sm hover:bg-brand/10" href="/categoria/almacen">Almacén</Link>
          <Link className="px-3 py-1 rounded-full border text-sm hover:bg-brand/10" href="/categoria/frutos-secos">Frutos secos</Link>
          {/* … */}
        </div>
      </div>
    </header>
  );
}
