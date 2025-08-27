import Link from "next/link";
import Price from "@/components/web/Price";

export default function ProductCard({ p }: { p: any }) {
  const img = p?.images?.[0]?.url as string | undefined;
  return (
    <div className="border rounded-xl overflow-hidden hover:shadow-sm transition">
      <Link href={`/producto/${p.slug}`} className="block">
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-400 text-sm">Sin imagen</div>
          )}
        </div>
        <div className="p-3 space-y-2">
          <div className="font-medium line-clamp-2">{p.name}</div>
          <Price priceOriginal={p.priceOriginal} priceFinal={p.priceFinal} offerLabel={p.offer?.label} />
        </div>
      </Link>
    </div>
  );
}