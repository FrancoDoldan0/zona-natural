// app/(public)/productos/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import SafeImage from "@/components/SafeImage";

export const runtime = "edge";
export const revalidate = 60;

type ProductImage = { url: string; alt?: string | null };
type Product = {
  id: number;
  name: string;
  slug: string;
  price?: number | null;
  coverUrl?: string | null;
  images?: ProductImage[];
};

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function getData(page = 1, perPage = 12) {
  const base = getBaseUrl();
  const url = `${base}/api/public/catalogo?page=${page}&perPage=${perPage}&sort=-id`;

  const res = await fetch(url, {
    // Puedes cachear si quieres: next: { revalidate }
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Catálogo: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Soporta distintas formas de respuesta
  const items: Product[] =
    data.items ?? data.data ?? data.products ?? data.results ?? [];
  const total: number = data.total ?? items.length;

  return { items, total, page: data.page ?? page, perPage: data.perPage ?? perPage };
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams?: { page?: string; perPage?: string };
}) {
  const page = Number(searchParams?.page ?? 1);
  const perPage = Number(searchParams?.perPage ?? 8);

  const { items, total } = await getData(page, perPage);

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Productos</h1>
      <p style={{ marginBottom: 16 }}>
        {total} resultado{total === 1 ? "" : "s"}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {items.map((p) => {
          const firstImage = p.coverUrl || p.images?.[0]?.url || "/placeholder.png";
          // Asegurar que las rutas relativas empiecen con "/"
          const src =
            firstImage?.startsWith("http") || firstImage?.startsWith("/")
              ? (firstImage as string)
              : `/${firstImage}`;

        return (
          <article
            key={p.id}
            style={{
              border: "1px solid #2b2b2b",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Link href={`/producto/${p.slug}`} style={{ textDecoration: "none" }}>
              <div style={{ width: "100%", aspectRatio: "4/3", marginBottom: 8 }}>
                <SafeImage
                  src={src}
                  alt={p.name}
                  // cubre el contenedor
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 6,
                    display: "block",
                    background: "#111",
                  }}
                />
              </div>
              <div style={{ color: "inherit" }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                {typeof p.price === "number" ? (
                  <div style={{ opacity: 0.85 }}>
                    ${p.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </div>
                ) : (
                  <div style={{ opacity: 0.6 }}>Sin precio</div>
                )}
              </div>
            </Link>
          </article>
        );
        })}
      </div>
    </main>
  );
}
