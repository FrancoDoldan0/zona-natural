// app/(public)/carrito/page.tsx
"use client";

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import { useCart } from "@/components/cart/CartProvider";
import { fmtPrice } from "@/lib/price";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { toR2Url } from "@/lib/product";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PHONE_E164 = "59897531583"; // +598 97 531 583
const ADDR_KEY = "zn_addr_v1";

type Addr = {
  calle: string;
  esquina: string;
  numero: string;
  horario: string;
  notas: string;
};

export default function CartPage() {
  const { items, setQty, remove, clear, total } = useCart();

  const [addr, setAddr] = useState<Addr>({ calle: "", esquina: "", numero: "", horario: "", notas: "" });

  // Persistir dirección
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDR_KEY);
      if (raw) setAddr({ ...addr, ...JSON.parse(raw) });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(ADDR_KEY, JSON.stringify(addr));
    } catch {}
  }, [addr]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const lines = useMemo(() => {
    return items.map((it) => {
      const unit = it.price != null ? fmtPrice(it.price) : "Consultar";
      const link = it.productUrl || `${origin}/producto/${it.slug}`;
      return `• ${it.title} x${it.qty} — ${unit}\n${link}`;
    });
  }, [items, origin]);

  const message = useMemo(() => {
    const header = `Pedido Zona Natural`;
    const itemsTxt = lines.join("\n\n");
    const totalTxt = total ? `\n\nTotal estimado: ${fmtPrice(total)}` : "";
    const addrTxt =
      `\n\nDirección:\n- Calle principal: ${addr.calle || "-"}\n- Esquina: ${addr.esquina || "-"}\n- Nº de puerta: ${addr.numero || "-"}\n- Horario preferido: ${addr.horario || "-"}` +
      (addr.notas ? `\nNotas: ${addr.notas}` : "");
    return `${header}\n\n${itemsTxt}${totalTxt}${addrTxt}`;
  }, [lines, total, addr]);

  const waHref = buildWhatsAppHref(PHONE_E164, message);

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Tu carrito</h1>
        <p className="mt-1 text-sm text-gray-600">
          Elegí los productos y enviá el pedido por WhatsApp.{" "}
          <Link href="/catalogo" className="text-emerald-700 hover:underline">Seguir comprando</Link>
        </p>

        {/* Lista */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-gray-700">
                Tu carrito está vacío.
              </div>
            ) : (
              items.map((it) => (
                <div key={it.slug} className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={toR2Url(it.image || "")}
                    alt={it.title}
                    className="h-16 w-16 rounded-md object-cover ring-1 ring-emerald-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.title}</div>
                    <div className="text-sm text-gray-600">
                      {it.price != null ? fmtPrice(it.price) : "Consultar precio"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(it.slug, Math.max(1, it.qty - 1))}
                      className="px-3 py-1 rounded-full ring-1 ring-emerald-200 hover:bg-emerald-50"
                    >
                      –
                    </button>
                    <div className="w-8 text-center">{it.qty}</div>
                    <button
                      onClick={() => setQty(it.slug, Math.min(99, it.qty + 1))}
                      className="px-3 py-1 rounded-full ring-1 ring-emerald-200 hover:bg-emerald-50"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => remove(it.slug)}
                    className="ml-2 text-sm text-rose-700 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ))
            )}

            {items.length > 0 && (
              <div className="flex justify-between items-center pt-2">
                <div className="text-lg font-semibold">Subtotal: {fmtPrice(total)}</div>
                <button onClick={clear} className="text-sm text-rose-700 hover:underline">
                  Vaciar carrito
                </button>
              </div>
            )}
          </section>

          {/* Datos de entrega + enviar */}
          <aside className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-3 h-fit">
            <h2 className="font-semibold">Datos de entrega</h2>
            <label className="block text-sm">
              <span className="text-gray-700">Calle principal</span>
              <input
                className="mt-1 w-full rounded-md border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                value={addr.calle}
                onChange={(e) => setAddr({ ...addr, calle: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Esquina</span>
              <input
                className="mt-1 w-full rounded-md border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                value={addr.esquina}
                onChange={(e) => setAddr({ ...addr, esquina: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Número de puerta</span>
              <input
                className="mt-1 w-full rounded-md border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                value={addr.numero}
                onChange={(e) => setAddr({ ...addr, numero: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Horario preferido</span>
              <input
                className="mt-1 w-full rounded-md border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="Ej: hoy entre 15:00 y 17:00"
                value={addr.horario}
                onChange={(e) => setAddr({ ...addr, horario: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Notas (opcional)</span>
              <textarea
                className="mt-1 w-full rounded-md border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                rows={3}
                value={addr.notas}
                onChange={(e) => setAddr({ ...addr, notas: e.target.value })}
              />
            </label>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`block text-center rounded-full px-4 py-2 text-white ${items.length ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400 pointer-events-none"}`}
            >
              Enviar pedido por WhatsApp
            </a>
            <p className="text-[11px] text-gray-500">
              Al enviar, se abrirá WhatsApp con el detalle del pedido y tus datos para coordinar el envío o retiro.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
