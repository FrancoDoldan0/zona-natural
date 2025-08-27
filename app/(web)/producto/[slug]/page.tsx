export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Price from "@/components/web/Price";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

function baseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host  = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function getJSON(path: string) {
  const r = await fetch(`${baseUrl()}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}
async function getJSONSafe(path: string) {
  try { return await getJSON(path); } catch { return null; }
}

export default async function Page({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const data = await getJSONSafe(`/api/public/producto/${encodeURIComponent(slug)}`);
  const p = data?.item;
  if (!p) return notFound();

  const images = Array.isArray(p.images) ? p.images : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {images.length
            ? images.map((im: any) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={im.id ?? im.url} src={im.url} alt={im.alt || p.name} className="w-full aspect-square object-cover rounded border" />
              ))
            : <div className="col-span-4 aspect-square bg-gray-100 rounded border flex items-center justify-center text-gray-400">Sin imagen</div>
          }
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{p.name}</h1>
        <Price priceOriginal={p.priceOriginal} priceFinal={p.priceFinal} offerLabel={p.offer?.label} />
        {p.description && <p className="text-gray-700 whitespace-pre-line">{p.description}</p>}
        <div className="text-sm text-gray-500">
          {p.category?.name ? <>Categoría: <span className="font-medium">{p.category.name}</span></> : null}
          {p.sku ? <> · SKU: <span className="font-mono">{p.sku}</span></> : null}
        </div>
        <a href="/contacto" className="inline-block border rounded px-4 py-2">Consultar</a>
      </div>
    </div>
  );
}