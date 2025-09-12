// app/admin/page.tsx
export const runtime = 'edge';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type Section = {
  title: string;
  href: string;
  desc?: string;
  emoji: string;
};

const SECTIONS: Section[] = [
  { title: 'Productos',      href: '/admin/productos',      desc: 'Crear, editar y eliminar', emoji: '📦' },
  { title: 'Categorías',     href: '/admin/categorias',     desc: 'Organiza el catálogo',     emoji: '🗂️' },
  { title: 'Subcategorías',  href: '/admin/subcategorias',  desc: 'Refina la estructura',     emoji: '🧭' },
  { title: 'Banners',        href: '/admin/banners',        desc: 'Home & carruseles',        emoji: '🖼️' },
  { title: 'Ofertas',        href: '/admin/ofertas',        desc: 'Promos y descuentos',      emoji: '🏷️' },
  { title: 'Uploads',        href: '/admin/uploads',        desc: 'Imágenes del catálogo',    emoji: '⬆️' },
];

export default async function AdminHome() {
  // Guardia extra por si alguien entra directo sin cookie (el layout ya protege, esto es “cinturón y tirantes”).
  const token =
    cookies().get('admin_token')?.value ??
    cookies().get('__session')?.value ??
    cookies().get('token')?.value ??
    null;

  if (!token) {
    redirect('/admin/login?next=/admin');
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel de administración</h1>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 transition"
          >
            ← Ver sitio
          </Link>
          {/* GET /api/auth/logout ya borra cookie y redirige al login */}
          <Link
            href="/api/auth/logout"
            className="rounded-lg border px-3 py-1.5 text-red-600 hover:bg-red-50 transition"
          >
            Cerrar sesión
          </Link>
        </nav>
      </header>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-2xl border p-5 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/10"
          >
            <div className="text-3xl">{s.emoji}</div>
            <h2 className="mt-3 text-lg font-medium">{s.title}</h2>
            {s.desc ? (
              <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
            ) : null}
            <div className="mt-4 text-sm text-blue-600 opacity-0 transition group-hover:opacity-100">
              Ir a {s.title} →
            </div>
          </Link>
        ))}
      </section>

      <p className="mt-8 text-xs text-gray-400">
        Nota: protegido por middleware y runtime Edge.
      </p>
    </main>
  );
}
