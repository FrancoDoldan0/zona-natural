"use client";

import { useEffect, useState } from "react";

type BannerRow = {
  id: string;
  title: string;
  imageUrl: string;
  link: string | null;
  order: number;
  active: number; // 1/0 en DB
};

export default function BannersClient() {
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [order, setOrder] = useState<number | string>(0);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/banners", { cache: "no-store" });
    const j = await r.json();
    setRows(j.data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          imageUrl,
          link: link || undefined,
          order,
          active,
        }),
      });

      let json: any = {};
      try { json = await res.json(); } catch {}

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || HTTP );
      }

      setTitle(""); setImageUrl(""); setLink(""); setOrder(0); setActive(true);
      await load();
    } catch (e: any) {
      alert(e?.message || "No se pudo crear el banner");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-2 flex gap-2 items-center">
        <input className="border px-2 py-1" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="border px-2 py-1 w-[420px]" placeholder="URL de imagen (https://...)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <input className="border px-2 py-1 w-[280px]" placeholder="Link (opcional)" value={link} onChange={(e) => setLink(e.target.value)} />
        <input className="border px-2 py-1 w-16 text-right" type="number" min={0} value={order} onChange={(e) => setOrder(e.target.value)} />
        <select className="border px-2 py-1" value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")}>
          <option value="1">Activo</option>
          <option value="0">Inactivo</option>
        </select>
        <button className="border px-3 py-1" onClick={create} disabled={busy}>Crear</button>
      </div>

      <table className="text-sm">
        <thead>
          <tr className="font-semibold">
            <td>Título</td><td>Imagen</td><td>Link</td><td>Activo</td><td>Orden</td><td>Acciones</td>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6}>Sin banners todavía.</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td>{r.title}</td>
              <td className="max-w-[420px] break-all">{r.imageUrl}</td>
              <td className="max-w-[280px] break-all">{r.link ?? ""}</td>
              <td>{r.active ? "Sí" : "No"}</td>
              <td>{r.order}</td>
              <td>(editar/eliminar opcional)</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

