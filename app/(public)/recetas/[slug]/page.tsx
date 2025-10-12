// app/(public)/recetas/[slug]/page.tsx

export const runtime = "edge";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { recipes, FALLBACK_IMG } from "../recipes";

// Metadata (en Next 15, params es Promise)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = recipes.find((x) => x.slug === slug);
  return {
    title: r ? `${r.title} — Recetas` : "Receta — Zona Natural",
    description: r?.desc || "Recetas ricas y naturales.",
  };
}

// Página (en Next 15, params es Promise)
export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = recipes.find((x) => x.slug === slug);
  if (!r) return notFound();

  const img = r.img || FALLBACK_IMG;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/recetas" className="text-sm text-emerald-800 hover:underline">
          ← Volver a recetas
        </Link>

        <h1 className="mt-4 text-2xl md:text-3xl font-semibold">{r.title}</h1>
        <p className="text-gray-700">{r.desc}</p>
        {r.timeMin ? (
          <p className="mt-1 text-sm text-gray-500">Tiempo estimado: {r.timeMin} min</p>
        ) : null}

        <div className="relative mt-4 overflow-hidden rounded-2xl ring-1 ring-emerald-100">
          <div className="aspect-[16/9] bg-emerald-50 relative">
            <img
              src={img}
              alt={r.heroAlt || r.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        <h2 className="mt-6 text-lg font-semibold">Ingredientes</h2>
        <ul className="list-disc pl-6 space-y-1">
          {(r.ingredients ?? []).map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>

        <h2 className="mt-6 text-lg font-semibold">Pasos</h2>
        <ol className="list-decimal pl-6 space-y-2">
          {(r.steps ?? []).map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
