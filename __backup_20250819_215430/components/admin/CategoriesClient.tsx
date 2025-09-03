'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Cat = { id: string; name: string; slug: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export default function CategoriesClient({ initial }: { initial: Cat[] }) {
  const r = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name, slug: slug || undefined }),
          });
          if (res.ok) {
            setName('');
            setSlug('');
            r.refresh();
          }
        }}
        className="flex gap-2 items-end"
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
        <button className="rounded bg-black text-white px-4 py-2">Crear</button>
      </form>

      <table className="w-full text-sm border mt-6">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-2 border-r">Nombre</th>
            <th className="text-left p-2 border-r">Slug</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {initial.map((c) => (
            <Row key={c.id} cat={c} onDone={() => r.refresh()} />
          ))}
        </tbody>
      </table>
    </>
  );
}

function Row({ cat, onDone }: { cat: Cat; onDone: () => void }) {
  const [n, setN] = useState(cat.name);
  const [s, setS] = useState(cat.slug);

  return (
    <tr className="border-t">
      <td className="p-2 border-r w-[40%]">
        <input
          className="border rounded px-2 py-1 w-full"
          value={n}
          onChange={(e) => setN(e.target.value)}
        />
      </td>
      <td className="p-2 border-r w-[40%]">
        <input
          className="border rounded px-2 py-1 w-full"
          value={s}
          onChange={(e) => setS(slugify(e.target.value))}
        />
      </td>
      <td className="p-2">
        <button
          className="rounded bg-gray-800 text-white px-3 py-1"
          onClick={async () => {
            const res = await fetch(`/api/admin/categories/${cat.id}`, {
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
            if (!confirm('¿Eliminar categoría?')) return;
            const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
            if (res.ok) onDone();
          }}
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}
