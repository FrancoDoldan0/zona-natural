import Link from "next/link";
import { recipes, FALLBACK_IMG } from "./recipes";

export default function RecipesIndex() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4">
        <Link href="/landing" className="text-sm text-emerald-800 hover:underline">
          ← Volver al inicio
        </Link>
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Recetas</h1>

      <div className="grid gap-4 md:gap-6 md:grid-cols-3">
        {recipes.map((r) => (
          <Link
            key={r.slug}
            href={`/recetas/${r.slug}`}
            className="block rounded-2xl ring-1 ring-emerald-100 bg-white overflow-hidden hover:shadow transition-shadow"
          >
            <div className="relative bg-emerald-50 aspect-[16/10]">
              <img
                src={r.img || FALLBACK_IMG}
                alt={r.heroAlt || r.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                }}
              />
            </div>
            <div className="p-4">
              <h3 className="font-medium">{r.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{r.desc}</p>
              <p className="mt-1 text-xs text-gray-500">⏱ {r.mins} min</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
