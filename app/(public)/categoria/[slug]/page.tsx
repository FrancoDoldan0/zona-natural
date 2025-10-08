// app/(public)/categoria/[slug]/page.tsx
export const runtime = 'edge';

import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';

async function abs(path: string) {
  if (path.startsWith('http')) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (base) return `${base}${path}`;
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host  = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  return `${proto}://${host}${path}`;
}

type Cat = { id:number; name:string; slug:string };

async function fetchCats(): Promise<Cat[]> {
  try {
    const res = await fetch(await abs('/api/public/categories'), { next: { revalidate: 300 } });
    const data: any = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return list as Cat[];
  } catch {
    return [];
  }
}

export default async function Page({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cats = await fetchCats();
  const s = decodeURIComponent(slug).toLowerCase();
  const found = cats.find(c => (c.slug || '').toLowerCase() === s);
  if (!found) notFound();

  // Redirige al catálogo filtrado por categoría
  redirect(`/catalogo?categoryId=${found.id}`);
}
