import Image from "next/image";
import Link from "next/link";

export type Slide = { id: string | number; image: string; href?: string; title?: string };
export default function Hero({ slides, aspect = "banner" }: { slides: Slide[]; aspect?: "banner" | "square" }) {
  if (!slides?.length) return null;
  const aspectClass =
    aspect === "square" ? "aspect-square" : "aspect-[16/6] md:aspect-[16/5] lg:aspect-[16/4]";

  return (
    <div className="relative overflow-hidden rounded-2xl border shadow-sm">
      <div className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
        {slides.map((s) => {
          const content = (
            <div key={s.id} className={elative w-full shrink-0 snap-center }>
              <Image src={s.image} alt={s.title ?? ""} fill sizes="100vw" className="object-cover" />
            </div>
          );
          if (s.href?.startsWith("/")) {
            return (
              <Link key={s.id} href={s.href} className="block w-full">
                {content}
              </Link>
            );
          }
          return (
            <a
              key={s.id}
              href={s.href}
              target={s.href ? "_blank" : undefined}
              rel={s.href ? "noopener" : undefined}
              className="block w-full"
            >
              {content}
            </a>
          );
        })}
      </div>
    </div>
  );
}
