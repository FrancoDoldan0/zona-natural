// app/admin/(panel)/banners/page.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import type React from 'react';

type BannerStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';

type BannerApi = {
  id: number;
  title: string;
  imageUrl: string;
  link: string | null;
  sortOrder: number;
  isActive?: boolean;
  active?: boolean;
  status?: BannerStatus;
};

type BannerView = {
  id: number;
  title: string;
  imageUrl: string;
  link: string | null;
  sortOrder: number;
  status: BannerStatus;
};

type ApiList<T> = { ok: true; items: T[] } | { ok: false; error: string };
type ApiItem<T> = { ok: true; item: T } | { ok: false; error: string };
type ApiOk = { ok: true } | { ok: false; error: string };

type UploadRespOk = { ok: true; imageKey?: string; imageUrl: string };
type UploadRespErr = { ok: false; error: string; detail?: string };
type UploadResp = UploadRespOk | UploadRespErr;

// helpers
const statusToBadge = (s: BannerStatus) => {
  switch (s) {
    case 'ACTIVE': return 'bg-green-600 text-white';
    case 'INACTIVE': return 'bg-gray-300 text-gray-800';
    case 'DRAFT': return 'bg-yellow-500 text-black';
    case 'ARCHIVED': return 'bg-zinc-500 text-white';
    default: return 'bg-gray-300 text-gray-800';
  }
};

const normalizeStatus = (b: BannerApi): BannerStatus => {
  if (b.status) return b.status;
  const act = typeof b.isActive === 'boolean' ? b.isActive
            : typeof b.active === 'boolean' ? b.active
            : true;
  return act ? 'ACTIVE' : 'INACTIVE';
};

export default function BannersPage() {
  const [items, setItems] = useState<BannerView[]>([]);

  // form state
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState(''); // se setea tras subir a R2
  const [link, setLink] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState<BannerStatus>('ACTIVE');
  const [q, setQ] = useState('');

  // upload state (dropzone-style)
  const [busyUp, setBusyUp] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ------- data -------
  async function load(all = true) {
    try {
      const res = await fetch('/api/admin/banners?all=' + (all ? 1 : 0), { cache: 'no-store' });
      const data = (await res.json()) as ApiList<BannerApi>;
      if ('ok' in data && data.ok) {
        const mapped: BannerView[] = data.items.map((b) => ({
          id: b.id,
          title: b.title,
          imageUrl: b.imageUrl,
          link: b.link ?? null,
          sortOrder: b.sortOrder ?? 0,
          status: normalizeStatus(b),
        }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load(true);
  }, []);

  // ------- upload a R2 (auto) -------
  async function uploadFiles(files?: FileList | File[]) {
    const f = files?.[0];
    if (!f) return;
    setBusyUp(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/admin/banners/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as UploadResp;
      if ('ok' in data && data.ok && data.imageUrl) {
        setImageUrl(String(data.imageUrl));
      } else {
        alert((data as UploadRespErr)?.error || 'Error al subir imagen');
      }
    } catch {
      alert('Error al subir imagen');
    } finally {
      setBusyUp(false);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) uploadFiles(e.target.files);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); e.stopPropagation(); if (!dragOver) setDragOver(true);
  }
  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); e.stopPropagation(); if (dragOver) setDragOver(false);
  }

  // ------- create -------
  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!imageUrl) {
      alert('Subí la imagen del banner antes de crear.');
      return;
    }
    const payload = {
      title,
      imageUrl,
      link: link.trim() || null,
      sortOrder: Number(sortOrder || 0),
      status,                 // si el backend lo ignora, no rompe
      isActive: status === 'ACTIVE', // compat
      active: status === 'ACTIVE',   // compat
    };
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiOk;
      if ('ok' in data && data.ok) {
        setTitle('');
        setImageUrl('');
        setLink('');
        setSortOrder('0');
        setStatus('ACTIVE');
        if (fileInputRef.current) fileInputRef.current.value = '';
        load(true);
      } else {
        alert((data as any)?.error || 'Error');
      }
    } catch {
      alert('Error de red al crear el banner');
    }
  }

  // ------- actions -------
  async function onToggleActive(b: BannerView) {
    const newStatus: BannerStatus = b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          isActive: newStatus === 'ACTIVE',
          active: newStatus === 'ACTIVE',
        }),
      });
      const data = (await res.json()) as ApiItem<BannerApi>;
      if ('ok' in data && data.ok) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === b.id
              ? {
                  id: data.item.id,
                  title: data.item.title,
                  imageUrl: data.item.imageUrl,
                  link: data.item.link ?? null,
                  sortOrder: data.item.sortOrder ?? 0,
                  status: normalizeStatus(data.item),
                }
              : x,
          ),
        );
      } else {
        alert((data as any)?.error || 'Error al actualizar');
      }
    } catch {
      alert('Error de red al actualizar');
    }
  }

  async function onDelete(id: number) {
    if (!confirm('¿Eliminar banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as ApiOk;
      if ('ok' in data && data.ok) {
        setItems((prev) => prev.filter((x) => x.id !== id));
      } else {
        alert((data as any)?.error || 'Error al eliminar');
      }
    } catch {
      alert('Error de red al eliminar');
    }
  }

  const filtered = items.filter((i) => !q || i.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Banners</h1>

      {/* Form estilo productos: dropzone + campos */}
      <form onSubmit={onCreate} className="border rounded p-4 grid gap-3 md:grid-cols-12">
        {/* DROPZONE */}
        <div
          className={
            'md:col-span-12 border-2 border-dashed rounded p-6 text-center transition ' +
            (dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50/40')
          }
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <div className="space-y-3">
            <div className="opacity-80">Arrastrá y soltá la imagen aquí</div>
            <div className="text-sm opacity-60">o seleccioná desde tu equipo</div>
            <div className="flex justify-center">
              <label className="border rounded px-3 py-1 cursor-pointer">
                Elegir archivo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
              </label>
            </div>
            {busyUp && <div className="text-sm opacity-70">Subiendo…</div>}
            {imageUrl && (
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm opacity-70">Preview:</span>
                <img src={imageUrl} alt="preview" className="h-12 rounded border" />
              </div>
            )}
          </div>
        </div>

        <input
          className="border rounded p-2 md:col-span-4"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          className="border rounded p-2 md:col-span-4"
          placeholder="Link (opcional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <input
          className="border rounded p-2 md:col-span-2"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          title="Orden"
        />

        <select
          className="border rounded p-2 md:col-span-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as BannerStatus)}
          title="Estado"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>

        <button
          className="border rounded px-4 md:col-span-2"
          type="submit"
          disabled={!imageUrl || busyUp}
          title={!imageUrl ? 'Subí una imagen primero' : 'Crear banner'}
        >
          Crear
        </button>
      </form>

      <div className="flex gap-2">
        <input
          className="border rounded p-2"
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="border rounded px-3" onClick={() => load(true)}>
          Refrescar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border rounded text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Prev</th>
              <th className="p-2 border">Título</th>
              <th className="p-2 border">Orden</th>
              <th className="p-2 border">Link</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border w-36">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id}>
                <td className="p-2 border">{b.id}</td>
                <td className="p-2 border">
                  <img src={b.imageUrl} alt={b.title} className="h-10 w-20 object-cover rounded" />
                </td>
                <td className="p-2 border">{b.title}</td>
                <td className="p-2 border">{b.sortOrder}</td>
                <td className="p-2 border break-all">{b.link || '-'}</td>
                <td className="p-2 border">
                  <span className={'px-2 py-1 rounded text-xs ' + statusToBadge(b.status)}>{b.status}</span>
                </td>
                <td className="p-2 border">
                  <div className="flex gap-2">
                    <button
                      className="px-2 rounded border"
                      onClick={() => onToggleActive(b)}
                      title={b.status === 'ACTIVE' ? 'Pasar a INACTIVE' : 'Pasar a ACTIVE'}
                    >
                      {b.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="text-red-600" onClick={() => onDelete(b.id)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td className="p-3 opacity-70" colSpan={7}>
                  Sin banners
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
