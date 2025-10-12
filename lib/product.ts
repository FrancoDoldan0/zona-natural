// lib/product.ts

const R2_BASE = (process.env.PUBLIC_R2_BASE_URL || "").replace(/\/+$/, "");

/** Acepta {url|r2Key|key} o string y devuelve URL absoluta para R2 */
export function toR2Url(input: unknown): string {
  let raw = "";
  if (typeof input === "string") raw = input;
  else if (input && typeof input === "object") {
    const o = input as any;
    raw = (o.url ?? o.r2Key ?? o.key ?? "").toString();
  }
  raw = (raw || "").trim();
  if (!raw) return "/placeholder.png";
  if (/^https?:\/\//i.test(raw)) return raw;
  const key = raw.replace(/^\/+/, "");
  return R2_BASE ? `${R2_BASE}/${key}` : `/${key}`;
}

const toNum = (v: any): number | null =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? null
    : Number(v);

export type NormalizedProduct = {
  id: number | string;
  slug: string;
  title: string;
  image?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  outOfStock?: boolean;
  brand?: string | null;
  subtitle?: string | null;
  description?: string | null; // <- agregado
};

/** Normaliza cualquier shape del API al usado por las cards/detalle */
export function normalizeProduct(raw: any): NormalizedProduct {
  const id =
    raw.id ??
    raw.productId ??
    raw._id ??
    (raw.slug ? String(raw.slug) : Math.random().toString(36).slice(2));

  const slug = String(
    raw.slug ?? raw.handle ?? raw.permalink ?? raw.seoSlug ?? raw.name ?? id
  )
    .normalize()
    .trim();

  const title = String(raw.name ?? raw.title ?? slug);

  const imgCandidate =
    raw.cover ??
    raw.coverUrl ??
    raw.imageUrl ??
    raw.image ??
    (Array.isArray(raw.images) ? raw.images[0] : null);

  const priceFinal = toNum(raw.priceFinal);
  const price = priceFinal ?? toNum(raw.price);
  const originalPrice = toNum(raw.priceOriginal);

  const status = String(raw.status ?? "").toUpperCase();
  const outOfStock =
    status === "AGOTADO" ||
    status === "SIN STOCK" ||
    status === "OUT_OF_STOCK" ||
    status === "OOS" ||
    raw.stock === 0;

  const brand = (raw.brand ?? raw.marca ?? null) as string | null;
  const subtitle = (raw.shortDescription ?? raw.subtitle ?? raw.subtitulo ?? null) as
    | string
    | null;

  const description =
    (raw.description ??
      raw.descripcion ??
      raw.desc ??
      raw.details ??
      raw.detail ??
      raw.body ??
      raw.content ??
      raw.detalle ??
      null) as string | null;

  return {
    id,
    slug,
    title,
    image: toR2Url(imgCandidate),
    price,
    originalPrice,
    outOfStock,
    brand,
    subtitle,
    description, // <- expuesto para la PDP
  };
}
