"use client";
import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/app/(web)/components/ProductCard";

type Tag = { id:number; name:string; productCount:number };
type Item = {
  id:number; name:string; slug:string; cover:string|null;
  priceOriginal:number|null; priceFinal:number|null;
  hasDiscount:boolean; discountPercent:number;
};
type CatalogResp = {
  ok:boolean;
  items: Item[];
  page:number; perPage:number;
  total:number; pageCount:number;
  filteredTotal:number; filteredPageCount:number;
};

function num(v:string){ const n = Number(v); return Number.isFinite(n) ? n : null; }

export default function ProductosPage(){
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string|null>(null);

  // filtros
  const [selected, setSelected] = useState<number[]>([]);
  const [match, setMatch] = useState<"any"|"all">("any");
  const [onSale, setOnSale] = useState(false);
  const [minFinal, setMinFinal] = useState<string>("");
  const [maxFinal, setMaxFinal] = useState<string>("");
  const [sort, setSort] = useState<"final"|" -final"|"name"|" -name"|"price"|" -price"|" -id">("final");

  // cargar tags activos
  useEffect(() => {
    (async () => {
      try{
        const res = await fetch("/api/public/tags?onlyActive=1",{ cache:"no-store" });
        const json = await res.json();
        if(json?.ok){ setTags(json.items||[]); }
      } catch(e){ /* noop */ }
    })();
  }, []);

  // construir query string
  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("perPage","24");
    p.set("sort", sort.trim());
    if(onSale) p.set("onSale","1");
    if(match === "all") p.set("match","all");
    const ids = selected.filter(Boolean);
    if(ids.length){ p.set("tagIds", ids.join(",")); }
    const lo = num(minFinal); if(lo!=null) p.set("minFinal", String(lo));
    const hi = num(maxFinal); if(hi!=null) p.set("maxFinal", String(hi));
    return p.toString();
  }, [selected, match, onSale, minFinal, maxFinal, sort]);

  async function load(){
    setLoading(true); setError(null);
    try{
      const res = await fetch(`/api/public/catalogo?${query}`, { cache:"no-store" });
      const json: CatalogResp = await res.json();
      if(!json?.ok) throw new Error("respuesta inválida");
      setItems(json.items || []);
    }catch(e:any){
      setError(e?.message || "Error al cargar catálogo");
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [query]);

  function toggleTag(id:number){
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  return (
    <div style={{display:"grid", gridTemplateColumns:"260px 1fr", gap:24, padding:"16px 20px"}}>
      {/* Filtros */}
      <aside style={{border:"1px solid #eee", borderRadius:12, padding:16}}>
        <div style={{fontWeight:700, marginBottom:8}}>Filtros</div>

        <div style={{marginTop:10}}>
          <div style={{fontWeight:600, marginBottom:6}}>Etiquetas</div>
          <div style={{display:"grid", gap:6, maxHeight:260, overflow:"auto", paddingRight:4}}>
            {tags.map(t => (
              <label key={t.id} style={{display:"flex", justifyContent:"space-between", gap:8, fontSize:14}}>
                <span>
                  <input
                    type="checkbox"
                    checked={selected.includes(t.id)}
                    onChange={()=>toggleTag(t.id)}
                    style={{marginRight:8}}
                  />
                  {t.name}
                </span>
                <span style={{color:"#666"}}>{t.productCount}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{marginTop:14}}>
          <div style={{fontWeight:600, marginBottom:6}}>Match</div>
          <label style={{display:"block", fontSize:14, marginBottom:4}}>
            <input type="radio" name="match" checked={match==="any"} onChange={()=>setMatch("any")} style={{marginRight:8}}/>
            Cualquiera (any)
          </label>
          <label style={{display:"block", fontSize:14}}>
            <input type="radio" name="match" checked={match==="all"} onChange={()=>setMatch("all")} style={{marginRight:8}}/>
            Todos (all)
          </label>
        </div>

        <div style={{marginTop:14}}>
          <label style={{fontWeight:600, marginRight:8}}>
            <input type="checkbox" checked={onSale} onChange={()=>setOnSale(v=>!v)} style={{marginRight:8}}/>
            Solo en oferta
          </label>
        </div>

        <div style={{marginTop:14}}>
          <div style={{fontWeight:600, marginBottom:6}}>Precio final</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <input placeholder="Mín." value={minFinal} onChange={e=>setMinFinal(e.target.value)} />
            <input placeholder="Máx." value={maxFinal} onChange={e=>setMaxFinal(e.target.value)} />
          </div>
        </div>

        <div style={{marginTop:14}}>
          <div style={{fontWeight:600, marginBottom:6}}>Orden</div>
          <select value={sort} onChange={e=>setSort(e.target.value as any)}>
            <option value="final">Precio final ⬆</option>
            <option value="-final">Precio final ⬇</option>
            <option value="price">Precio lista ⬆</option>
            <option value="-price">Precio lista ⬇</option>
            <option value="name">Nombre A–Z</option>
            <option value="-name">Nombre Z–A</option>
            <option value="-id">Más nuevos</option>
          </select>
        </div>

        <button onClick={load} disabled={loading} style={{
          marginTop:16, padding:"10px 12px", borderRadius:10,
          border:"1px solid #ddd", background:"#111", color:"#fff", cursor:"pointer"
        }}>
          {loading ? "Cargando…" : "Aplicar filtros"}
        </button>
      </aside>

      {/* Resultados */}
      <main>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
          <h1 style={{fontSize:20, margin:0}}>Productos</h1>
          <div style={{fontSize:12, color:"#666"}}>
            {items.length} resultado{items.length===1?"":"s"}
          </div>
        </div>

        {error && (
          <div style={{padding:12, border:"1px solid #fecaca", background:"#fef2f2", color:"#991b1b", borderRadius:8, marginBottom:12}}>
            {error}
          </div>
        )}

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
          gap:16
        }}>
          {items.map(it => <ProductCard key={it.id} item={it} />)}
        </div>

        {!loading && items.length===0 && !error && (
          <div style={{marginTop:24, color:"#666"}}>No encontramos resultados con esos filtros.</div>
        )}
      </main>
    </div>
  );
}