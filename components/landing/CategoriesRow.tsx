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
  const top = cats.slice(0, 8);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8">
          Categorías Destacadas
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-8 gap-y-8 place-items-center">
          {top.map((c) => {
            const imgCandidate =
              c.images?.[0]?.url ? { url: c.images[0].url } :
              c.imageUrl ? c.imageUrl :
              c.image ? c.image :
              c.cover ? c.cover : null;

            const src = toR2Url(imgCandidate as any);

            return (
              <Link
                key={c.id}
                href={`/catalogo?categoryId=${c.id}`}
                className="group flex flex-col items-center"
              >
                <div className="relative h-24 w-24 lg:h-28 lg:w-28 rounded-full ring-2 ring-emerald-200 overflow-hidden transition-transform group-hover:scale-105 bg-emerald-50">
                  {src ? (
                    <img
                      src={src}
                      alt={c.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                </div>
                <span className="mt-2 text-center text-sm">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
