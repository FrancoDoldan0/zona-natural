// lib/img.ts
export type ImageInput =
  | string
  | { url?: string | null; key?: string | null; r2Key?: string | null }
  | null
  | undefined;

function isAbs(u: string) {
  return /^(https?:)?\/\//i.test(u) || /^data:/.test(u) || /^blob:/.test(u);
}

/** Resuelve url | key | r2Key usando PUBLIC_R2_BASE_URL / NEXT_PUBLIC_R2_BASE_URL */
export function toR2Url(input: ImageInput): string {
  if (!input) return "";
  const PUB = (process.env.NEXT_PUBLIC_R2_BASE_URL ||
    process.env.PUBLIC_R2_BASE_URL ||
    "").replace(/\/+$/, "");

  if (typeof input === "string") {
    if (!input) return "";
    if (isAbs(input)) return input;
    const keyish = input.replace(/^\/+/, "");
    return PUB ? `${PUB}/${keyish}` : keyish;
  }

  const u = input.url ?? undefined;
  const k = input.r2Key ?? input.key ?? undefined;

  if (u) {
    if (isAbs(u)) return u;
    const keyish = u.replace(/^\/+/, "");
    return PUB ? `${PUB}/${keyish}` : keyish;
  }
  if (k) {
    const keyish = k.replace(/^\/+/, "");
    return PUB ? `${PUB}/${keyish}` : keyish;
  }
  return "";
}
