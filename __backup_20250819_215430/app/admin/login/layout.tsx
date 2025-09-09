export const runtime = 'edge';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <section className="p-6 max-w-md mx-auto">{children}</section>;
}
