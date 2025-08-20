"use client";
import { useEffect, useState } from "react";

type Banner = { id:number; title:string; imageUrl:string; link:string|null; active:boolean; sortOrder:number };

export default function BannersPage(){
  const [items,setItems] = useState<Banner[]>([]);
  const [title,setTitle] = useState("");
  const [imageUrl,setImageUrl] = useState("");
  const [link,setLink] = useState("");
  const [sortOrder,setSortOrder] = useState("0");
  const [active,setActive] = useState(true);
  const [q,setQ] = useState("");

  async function load(all=false){
    const res = await fetch("/api/admin/banners?all="+(all?1:0), { cache:"no-store" });
    const data = await res.json(); if (data.ok) setItems(data.items);
  }
  useEffect(()=>{ load(true) },[]);

  async function onCreate(e:React.FormEvent){
    e.preventDefault();
    const res = await fetch("/api/admin/banners", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        title, imageUrl, link: link.trim()||null, active,
        sortOrder: Number(sortOrder||0)
      })
    });
    const data = await res.json();
    if (data.ok){ setTitle(""); setImageUrl(""); setLink(""); setSortOrder("0"); setActive(true); load(true); }
    else alert(data.error || "Error");
  }
  async function onToggleActive(b:Banner){
    const res = await fetch(`/api/admin/banners/${b.id}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ active: !b.active }) });
    const data = await res.json(); if (data.ok) setItems(prev => prev.map(x => x.id===b.id ? data.item : x));
  }
  async function onDelete(id:number){
    if (!confirm("¿Eliminar banner?")) return;
    const res = await fetch(`/api/admin/banners/${id}`, { method:"DELETE" });
    const data = await res.json(); if (data.ok) setItems(prev => prev.filter(x => x.id!==id));
  }

  const filtered = items.filter(i => !q || i.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Banners</h1>

      <form onSubmit={onCreate} className="border rounded p-4 grid gap-2 md:grid-cols-6">
        <input className="border rounded p-2 md:col-span-2" placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} />
        <input className="border rounded p-2 md:col-span-2" placeholder="URL de la imagen (https…)" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
        <input className="border rounded p-2" placeholder="Link (opcional)" value={link} onChange={e=>setLink(e.target.value)} />
        <input className="border rounded p-2" type="number" min={0} value={sortOrder} onChange={e=>setSortOrder(e.target.value)} />
        <label className="flex items-center gap-2 md:col-span-5">
          <input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} /> Activo
        </label>
        <button className="border rounded px-4 md:col-span-1" type="submit">Crear</button>
      </form>

      <div className="flex gap-2">
        <input className="border rounded p-2" placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="border rounded px-3" onClick={()=>load(true)}>Refrescar</button>
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
              <th className="p-2 border">Activo</th>
              <th className="p-2 border w-28">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b=>(
              <tr key={b.id}>
                <td className="p-2 border">{b.id}</td>
                <td className="p-2 border">
                  <img src={b.imageUrl} alt={b.title} className="h-10 w-20 object-cover" />
                </td>
                <td className="p-2 border">{b.title}</td>
                <td className="p-2 border">{b.sortOrder}</td>
                <td className="p-2 border">{b.link || "-"}</td>
                <td className="p-2 border">
                  <button className={"px-2 rounded "+(b.active?"bg-green-600 text-white":"bg-gray-300")} onClick={()=>onToggleActive(b)}>
                    {b.active ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="p-2 border">
                  <button className="text-red-600" onClick={()=>onDelete(b.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="p-3 opacity-70" colSpan={7}>Sin banners</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}