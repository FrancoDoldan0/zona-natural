export const runtime = 'edge';
export const dynamic = 'force-dynamic'; // evita el prerender que te rompía

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
