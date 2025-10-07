'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Category = {
  id?: string | number;
  name?: string;
  slug?: string;
  image?: string | null;
};

export default function CategoriesChips() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();

    async function run() {
      try {
        // En cliente, relative path funciona (mismo dominio)
        const res = await fetch('/api/public/categories', { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: any = await res.json();
        const list: Category[] = Array.isArray(data)
          ? data
          : (data?.items ?? data?.data ?? []);
        setCats(Array.isArray(list) ? list : []);
      } catch {
        setCats([]);
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => ctrl.abort();
  }, []);

  if (loading || !cats.length) return null;

  return (
    <div className="container py-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {cats.map((c, i) => {
        const name = c.name ?? 'Categoría';
        const slug =
          c.slug ??
          name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-');

        return (
          <Link
            key={(c as any).id ?? slug ?? i}
            href={`/categoria/${slug}`}
            className="px-3 py-1 rounded-full border text-sm hover:bg-brand/10 whitespace-nowrap"
          >
            {name}
          </Link>
        );
      })}
    </div>
  );
}
