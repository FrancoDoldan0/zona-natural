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

export type NormalizedVariant = {
  label: string;
  price?: number | null;          // precio vigente (puede ser un “precio de oferta”)
  originalPrice?: number | null;  // tachado si aplica
};

export type NormalizedProduct = {
  id: number | string;
  slug: string;
  title: string;
  image?: string | null;
  price?: number | null;          // precio vigente a nivel producto (mínimo entre variantes si existen)
  originalPrice?: number | null;  // precio original a nivel producto (mínimo entre variantes si existen)
  outOfStock?: boolean;
  brand?: string | null;
  subtitle?: string | null;
  description?: string | null;
  /** 🆕 variantes normalizadas (máx. 3 las usa la Card) */
  variants?: NormalizedVariant[];
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

  // precios a nivel producto (fallback)
  const priceFinal = toNum(raw.priceFinal);
  let price = priceFinal ?? toNum(raw.price);
  let originalPrice = toNum(raw.priceOriginal);

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

  // 🆕 variantes
  const variants: NormalizedVariant[] = Array.isArray(raw.variants)
    ? (raw.variants as any[]).map((v, i) => ({
        label: String(v.label ?? "").trim() || `Var ${i + 1}`,
        // En el admin, el campo “Precio” es el vigente (puede ser oferta) y “Precio original” es el tachado.
        price: toNum(v.price),
        originalPrice: toNum(v.priceOriginal),
      }))
    : [];

  // Si hay variantes, promocionamos mínimo vigente y mínimo original a nivel producto
  if (variants.length) {
    const vPrices = variants.map(v => v.price).filter((n): n is number => typeof n === "number");
    const vOriginals = variants.map(v => v.originalPrice).filter((n): n is number => typeof n === "number");

    const minCurrent = vPrices.length ? Math.min(...vPrices) : null;
    const minOriginal = vOriginals.length ? Math.min(...vOriginals) : null;

    // si el producto no tiene precio o el mínimo de variantes es menor, usamos el de variantes
    if (minCurrent != null && (price == null || minCurrent < price)) price = minCurrent;

    // si hay original a nivel variantes, úsalo para el tachado principal
    if (minOriginal != null) {
      originalPrice = minOriginal;
    }

    // edge case: si solo tenemos original y no current, mantenemos igual;
    // si tenemos ambos y current >= original, limpiamos original para no mostrar tachado inválido
    if (price != null && originalPrice != null && price >= originalPrice) {
      originalPrice = null;
    }
  }

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
    description,
    variants,
  };
}
