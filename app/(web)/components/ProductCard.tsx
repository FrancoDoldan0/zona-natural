'use client';
import Link from 'next/link';

type Props = {
  item: {
    id: number;
    name: string;
    slug: string;
    cover: string | null;
    priceOriginal: number | null;
    priceFinal: number | null;
    hasDiscount: boolean;
    discountPercent: number;
  };
};

export default function ProductCard({ item }: Props) {
  const po = item.priceOriginal ?? null;
  const pf = item.priceFinal ?? null;
  const showBadge = item.hasDiscount && typeof item.discountPercent === 'number';

  return (
    <div
      style={{
        border: '1px solid #eee',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <Link href={`/producto/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{
            width: '100%',
            aspectRatio: '1/1',
            background: '#fafafa',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {showBadge && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: '#10b981',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 999,
              }}
            >
              -{item.discountPercent}%
            </div>
          )}
          {item.cover ? (
            <img
              src={item.cover}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ color: '#aaa' }}>Sin imagen</span>
          )}
        </div>
        <div style={{ marginTop: 8, fontWeight: 600 }}>{item.name}</div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {pf != null && <span style={{ fontSize: 18, fontWeight: 700 }}>${pf.toFixed(2)}</span>}
        {item.hasDiscount && po != null && (
          <span style={{ textDecoration: 'line-through', color: '#999' }}>${po.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}
