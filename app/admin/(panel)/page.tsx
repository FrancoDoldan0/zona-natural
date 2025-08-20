export const runtime = 'edge';
export default function AdminHome() {
  return (
    <section>
      <p>Dashboard mínimo listo.</p>
      <ul>
        <li><a href="/admin/categorias">Categorías</a></li>
        <li><a href="/admin/subcategorias">Subcategorías</a></li>
        <li><a href="/admin/productos">Productos</a></li>
        <li><a href="/admin/banners">Banners</a></li>
        <li><a href="/admin/ofertas">Ofertas</a></li>
      </ul>
    </section>
  );
}