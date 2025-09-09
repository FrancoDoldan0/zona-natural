// app/admin/(panel)/page.tsx
import Link from 'next/link';

export default function AdminPanelPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Panel de administración</h1>

      <ul className="list-disc pl-5 space-y-2">
        <li>
          <Link href="/admin/productos" className="text-blue-600 hover:underline">
            Gestionar productos
          </Link>
        </li>
      </ul>
    </main>
  );
}
