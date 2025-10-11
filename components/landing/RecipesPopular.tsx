// components/landing/RecipesPopular.tsx
// Bloque “Recetas populares” para la landing.
// Trae el dataset y usa un fallback *por receta* para no repetir la misma imagen.

import Link from "next/link";
import { recipes as RECIPES, FALLBACK_IMG } from "@/app/(public)/recetas/recipes";

/** Fallbacks variados si falta r.img */
const FALLBACKS = [
  "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1473181488821-2d23949a045a?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495214783159-3503fd1b572d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486887396153-fa416526c108?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494390248081-4e521a5940db?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1200&auto=format&fit=crop",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function perSlugImg(slug: string, img?: string) {
  if (img && img.trim().length > 6) return img;
  const i = hash(slug) % FALLBACKS.length;
  return FALLBACKS[i] || FALLBACK_IMG;
}

export default function RecipesPopular() {
  const top = RECIPES.slice(0, 3);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold">Recetas populares</h2>
          <Link href="/recetas" className="text-sm text-emerald-800 hover:underline">
            Ver todas »
          </Link>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {top.map((r) => {
            const src = perSlugImg(r.slug, r.img);
            return (
              <Link
                key={r.slug}
                href={`/recetas/${r.slug}`}
                className="block rounded-2xl ring-1 ring-emerald-100 bg-white overflow-hidden hover:shadow transition-shadow"
              >
                <div className="relative bg-emerald-50 aspect-[16/10]">
                  <img
                    src={src}
                    alt={r.heroAlt || r.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = perSlugImg(r.slug);
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium">{r.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{r.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
