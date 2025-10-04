export const runtime = "edge";

import Link from "next/link";
import CategoriesChips from "./CategoriesChips";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="container h-16 flex items-center gap-4">
        <Link href="/" className="font-semibold text-lg">
          Zona Natural
        </Link>

        <form action="/productos" className="flex-1 max-w-xl">
          <input
            name="q"
            placeholder="Buscar productos…"
            className="w-full h-10 rounded-xl border px-3"
          />
        </form>

        <nav className="hidden md:flex items-center gap-4">
          <Link href="/productos" className="hover:text-brand">
            Productos
          </Link>
          <Link href="/ofertas" className="hover:text-brand">
            Ofertas
          </Link>
          <Link href="/catalogo" className="hover:text-brand">
            Catálogo
          </Link>
        </nav>
      </div>

      {/* Chips dinámicos de categorías */}
      <div className="border-t">
        {/* Si la API devuelve vacío, el componente no renderiza nada */}
        {/* @ts-expect-error Async Server Component */}
        <CategoriesChips />
      </div>
    </header>
  );
}
