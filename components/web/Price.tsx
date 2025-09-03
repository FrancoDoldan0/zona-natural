export default function Price({
  priceOriginal,
  priceFinal,
  offerLabel,
}: {
  priceOriginal?: number | null;
  priceFinal?: number | null;
  offerLabel?: string | null;
}) {
  const hasOffer =
    offerLabel && priceOriginal != null && priceFinal != null && priceFinal < priceOriginal;
  return (
    <div className="space-y-1">
      <div className="text-lg font-semibold">
        {priceFinal != null ? `$${priceFinal}` : 'Consultar'}
      </div>
      {hasOffer && (
        <div className="flex items-center gap-2 text-sm">
          <span className="line-through opacity-60">${priceOriginal}</span>
          <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
            {offerLabel}
          </span>
        </div>
      )}
    </div>
  );
}
