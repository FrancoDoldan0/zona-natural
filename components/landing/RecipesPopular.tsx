// components/landing/RecipesPopular.tsx
import Link from "next/link";

const RECIPES = [
  {
    title: "Granola casera crocante",
    img: "/recipes/granola.jpg",
    url: "/recetas#granola",
  },
  {
    title: "Panqueques de avena",
    img: "/recipes/panqueques.jpg",
    url: "/recetas#panqueques",
  },
  {
    title: "Smoothie verde detox",
    img: "/recipes/smoothie.jpg",
    url: "/recetas#smoothie",
  },
  {
    title: "Galletas de avena",
    img: "/recipes/galletas.jpg",
    url: "/recetas#galletas",
  },
];

export default function RecipesPopular() {
  return (
    <section className="bg-white" aria-label="Recetas populares">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl md:text-2xl font-semibold">Recetas populares</h2>
          <Link className="text-emerald-700 text-sm hover:underline" href="/recetas">
            Ver todas »
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {RECIPES.map((r) => (
            <Link
              key={r.title}
              href={r.url}
              className="group rounded-xl overflow-hidden ring-1 ring-emerald-100 bg-white hover:shadow"
            >
              <div className="relative aspect-[4/3] bg-emerald-50">
                <img
                  src={r.img}
                  alt={r.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium line-clamp-2">{r.title}</h3>
                <span className="text-emerald-700 text-sm">Ver receta</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
