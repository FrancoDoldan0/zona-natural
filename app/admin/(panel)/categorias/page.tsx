// app/admin/(panel)/categorias/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Category = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  imageKey?: string | null;
};

const R2_BASE =
  (process.env.NEXT_PUBLIC_R2_BASE_URL || process.env.PUBLIC_R2_BASE_URL || '').replace(/\/+$/, '');

function resolveImage(imageUrl?: string | null, imageKey?: string | null) {
  const url = (imageUrl || '').trim();
  if (url && /^https?:\/\//i.test(url)) return url;
  const key = (imageKey || '').trim().replace(/^\/+/, '');
  if (key && R2_BASE) return `${R2_BASE}/${key}`;
  // como fallback, si imageUrl es relativo y existe base, no lo tocamos (puede fallar)
  return url || '';
}

export default function CategoriasPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [q, setQ] = useState('');

  // edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [eName, setEName] = useState('');
  const [eSlug, setESlug] = useState('');
  const [eImageUrl, setEImageUrl] = useState('');
  const [eImageKey, setEImageKey] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const u = new URLSearchParams();
      if (q.trim()) u.set('q', q.trim());
      const res = await fetch(`/api/admin/categories?${u.toString()}`, { cache: 'no-store' });
      const data = await res.json<any>();
      if (data.ok) setItems(data.items);
      else setErr(data.error || 'Error al cargar');
    } catch (e: any) {
      setErr(e?.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const body: any = { name: name.trim() };
      if (slug.trim()) body.slug = slug.trim();
      if (imageUrl.trim()) body.imageUrl = imageUrl.trim();
      if (imageKey.trim()) body.imageKey = imageKey.trim();

      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json<any>();
      if (res.status === 409 && data?.error === 'slug_taken') {
        throw new Error(`El slug ya existe${data?.detail?.target ? ` (${data.detail.target})` : ''}`);
      }
      if (!data.ok) throw new Error(data.error || 'Error al crear categoría');

      setName('');
      setSlug('');
      setImageUrl('');
      setImageKey('');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error al crear');
    }
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEName(c.name);
    setESlug(c.slug);
    setEImageUrl(c.imageUrl || '');
    setEImageKey(c.imageKey || '');
    setErr(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEName('');
    setESlug('');
    setEImageUrl('');
    setEImageKey('');
  }

  async function saveEdit(id: number) {
    try {
      setErr(null);
      const body: any = {};
      if (typeof eName === 'string') body.name = eName.trim();
      if (typeof eSlug === 'string') body.slug = eSlug; // "" -> recalculará en API
      body.imageUrl = eImageUrl.trim() || null;
      body.imageKey = eImageKey.trim() || null;

      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json<any>();
      if (res.status === 409 && data?.error === 'slug_taken') {
        throw new Error('El slug ya existe');
      }
      if (!data.ok) throw new Error(data.error || 'No se pudo guardar');

      cancelEdit();
      await load();
    } catch (e: any) {
      setErr(e?.message || 'No se pudo guardar');
    }
  }

  async function onDelete(id: number) {
    if (!confirm('¿Eliminar categoría (y sus subcategorías)?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const data = await res.json<any>();
      if (data.ok) setItems((prev) => prev.filter((x) => x.id !== id));
      else alert(data.error || 'No se pudo borrar');
    } catch (e: any) {
      alert(e?.message || 'No se pudo borrar');
    }
  }

  const createPreview = useMemo(
    () => resolveImage(imageUrl, imageKey),
    [imageUrl, imageKey],
  );

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Categorías</h1>

      {/* Crear */}
      <form onSubmit={onCreate} className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            className="border rounded p-2 md:col-span-2"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="border rounded p-2"
            placeholder="Slug (opcional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <input
            className="border rounded p-2"
            placeholder="Imagen (URL pública, opcional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <input
            className="border rounded p-2"
            placeholder="Clave R2 (imageKey, opcional)"
            value={imageKey}
            onChange={(e) => setImageKey(e.target.value)}
          />
        </div>

        {/* Preview mini */}
        {createPreview && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Preview:</span>
            <img
              src={createPreview}
              alt="preview"
              className="h-12 w-12 rounded object-cover border"
            />
          </div>
        )}

        <button className="border rounded px-4" type="submit">
          Crear
        </button>
        <p className="text-xs text-gray-500">
          Podés usar <b>Image URL</b> o bien una <b>Clave R2</b> (imageKey). Si ponés ambas, el front preferirá la clave.
        </p>
      </form>

      {/* Filtros */}
      <div className="flex gap-2">
        <input
          className="border rounded p-2"
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="border rounded px-3" onClick={load} disabled={loading}>
          {loading ? 'Cargando…' : 'Filtrar'}
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full border rounded">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Imagen</th>
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Slug</th>
              <th className="p-2 border w-64">Imagen URL</th>
              <th className="p-2 border w-64">Clave R2</th>
              <th className="p-2 border w-36">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((c) => {
                const preview = resolveImage(c.imageUrl, c.imageKey);
                const isEditing = editingId === c.id;
                return (
                  <tr key={c.id}>
                    <td className="p-2 border align-top">{c.id}</td>

                    <td className="p-2 border align-top">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={resolveImage(eImageUrl, eImageKey) || preview || '/favicon.ico'}
                            alt=""
                            className="h-12 w-12 rounded object-cover border"
                          />
                        </div>
                      ) : preview ? (
                        <img
                          src={preview}
                          alt=""
                          className="h-12 w-12 rounded object-cover border"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    <td className="p-2 border align-top">
                      {isEditing ? (
                        <input
                          className="border rounded p-2 w-full"
                          value={eName}
                          onChange={(e) => setEName(e.target.value)}
                        />
                      ) : (
                        c.name
                      )}
                    </td>

                    <td className="p-2 border align-top">
                      {isEditing ? (
                        <input
                          className="border rounded p-2 w-full"
                          value={eSlug}
                          onChange={(e) => setESlug(e.target.value)}
                          placeholder='Vacío ("") para recalcular'
                        />
                      ) : (
                        c.slug
                      )}
                    </td>

                    <td className="p-2 border align-top">
                      {isEditing ? (
                        <input
                          className="border rounded p-2 w-full"
                          value={eImageUrl}
                          onChange={(e) => setEImageUrl(e.target.value)}
                          placeholder="https://… (opcional)"
                        />
                      ) : (
                        <div className="max-w-[18rem] truncate text-gray-600 text-sm">
                          {c.imageUrl ?? '—'}
                        </div>
                      )}
                    </td>

                    <td className="p-2 border align-top">
                      {isEditing ? (
                        <input
                          className="border rounded p-2 w-full"
                          value={eImageKey}
                          onChange={(e) => setEImageKey(e.target.value)}
                          placeholder="categories/yerbas.jpg (opcional)"
                        />
                      ) : (
                        <div className="max-w-[18rem] truncate text-gray-600 text-sm">
                          {c.imageKey ?? '—'}
                        </div>
                      )}
                    </td>

                    <td className="p-2 border align-top space-x-2 whitespace-nowrap">
                      {isEditing ? (
                        <>
                          <button
                            className="text-blue-600"
                            onClick={() => saveEdit(c.id)}
                          >
                            Guardar
                          </button>
                          <button className="text-gray-600" onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="text-blue-600" onClick={() => startEdit(c)}>
                            Editar
                          </button>
                          <button className="text-red-600" onClick={() => onDelete(c.id)}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-3 text-sm opacity-70" colSpan={7}>
                  {loading ? 'Cargando…' : 'Sin categorías'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {err && <p className="text-sm text-red-600">Error: {err}</p>}
    </main>
  );
}
