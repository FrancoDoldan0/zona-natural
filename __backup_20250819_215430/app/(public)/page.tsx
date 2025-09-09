export const runtime = 'edge';

export default async function Page() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Inicio</h1>
      <p>Zona Natural — página pública mínima.</p>
      <ul>
        <li>
          <a href="/catalogo">Ver catálogo</a>
        </li>
        <li>
          <a href="/admin">Ir al panel</a>
        </li>
      </ul>
    </main>
  );
}
