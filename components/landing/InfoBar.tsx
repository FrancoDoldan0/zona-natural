// components/landing/InfoBar.tsx
export default function InfoBar() {
  return (
    <div className="w-full bg-emerald-700 text-white text-sm">
      <div className="mx-auto max-w-7xl px-3 py-2 flex items-center gap-3 justify-center sm:justify-between">
        <div className="hidden sm:flex items-center gap-4 opacity-90">
          <a href="#tel" className="hover:underline focus:underline">📞 +598 99 608 808</a>
          <div className="flex items-center gap-3">
            <a href="#ig" aria-label="Instagram" className="hover:underline">IG</a>
            <a href="#fb" aria-label="Facebook" className="hover:underline">FB</a>
          </div>
        </div>
        <p className="text-center font-medium">
          Envío gratis Montevideo SUPERANDO $2500
        </p>
        <span className="hidden sm:block w-16" />
      </div>
    </div>
  );
}
