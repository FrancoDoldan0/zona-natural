import type { Metadata } from "next";

type Product = {
  id:number; name:string; slug:string; description:string|null; price:number|null; sku:string|null; status:string;
  category?: { id:number; name:string; slug:string } | null;
  subcategory?: { id:number; name:string; slug:string } | null;
  images: { id:number; url:string; alt:string|null; sortOrder:number }[];
};

export async function generateMetadata({ params }:{ params:{ slug:string } }): Promise<Metadata> {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/,"");
  const r = await fetch(`${base}/api/public/producto/${params.slug}`, { next:{ revalidate:60 } });
  if (!r.ok) return { title: "Producto | Zona Natural" };
  const { item } = await r.json();
  const title = `${item?.name ?? "Producto"} | Zona Natural`;
  const img = item?.images?.[0]?.url;
  return {
    title,
    openGraph: { title, images: img ? [{ url: img }] : undefined },
  };
}

async function getProduct(slug:string): Promise<Product | null> {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/,"");
  const r = await fetch(`${base}/api/public/producto/${slug}`, { next:{ revalidate:60 } });
  if (!r.ok) return null;
  const j = await r.json(); return j.item as Product;
}

export default async function ProductPage({ params }:{ params:{ slug:string } }) {
  const p = await getProduct(params.slug);
  if (!p) return <main className="max-w-5xl mx-auto p-6"><p>No encontrado</p></main>;

  return (
    <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-2 gap-6">
      <section>
        {p.images?.length ? (
          <div className="space-y-3">
            <img src={p.images[0].url} alt={p.images[0].alt || p.name} className="w-full h-80 object-cover rounded border" />
            <div className="grid grid-cols-5 gap-2">
              {p.images.slice(1).map(img=>(
                <img key={img.id} src={img.url} alt={img.alt || p.name} className="h-20 w-full object-cover rounded border" />
              ))}
            </div>
          </div>
        ) : (
          <div className="h-80 w-full grid place-items-center border rounded">Sin imagen</div>
        )}
      </section>

      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{p.name}</h1>
        {p.price!=null && <div className="text-xl">Precio: ${p.price}</div>}
        {p.sku && <div className="opacity-70 text-sm">SKU: {p.sku}</div>}
        {p.category && <div className="text-sm">Categoría: {p.category.name}</div>}
        {p.subcategory && <div className="text-sm">Subcategoría: {p.subcategory.name}</div>}
        {p.description && <p className="mt-2 whitespace-pre-wrap">{p.description}</p>}
      </section>
    </main>
  );
}