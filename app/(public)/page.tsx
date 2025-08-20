export const revalidate = 60;

import { headers } from "next/headers";

type PublicBanner = { id:number; title:string; imageUrl:string; link:string|null };
type PublicOffer  = {
  id:number; title:string; description:string|null;
  discountType:"PERCENT"|"AMOUNT"; discountVal:number;
  product?: { id:number; name:string; slug:string } | null;
  category?: { id:number; name:string; slug:string } | null;
};

function baseUrl() {
  // Si hay NEXT_PUBLIC_BASE_URL válida, úsala; si no, arma desde los headers
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase && /^https?:\/\//i.test(envBase)) return envBase.replace(/\/+$/,'');
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host  = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function getBanners(): Promise<PublicBanner[]>{
  const r = await fetch(`${baseUrl()}/api/public/banners`, { next:{ revalidate:60 } });
  const j = await r.json(); return j.items || [];
}
async function getOffers(): Promise<PublicOffer[]>{
  const r = await fetch(`${baseUrl()}/api/public/offers`, { next:{ revalidate:60 } });
  const j = await r.json(); return j.items || [];
}

export default async function HomePage(){
  const [banners, offers] = await Promise.all([getBanners(), getOffers()]);
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Zona Natural</h1>
        <p className="opacity-70">Catálogo y ofertas</p>
      </section>

      {banners.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Banners</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {banners.map(b=>(
              <a key={b.id} href={b.link ?? "#"} className="block border rounded overflow-hidden">
                <img src={b.imageUrl} alt={b.title} className="w-full h-40 object-cover" />
                <div className="p-2 text-sm">{b.title}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Ofertas activas</h2>
        {offers.length ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {offers.map(o=>(
              <li key={o.id} className="border rounded p-3">
                <div className="font-medium">{o.title}</div>
                <div className="text-sm opacity-80">
                  {o.discountType==="PERCENT" ? `${o.discountVal}%` : `$ ${o.discountVal.toFixed(2)}`}
                  {" · "}
                  {o.product ? `Producto: ${o.product.name}` :
                   o.category ? `Categoría: ${o.category.name}` : "General"}
                </div>
                {o.description && <p className="text-sm mt-1">{o.description}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="opacity-70">No hay ofertas activas.</p>}
      </section>
    </main>
  );
}