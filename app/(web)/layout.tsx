// app/(web)/layout.tsx
import Link from 'next/link';

export const runtime = 'edge';

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b">
        <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="font-semibold hover:underline">
            Inicio
          </Link>
          <Link href="/productos" className="hover:underline">
            Productos
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
