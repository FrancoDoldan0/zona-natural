import type { Metadata } from 'next';

const siteUrl = ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"};

export const metadata: Metadata = {
  alternates: {
    canonical: ${siteUrl}/productos,
  },
};

export default function ProductosLayout({ children }: { children: React.ReactNode }) {
  return children;
}