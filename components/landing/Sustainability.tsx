// components/landing/Sustainability.tsx
export default function Sustainability() {
  return (
    <section className="bg-emerald-50/60">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl md:text-2xl font-semibold">Compromiso sustentable</h2>
        <p className="mt-2 text-sm md:text-base max-w-3xl">
          Trabajamos con proveedores locales, reducimos plásticos de un solo uso
          y priorizamos empaques reciclables. Buscamos que comer rico y natural
          también sea mejor para el planeta.
        </p>

        <ul className="mt-4 grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <li className="rounded-lg bg-white ring-1 ring-emerald-100 p-3">
            ♻️ Empaques reciclables
          </li>
          <li className="rounded-lg bg-white ring-1 ring-emerald-100 p-3">
            🌱 Proveedores locales
          </li>
          <li className="rounded-lg bg-white ring-1 ring-emerald-100 p-3">
            🛒 Desperdicio cero (rotación)
          </li>
          <li className="rounded-lg bg-white ring-1 ring-emerald-100 p-3">
            🚚 Rutas optimizadas de entrega
          </li>
        </ul>
      </div>
    </section>
  );
}
