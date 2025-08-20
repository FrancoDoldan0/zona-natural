export const runtime = 'edge';

export default async function Page() {
  const item = (href: string, label: string) => (
    <li><a href={href}>{label}</a></li>
  );
  return (
    <main style={{padding: "2rem"}}>
      <h1>Panel de administración</h1>
      <ul style={{lineHeight: 1.8}}>
        {item("/admin/banners", "Banners")}
        {item("/admin/categorias", "Categorías")}
        {item("/admin/subcategorias", "Subcategorías")}
        {item("/admin/productos", "Productos")}
        {item("/admin/ofertas", "Ofertas")}
        {item("/admin/uploads", "Uploads")}
      </ul>
    </main>
  );
}