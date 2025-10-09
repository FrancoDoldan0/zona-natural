// components/landing/MainNav.tsx
export default function MainNav() {
  return (
    <div className="w-full border-b border-emerald-100 bg-white">
      <div className="mx-auto max-w-7xl px-3 py-2 flex items-center gap-4 text-sm">
        <button className="rounded-md bg-emerald-50 px-3 py-1 ring-1 ring-emerald-200 hover:bg-emerald-100">
          Categorías
        </button>
        <a href="/catalogo" className="hover:underline">Tienda</a>
        <a href="#" className="hover:underline">Recetas</a>
      </div>
    </div>
  );
}
