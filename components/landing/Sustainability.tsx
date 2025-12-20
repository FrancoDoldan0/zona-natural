// components/landing/Sustainability.tsx
export default function Sustainability() {
  return (
    <section className="bg-black">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl md:text-2xl font-semibold text-emerald-400">
          Compromiso sustentable
        </h2>

        <p className="mt-2 text-sm md:text-base max-w-3xl text-gray-300">
          Trabajamos con proveedores locales, reducimos plásticos de un solo uso
          y priorizamos empaques reciclables. Buscamos que comer rico y natural
          también sea mejor para el planeta.
        </p>

        <ul className="mt-4 grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <li className="rounded-lg bg-zinc-900 ring-1 ring-emerald-800/40 p-3 text-gray-200">
            ♻️ Empaques reciclables
          </li>

          <li className="rounded-lg bg-zinc-900 ring-1 ring-emerald-800/40 p-3 text-gray-200">
            🌱 Proveedores locales
          </li>

          <li className="rounded-lg bg-zinc-900 ring-1 ring-emerald-800/40 p-3 text-gray-200">
            🛒 Desperdicio cero (rotación)
          </li>

          <li className="rounded-lg bg-zinc-900 ring-1 ring-emerald-800/40 p-3 text-gray-200">
            🚚 Rutas optimizadas de entrega
          </li>
        </ul>
      </div>
    </section>
  );
}
