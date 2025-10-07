"use client";

import Link from "next/link";
import CategoriesChips from "./CategoriesChips";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function Header() {
  const pathname = usePathname() || "/";

  // Ocultar chips en la landing y en la home
  const isLanding =
    pathname === "/" ||
    pathname === "/landing" ||
    pathname.startsWith("/landing/");

  const showChips = !isLanding;

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
          <Link href="/productos">Productos</Link>
          <Link href="/ofertas">Ofertas</Link>
          <Link href="/catalogo">Catálogo</Link>
        </nav>
      </div>

      {/* Chips de categorías: solo en páginas que NO sean la landing/home */}
      <div className={clsx(showChips ? "border-t" : "hidden")}>
        {showChips && <CategoriesChips />}
      </div>
    </header>
  );
}
