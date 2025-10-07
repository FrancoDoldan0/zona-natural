'use client';

import Link from 'next/link';
import CategoriesChips from './CategoriesChips';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname() || '/';

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const navLink = (href: string, label: string) =>
    (
      <Link
        href={href}
        className={`transition hover:text-brand ${
          isActive(href) ? 'text-brand font-medium' : ''
        }`}
      >
        {label}
      </Link>
    );

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b will-change-transform">
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
          {navLink('/productos', 'Productos')}
          {navLink('/ofertas', 'Ofertas')}
          {navLink('/catalogo', 'Catálogo')}
        </nav>
      </div>

      <div className="border-t">
        {/* Si la API devuelve vacío, el componente no renderiza nada */}
        <CategoriesChips />
      </div>
    </header>
  );
}
