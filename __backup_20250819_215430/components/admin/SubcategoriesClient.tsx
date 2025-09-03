'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

type Cat = { id: string; name: string; slug: string };
type Sub = { id: string; name: string; slug: string; categoryId: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export default function SubcategoriesClient({
  initialCats,
  initialSubs,
}: {
  initialCats: Cat[];
  initialSubs: Sub[];
}) {
  const r = useRouter();
  const sp = useSearchParams();
  const selected = sp.get('categoryId') || '';

  const subs = useMemo(
    () => initialSubs.filter((s) => (selected ? s.categoryId === selected : true)),
    [initialSubs, selected],
  );

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState(selected || initialCats[0]?.id || '');

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm">Filtrar por categoría:</span>
        <select
          className="border rounded px-2 py-1"
          value={selected}
          onChange={(e) =>
            r.replace(
              e.target.value
                ? `/admin/subcategorias?categoryId=${e.target.value}`
                : `/admin/subcategorias`,
            )
          }
        >
          <option value="">Todas</option>
          {initialCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch('/api/admin/subcategories', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name, slug: slug || undefined, categoryId }),
          });
          if (res.ok) {
            setName('');
            setSlug('');
            r.refresh();
          }
        }}
        className="mt-4 flex gap-2 items-end"
      >
        <label className="block">
          <span className="text-xs">Nombre</span>
          <input
            className="border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-xs">Slug (opcional)</span>
          <input
            className="border rounded px-3 py-2"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="text-xs">Categoría</span>
          <select
            className="border rounded px-3 py-2"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {initialCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded bg-black text-white px-4 py-2">Crear</button>
      </form>

      <table className="w-full text-sm border mt-6">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-2 border-r">Nombre</th>
            <th className="text-left p-2 border-r">Slug</th>
            <th className="text-left p-2 border-r">Categoría</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <Row key={s.id} sub={s} cats={initialCats} onDone={() => r.refresh()} />
          ))}
        </tbody>
      </table>
    </>
  );
}

function Row({ sub, cats, onDone }: { sub: Sub; cats: Cat[]; onDone: () => void }) {
  const [n, setN] = useState(sub.name);
  const [s, setS] = useState(sub.slug);

  const catName = cats.find((c) => c.id === sub.categoryId)?.name || '—';

  return (
    <tr className="border-t">
      <td className="p-2 border-r w-[30%]">
        <input
          className="border rounded px-2 py-1 w-full"
          value={n}
          onChange={(e) => setN(e.target.value)}
        />
      </td>
      <td className="p-2 border-r w-[30%]">
        <input
          className="border rounded px-2 py-1 w-full"
          value={s}
          onChange={(e) => setS(slugify(e.target.value))}
        />
      </td>
      <td className="p-2 border-r w-[30%]">{catName}</td>
      <td className="p-2">
        <button
          className="rounded bg-gray-800 text-white px-3 py-1"
          onClick={async () => {
            const res = await fetch(`/api/admin/subcategories/${sub.id}`, {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ name: n, slug: s }),
            });
            if (res.ok) onDone();
          }}
        >
          Guardar
        </button>
        <button
          className="ml-2 rounded bg-red-600 text-white px-3 py-1"
          onClick={async () => {
            if (!confirm('¿Eliminar subcategoría?')) return;
            const res = await fetch(`/api/admin/subcategories/${sub.id}`, { method: 'DELETE' });
            if (res.ok) onDone();
          }}
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}
