// app/admin/page.tsx
export const runtime = 'edge';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminHome() {
  // En Edge/Next 15 cookies() es async
  const store = await cookies();

  // Doble cinturón: si alguien llega aquí sin cookie, redirigimos al login
  const token =
    store.get('admin_token')?.value ??
    store.get('__session')?.value ??
    store.get('token')?.value ??
    null;

  if (!token) {
    redirect('/admin/login?next=/admin');
  }

  const items = [
    { href: '/admin/productos', title: 'Productos', desc: 'Crear, editar, filtrar' },
    { href: '/admin/ofertas', title: 'Ofertas', desc: 'Promos por % o $' },
    { href: '/admin/categorias', title: 'Categorías', desc: 'Gestionar categorías' },
    { href: '/admin/subcategorias', title: 'Subcategorías', desc: 'Gestionar subcategorías' },
    { href: '/admin/banners', title: 'Banners', desc: 'Carrusel / landing' },
    { href: '/admin/uploads', title: 'Uploads', desc: 'Archivos e imágenes' },
  ];

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Panel de administración</h1>
      <p className="text-sm text-gray-600 mb-6">
        Accesos rápidos a las secciones del panel.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="block rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
          >
            <div className="text-lg font-medium">{it.title}</div>
            <div className="text-sm text-gray-600 mt-1">{it.desc}</div>
          </Link>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Nota: la protección real de rutas la cubren el <code>middleware</code> y el <code>layout</code> de /admin.
      </p>
    </main>
  );
}
