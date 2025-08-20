export const runtime = 'edge';
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <h1>Panel Admin</h1>
      {children}
      <p style={{opacity:0.7,fontSize:12}}>Nota: aún sin protección de ruta real.</p>
    </main>
  );
}