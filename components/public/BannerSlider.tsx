"use client";
import { useEffect, useRef, useState } from "react";

type Banner = { id:number; title:string; imageUrl:string; link:string|null };

export default function BannerSlider({ items, interval=4000 }: { items: Banner[]; interval?: number }){
  const [i,setI] = useState(0);
  const timer = useRef<number|undefined>(undefined);
  const stop = ()=> { if (timer.current) window.clearInterval(timer.current); };
  const start = ()=> { stop(); timer.current = window.setInterval(()=> setI(v => (v+1)%items.length), interval); };

  useEffect(()=>{ if(items.length>1){ start(); return stop; } },[items.length]);

  if (!items?.length) return null;
  const cur = items[i];

  return (
    <div className="relative rounded overflow-hidden" onMouseEnter={stop} onMouseLeave={start}>
      <a href={cur.link ?? "#"} aria-label={cur.title}>
        <div className="aspect-[16/9] bg-black/5">
          <img src={cur.imageUrl} alt={cur.title} className="w-full h-full object-cover" />
        </div>
      </a>

      {items.length>1 && (
        <>
          <button aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 px-2 py-1 rounded"
            onClick={()=> setI(v => (v-1+items.length)%items.length)}>‹</button>
          <button aria-label="Siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 px-2 py-1 rounded"
            onClick={()=> setI(v => (v+1)%items.length)}>›</button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
            {items.map((_,idx)=>(
              <button key={idx} aria-label={`Slide ${idx+1}`}
                className={"h-2 w-2 rounded-full "+(idx===i?"bg-white":"bg-white/50")}
                onClick={()=>setI(idx)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}