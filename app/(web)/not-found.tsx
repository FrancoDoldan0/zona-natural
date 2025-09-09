// app/(web)/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="opacity-80">Lo sentimos, no pudimos encontrar lo que buscabas.</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Volver al inicio
      </Link>
    </main>
  );
}
