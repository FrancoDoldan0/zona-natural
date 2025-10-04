export default function Footer() {
  return (
    <footer className="border-t mt-12">
      <div className="container py-10 grid gap-6 md:grid-cols-3 text-sm text-ink-700">
        <div>
          <div className="font-semibold text-ink-900 mb-2">Zona Natural</div>
          <p className="opacity-80">Productos naturales y saludables.</p>
        </div>
        <div>
          <div className="font-semibold text-ink-900 mb-2">Navegación</div>
          <ul className="space-y-1">
            <li><a href="/productos" className="hover:text-brand">Productos</a></li>
            <li><a href="/ofertas" className="hover:text-brand">Ofertas</a></li>
            <li><a href="/catalogo" className="hover:text-brand">Catálogo</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-ink-900 mb-2">Contacto</div>
          <ul className="space-y-1">
            <li><a href="/landing#contacto" className="hover:text-brand">Formulario</a></li>
            <li><a href="https://wa.me/" className="hover:text-brand" target="_blank">WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-4 text-xs text-ink-500">
          © {new Date().getFullYear()} Zona Natural — Todos los derechos reservados
        </div>
      </div>
    </footer>
  );
}
