"use client";
import { useState } from "react";

export default function UploadsPage(){
  const [file, setFile] = useState<File|null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl]   = useState("");
  const [err, setErr]   = useState("");

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    if (!file) return;
    setBusy(true); setErr(""); setUrl("");
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/uploads", { method:"POST", body: fd });
    const j = await res.json();
    if (j.ok) setUrl(j.url); else setErr(j.error || "Error");
    setBusy(false);
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Subir imagen</h1>
      <form onSubmit={onSubmit} className="border rounded p-4 space-y-3">
        <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0] ?? null)} />
        <button className="border rounded px-4 py-2" disabled={!file || busy}>
          {busy ? "Subiendo..." : "Subir"}
        </button>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        {url && (
          <div className="space-y-2">
            <a className="text-blue-600 underline" href={url} target="_blank" rel="noreferrer">{url}</a>
            <div><img src={url} alt="preview" className="h-32 object-contain" /></div>
          </div>
        )}
      </form>
      <p className="text-sm opacity-70">Límite: 5MB. Tipos: JPG, PNG, WEBP, AVIF.</p>
    </main>
  );
}