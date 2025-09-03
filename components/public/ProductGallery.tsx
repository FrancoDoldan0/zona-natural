'use client';
import { useEffect, useState } from 'react';

type Img = { url: string; alt?: string | null };

export default function ProductGallery({ images, title }: { images: Img[]; title: string }) {
  const imgs = images?.length ? images : [{ url: '/placeholder.png', alt: title }];
  const [i, setI] = useState(0);
  const cur = imgs[i];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % imgs.length);
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + imgs.length) % imgs.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imgs.length]);

  return (
    <div className="space-y-2">
      <div className="aspect-[16/9] border rounded overflow-hidden bg-black/5">
        <img src={cur.url} alt={cur.alt || title} className="w-full h-full object-cover" />
      </div>
      {imgs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {imgs.map((im, idx) => (
            <button
              key={idx}
              className={
                'h-16 w-24 flex-shrink-0 border rounded overflow-hidden ' +
                (idx === i ? 'ring-2 ring-blue-500' : '')
              }
              onClick={() => setI(idx)}
              aria-label={`Imagen ${idx + 1}`}
            >
              <img src={im.url} alt={im.alt || title} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
