// components/landing/CategoriesRow.tsx
import { toR2Url } from "@/lib/img";
import Link from "next/link";

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

  const list = cats.slice(0, 8);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-center text-2xl md:text-3xl font-semibold mb-8">
          Categorías Destacadas
        </h2>

        {/* Distribución fluida: centra en mobile, separa en desktop */}
        <div className="flex flex-wrap items-start justify-center md:justify-between gap-x-10 gap-y-8">
          {list.map((c) => {
            const imgCandidate =
              c.images?.[0]?.url
                ? { url: c.images[0].url }
                : c.imageUrl
                ? c.imageUrl
                : c.image
                ? c.image
                : c.cover
                ? c.cover
                : null;

            const src = toR2Url(imgCandidate as any);

            return (
              <Link
                key={c.id}
                href={`/catalogo?categoryId=${c.id}`}
                className="w-[108px] md:w-[120px] flex flex-col items-center text-center group"
              >
                <div className="relative h-[108px] w-[108px] md:h-[120px] md:w-[120px] rounded-full ring-2 ring-emerald-200/70 overflow-hidden bg-white transition-transform group-hover:scale-[1.03]">
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
                <span className="mt-2 text-sm">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
