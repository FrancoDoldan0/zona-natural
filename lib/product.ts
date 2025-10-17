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
  /** precio vigente (puede ser oferta) */
  price?: number | null;
  /** precio original (tachado si corresponde) */
  originalPrice?: number | null;
};

export type NormalizedProduct = {
  id: number | string;
  slug: string;
  title: string;
  image?: string | null;
  /** precio vigente a nivel producto (de la variante más barata si existen) */
  price?: number | null;
  /** precio original correspondiente a esa variante (para tachado) */
  originalPrice?: number | null;
  outOfStock?: boolean;
  brand?: string | null;
  subtitle?: string | null;
  description?: string | null;
  /** variantes normalizadas (máx. 3 las usa la Card) */
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
  let price = toNum(raw.priceFinal) ?? toNum(raw.price);
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

  // Variantes: en admin el campo “Precio” es el vigente (puede ser oferta)
  // y “Precio original” es el tachado.
  const variants: NormalizedVariant[] = Array.isArray(raw.variants)
    ? (raw.variants as any[]).map((v, i) => ({
        label: String(v.label ?? "").trim() || `Var ${i + 1}`,
        price: toNum(v.price ?? v.priceFinal),          // por compatibilidad si aún existe priceFinal
        originalPrice: toNum(v.priceOriginal),
      }))
    : [];

  // Si hay variantes, elegimos la “más barata” por precio vigente y usamos
  // su original para el tachado (consistencia).
  if (variants.length) {
    const withCurrent = variants.filter((v) => typeof v.price === "number");
    let chosen: NormalizedVariant | null = null;

    if (withCurrent.length) {
      chosen = withCurrent.reduce((min, v) =>
        (min?.price ?? Infinity) > (v.price as number) ? v : min
      , withCurrent[0]);
    } else {
      // si no hay precios vigentes, elegimos por original más bajo
      const withOriginal = variants.filter((v) => typeof v.originalPrice === "number");
      if (withOriginal.length) {
        chosen = withOriginal.reduce((min, v) =>
          (min?.originalPrice ?? Infinity) > (v.originalPrice as number) ? v : min
        , withOriginal[0]);
      }
    }

    if (chosen) {
      price = chosen.price ?? price;
      if (chosen.originalPrice != null) originalPrice = chosen.originalPrice;
    }

    // Si la comparación no da oferta, no mostramos tachado.
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
