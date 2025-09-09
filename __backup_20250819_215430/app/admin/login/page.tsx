'use client';
export const runtime = 'edge';

export default function Page() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>
      <form className="grid gap-3">
        <input className="border rounded p-2" placeholder="email" />
        <input className="border rounded p-2" placeholder="password" type="password" />
        <button className="rounded p-2 border">Entrar</button>
      </form>
      <p className="text-xs opacity-60">Stub temporal para compilar.</p>
    </main>
  );
}
