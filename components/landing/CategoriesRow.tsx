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

  // usamos todas; si querés limitar, cambia a cats.slice(0, 8)
  const list = cats;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-2xl md:text-[28px] font-semibold text-center mb-8">
          Categorías Destacadas
        </h2>

        {/* fila scrolleable con snap para evitar espacios muertos */}
        <div className="relative -mx-4 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <div className="flex gap-6 md:gap-8 items-start">
            {list.map((c) => {
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
                  className="snap-start inline-flex flex-col items-center gap-3 group"
                >
                  <div
                    className="
                      relative h-28 w-28 md:h-32 md:w-32 lg:h-36 lg:w-36
                      rounded-full overflow-hidden
                      ring-2 ring-emerald-200
                      transition-transform group-hover:scale-105
                      bg-white
                    "
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={c.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-emerald-50 text-emerald-700 text-lg font-semibold">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-center text-sm md:text-[15px] leading-tight max-w-[10rem]">
                    {c.name}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* degradés laterales (decorativos) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 from-white to-transparent bg-gradient-to-r" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 from-transparent to-white bg-gradient-to-l" />
        </div>
      </div>
    </section>
  );
}
