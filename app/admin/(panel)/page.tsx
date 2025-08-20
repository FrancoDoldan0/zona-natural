export const runtime = "edge";

export default function AdminIndex() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-semibold mb-4">Panel</h1>
      <ul className="list-disc list-inside space-y-2">
        <li><a className="underline" href="/admin/categorias">Categorías</a></li>
        <li><a className="underline" href="/admin/subcategorias">Subcategorías</a></li>
        <li><a className="underline" href="/admin/productos">Productos</a></li>
        <li><a className="underline opacity-60" href="/admin/banners">Banners (próx.)</a></li>
        <li><a className="underline opacity-60" href="/admin/ofertas">Ofertas (próx.)</a></li>
      </ul>
    </main>
  );
}