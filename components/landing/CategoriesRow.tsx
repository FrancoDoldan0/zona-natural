// components/landing/CategoriesRow.tsx
import { toR2Url } from "@/lib/img";

type Cat = {
  id: number;
  name: string;
  slug: string;
  images?: { url: string; alt?: string | null }[];
  imageUrl?: string | null;
  image?: { url?: string | null; r2Key?: string | null; key?: string | null } | string | null;
  cover?: string | { url?: string | null; r2Key?: string | null; key?: string | null } | null;
};

export default function CategoriesRow({ cats }: { cats: Cat[] }) {
  if (!cats?.length) return null;
  const top = cats.slice(0, 8);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">Categorías Destacadas</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {top.map((c) => {
            const imgCandidate =
              c.images?.[0]?.url ? { url: c.images[0].url } :
              c.imageUrl ? c.imageUrl :
              c.image ? c.image :
              c.cover ? c.cover : null;

            const src = toR2Url(imgCandidate as any);

            return (
              <a key={c.id} href={`/catalogo?categoryId=${c.id}`} className="group flex flex-col items-center gap-2">
                <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-full ring-1 ring-emerald-200 overflow-hidden transition-transform group-hover:scale-105">
                  {src ? (
                    <img
                      src={src}
                      alt={c.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-emerald-50 text-emerald-700 text-sm">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-center text-sm">{c.name}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
