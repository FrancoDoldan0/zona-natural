"use client";
import { useState } from "react";

type Img = { url:string; alt:string|null };
export default function ImageGallery({ images }: { images: Img[] }) {
  const [idx, setIdx] = useState(0);
  if (!images?.length) return null;
  const main = images[Math.min(idx, images.length-1)];
  return (
    <div className="space-y-3">
      <div className="border rounded overflow-hidden">
        <img src={main.url} alt={main.alt ?? ""} className="w-full max-h-[420px] object-contain bg-black/5" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((im, i)=>(
            <button key={i}
              className={"border rounded overflow-hidden h-20 w-28 shrink-0 "+(i===idx?"ring-2 ring-blue-500":"")}
              onClick={()=>setIdx(i)}
              title={im.alt ?? "Imagen "+(i+1)}>
              <img src={im.url} alt={im.alt ?? ""} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}