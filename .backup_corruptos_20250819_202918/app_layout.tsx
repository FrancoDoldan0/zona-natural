export const runtime = 'edge';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ZONA NATURAL',
  description: 'App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
