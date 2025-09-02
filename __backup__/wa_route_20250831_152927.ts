export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

/** Deja solo dÃ­gitos */
function digits(s?: string | null){ return (s ?? "").replace(/\D+/g, ""); }
/** entero positivo con default */
function toInt(s?: string | null, def = 1){ const n = parseInt(String(s ?? ""), 10); return Number.isFinite(n) && n > 0 ? n : def; }

/** Normaliza a formato uruguayo internacional:
 *  - Acepta ya internacional: 598XXXXXXXX o 598XXXXXXXXX (8 o 9 dÃ­gitos)
 *  - Acepta nacional mÃ³vil/fijo: 09XXXXXXX (9), 9XXXXXXX (8), 2XXXXXXX (8), etc. -> antepone 598
 *  Devuelve null si no cumple longitudes vÃ¡lidas.
 */
function normalizeUy(raw?: string | null): string | null {
  const d = digits(raw);
  if (!d) return null;

  if (d.startsWith("598")) {
    const rest = d.slice(3);
    if (rest.length === 8 || rest.length === 9) return d;
    return null;
  }

  // Quitar ceros a izquierda (p.ej. 09xxxxxxx -> 9xxxxxxx)
  const noZero = d.replace(/^0+/, "");

  // Fijos uruguayos suelen ser 8 dÃ­gitos; mÃ³viles 9 empezando en 9 (en nacional).
  if (noZero.length === 8 || noZero.length === 9) return "598" + noZero;

  return null;
}
function isUy(e164: string | null): e164 is string { return typeof e164 === "string" && /^5989\d{7}$/.test(e164); }$/.test(e164); }

export async function GET(req: NextRequest) {
  const url   = new URL(req.url);
  const slug  = url.searchParams.get("slug") || "";
  const qty   = toInt(url.searchParams.get("qty"), 1);
  const dry   = ["1","true","yes","on"].includes((url.searchParams.get("dry")||"").toLowerCase());

  // Solo Uruguay: si viene ?phone=... se usa, si no, se usa WA_PHONE (tambiÃ©n validado).
  const phoneRaw = process.env.WA_PHONE || "";
  const phoneE164 = normalizeUy(phoneRaw);
  if (!isUy(phoneE164)) {
    const msg = "phone debe ser un nÃºmero uruguayo en internacional: 598 + 8â€“9 dÃ­gitos (ej: 59891234567 o 59821234567).";
    if (dry) return NextResponse.json({ ok:false, error: msg }, { status: 400 });
    return new NextResponse(msg, { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  // Buscar nombre del producto (opcional)
  let name = "Producto";
  if (slug) {
    try {
      const p = await prisma.product.findUnique({ where: { slug }, select: { name: true, status: true } });
      if (p && p.status === "ACTIVE") name = p.name;
    } catch {}
  }

  const link = slug ? `${siteUrl}/producto/${slug}` : siteUrl;
  const text = `Hola! Quiero pedir: ${name}\nCantidad: ${qty}\nLink: ${link}`;
  const wa   = `https://wa.me/${phoneE164}?text=${encodeURIComponent(text)}`;

  if (dry) return NextResponse.json({ ok: true, url: wa });

  return NextResponse.redirect(wa, 302);
}