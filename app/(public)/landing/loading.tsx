// app/(public)/landing/loading.tsx
export default function Loading() {
  return (
    <>
      {/* Skeleton del HERO full-bleed */}
      <div className="pt-6">
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
          <div className="w-full aspect-[3/1] md:aspect-[5/2] bg-gray-200/70 animate-pulse" />
        </div>
      </div>

      {/* Contenido dentro de container */}
      <div className="container py-6 space-y-12">
        {/* Skeleton: Categorías destacadas */}
        <section className="space-y-6">
          <div className="h-7 w-48 mx-auto bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-6 overflow-x-auto justify-center sm:flex-wrap px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center shrink-0">
                <div className="size-28 sm:size-32 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-3 w-20 mt-2 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        {/* Skeleton: grilla de productos */}
        <section className="space-y-3">
          <div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 mt-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-1/3 mt-2 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
