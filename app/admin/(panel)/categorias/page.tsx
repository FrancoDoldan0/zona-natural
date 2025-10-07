// app/admin/(panel)/categorias/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
  return url || '';
}

export default function CategoriasPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  // imagen al crear (drag & drop / file input)
  const [createFile, setCreateFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // soporta también los campos antiguos por si querés pegar una URL o key manual
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
  const [saving, setSaving] = useState(false);

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

  // preview de la imagen a crear: si hay archivo, usar ObjectURL; si no, usar url/key
  const createPreview = useMemo(() => {
    if (createFile) return URL.createObjectURL(createFile);
    return resolveImage(imageUrl, imageKey);
  }, [createFile, imageUrl, imageKey]);

  // liberar ObjectURL al cambiar/limpiar
  useEffect(() => {
    return () => {
      if (createFile) URL.revokeObjectURL(createPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createFile]);

  function onChooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    setCreateFile(f ?? null);
  }
  function onDropCreate(ev: React.DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    const f = ev.dataTransfer.files?.[0];
    if (f) setCreateFile(f);
  }
  function clearCreateFile() {
    setCreateFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      // 1) Crear categoría
      const body: any = { name: name.trim() };
      if (slug.trim()) body.slug = slug.trim();
      if (!createFile) {
        // si no hay archivo para subir, permitimos URL/key manuales
        if (imageUrl.trim()) body.imageUrl = imageUrl.trim();
        if (imageKey.trim()) body.imageKey = imageKey.trim();
      }

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

      const createdId: number | undefined = data?.item?.id;

      // 2) Si hay archivo, subirlo a /api/admin/categories/{id}/images
      if (createdId && createFile) {
        const fd = new FormData();
        fd.append('file', createFile);
        const up = await fetch(`/api/admin/categories/${createdId}/images`, {
          method: 'POST',
          body: fd,
          credentials: 'include',
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok || upData?.ok === false) {
          throw new Error(upData?.error || 'No se pudo subir la imagen');
        }

        // 3) Asegurar que la categoría quede apuntando a esa imagen (por si el endpoint no la setea)
        const newKey = upData?.item?.key as string | undefined;
        const newUrl = upData?.item?.url as string | undefined;
        if (newKey || newUrl) {
          await fetch(`/api/admin/categories?id=${createdId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageKey: newKey ?? null,
              imageUrl: newKey ? null : (newUrl ?? null),
            }),
          }).catch(() => {});
        }
      }

      // reset
      setName('');
      setSlug('');
      setImageUrl('');
      setImageKey('');
      clearCreateFile();

      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error al crear');
    } finally {
      setSaving(false);
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
      setSaving(true);
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
    } finally {
      setSaving(false);
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

  const manualPreview = useMemo(() => resolveImage(eImageUrl, eImageKey), [eImageUrl, eImageKey]);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Categorías</h1>

      {/* Crear con drag&drop (como banners) */}
      <form onSubmit={onCreate} className="border rounded p-4 space-y-3">
        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropCreate}
          className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition p-6 sm:p-8 text-center"
        >
          <p className="mb-1 font-medium">Arrastrá y soltá la imagen aquí</p>
          <p className="text-sm text-gray-500 mb-4">o seleccioná desde tu equipo</p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onChooseFile}
              className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-white hover:file:bg-emerald-700 file:cursor-pointer"
            />
            {createFile && (
              <button
                type="button"
                className="text-sm rounded-full border px-3 py-1 hover:bg-white"
                onClick={clearCreateFile}
              >
                Quitar imagen
              </button>
            )}
          </div>

          {/* Preview en grande */}
          {createPreview && (
            <div className="mt-4 flex justify-center">
              <img
                src={createPreview}
                alt="preview"
                className="h-24 w-24 rounded object-cover border"
              />
            </div>
          )}
        </div>

        {/* Campos */}
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
          {/* Si no subís archivo, podés pegar manualmente una URL o key */}
          <input
            className="border rounded p-2"
            placeholder="Imagen (URL pública, opcional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={!!createFile}
          />
          <input
            className="border rounded p-2"
            placeholder="Clave R2 (imageKey, opcional)"
            value={imageKey}
            onChange={(e) => setImageKey(e.target.value)}
            disabled={!!createFile}
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="border rounded px-4 py-2" type="submit" disabled={saving}>
            {saving ? 'Creando…' : 'Crear'}
          </button>
          <p className="text-xs text-gray-500">
            Podés subir un archivo o, si preferís, pegar una <b>URL</b> o una <b>clave R2</b>.
          </p>
        </div>
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
              <th className="p-2 border w-40">Acciones</th>
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
                            src={manualPreview || preview || '/favicon.ico'}
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
                            disabled={saving}
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
