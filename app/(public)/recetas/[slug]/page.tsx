import Link from "next/link";
import type { Recipe } from "../recipes";
import { recipes, FALLBACK_IMG } from "../recipes";

export async function generateStaticParams() {
  return recipes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = recipes.find((x) => x.slug === slug);
  return {
    title: r ? `${r.title} — Recetas` : "Receta no encontrada — Zona Natural",
    description: r?.desc || "Recetas ricas y naturales.",
  };
}

export default async function RecipeDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = recipes.find((x) => x.slug === slug) as Recipe | undefined;

  if (!r) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="mb-4">
          <Link href="/recetas" className="text-sm text-emerald-800 hover:underline">
            ← Volver a recetas
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Receta no encontrada</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-4">
        <Link href="/recetas" className="text-sm text-emerald-800 hover:underline">
          ← Volver a recetas
        </Link>
      </p>

      <h1 className="text-3xl font-semibold">{r.title}</h1>
      <p className="text-gray-600">{r.desc}</p>
      <p className="mt-1 text-sm text-gray-500">Tiempo estimado: {r.mins} min</p>

      <div className="mt-4 rounded-2xl ring-1 ring-emerald-100 overflow-hidden">
        <div className="relative bg-emerald-50 aspect-[16/9]">
          <img
            src={r.img || FALLBACK_IMG}
            alt={r.heroAlt || r.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            decoding="async"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
            }}
          />
        </div>
      </div>

      <h2 className="mt-8 text-xl font-semibold">Ingredientes</h2>
      <ul className="list-disc pl-6 space-y-1 mt-2">
        {r.ingredients.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>

      <h2 className="mt-6 text-xl font-semibold">Pasos</h2>
      <ol className="list-decimal pl-6 space-y-2 mt-2">
        {r.steps.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ol>
    </div>
  );
}
