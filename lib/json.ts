import { NextResponse } from "next/server";

export function json(data: any, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  // Asegurar charset UTF-8 para que clientes (como PowerShell 5) decodifiquen bien
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new NextResponse(JSON.stringify(data), { ...init, headers });
}