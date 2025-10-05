import Image from "next/image";
import Link from "next/link";

export type Slide = {
  id: string | number;
  image?: string;
  href?: string;
  title?: string;
};

export default function Hero({
  slides,
  aspect = "banner",
}: {
  slides: Slide[];
  aspect?: "banner" | "square";
}) {
  if (!slides?.length) return null;

  const ratio = aspect === "banner" ? "aspect-[16/6]" : "aspect-[1/1]";

  return (
    <section className="relative">
      <div className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth gap-3">
        {slides.map((s, idx) => {
          const inner = s.image ? (
            <Image
              src={s.image}
              alt={s.title ?? ""}
              fill
              sizes="100vw"
              className="object-cover rounded-2xl"
            />
          ) : (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand to-emerald-400/80" />
          );

          const frame = (
            <div className={`relative w-full shrink-0 snap-center ${ratio}`}>
              {inner}
            </div>
          );

          return s.href ? (
            <Link key={String(s.id ?? idx)} href={s.href} className="block w-full">
              {frame}
            </Link>
          ) : (
            <div key={String(s.id ?? idx)} className="w-full">
              {frame}
            </div>
          );
        })}
      </div>
    </section>
  );
}
