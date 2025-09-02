"use client";
export const runtime = 'edge';

import { useEffect, useState } from "react";

type Offer = { id: string; title: string; description?: string | null };

export default function OfertasPage() {
  const [data, setData] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/offers")
      .then(r => r.ok ? r.json() : Promise.reject(`${r.status} ${r.statusText}`))
      .then(json => setData(json.data ?? json))
      .catch(e => setError(String(e)));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Ofertas</h1>
      {error && <p className="text-red-600 mt-4">Error: {error}</p>}
      {!data && !error && <p className="mt-4">Cargando</p>}
      {data && (
        <ul className="mt-4 list-disc pl-6">
          {data.length === 0 ? (
            <li>Sin ofertas</li>
          ) : (
            data.map(o => (
              <li key={o.id}>
                <strong>{o.title}</strong>{o.description ? ` — ${o.description}` : ""}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}