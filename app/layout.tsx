// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zona Natural',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-slate-50 text-slate-900 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
