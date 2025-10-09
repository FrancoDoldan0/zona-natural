// lib/http.ts
import { headers } from "next/headers";
export { toR2Url } from "./img";

/** Construye URL absoluta segura para CF Pages / Edge */
export async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return base + path;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

/** Wrapper de fetch sin cache (útil para datos en tiempo real) */
export async function noStoreFetch(input: string, init?: RequestInit) {
  return fetch(input, {
    cache: "no-store",
    next: { revalidate: 0 },
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    ...init,
  });
}
