// lib/auth.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { NextRequest } from 'next/server'
import { getEnv } from '@/lib/cf-env'

/**
 * Nombre único para el cookie de sesión del panel admin.
 * Alineá tu middleware y tu login con este nombre.
 */
export const SESSION_COOKIE_NAME = 'admin_token'

/** Días por defecto de vigencia de la sesión */
const DEFAULT_SESSION_DAYS = 7

let _secretCache: { raw: string; bytes: Uint8Array } | null = null

function resolveSecretString(): string {
  // Intentamos primero por tu helper (Cloudflare Pages)
  let s: string | undefined
  try {
    s = getEnv().JWT_SECRET
  } catch {
    // ignore: permite usar el módulo en contexts donde getEnv no esté disponible
  }

  // Fallback a process.env por si estás corriendo en Node local
  if (!s) s = process.env.JWT_SECRET

  // En producción: obligatorio
  if (!s || s.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is not set in the environment')
    }
    // En dev permitimos un secreto por defecto
    s = 'dev-secret-change-me'
  }
  return s
}

function getSecret(): Uint8Array {
  const raw = resolveSecretString()
  if (!_secretCache || _secretCache.raw !== raw) {
    _secretCache = { raw, bytes: new TextEncoder().encode(raw) }
  }
  return _secretCache.bytes
}

/**
 * Firmar un JWT de sesión.
 * `payload` puede incluir, por ejemplo: { uid, email, role: 'admin' }
 */
export async function signSession(
  payload: Record<string, any>,
  days: number = DEFAULT_SESSION_DAYS
): Promise<string> {
  return await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(getSecret())
}

/**
 * Verificar un JWT de sesión. Devuelve el payload o null si no es válido / expiró.
 */
export async function verifySession(token?: string): Promise<JWTPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      // tolerancia pequeña por posibles desfasajes de reloj en edge
      clockTolerance: '5s',
    })
    return payload
  } catch {
    return null
  }
}

/**
 * Extraer el token del header Cookie.
 */
export function getTokenFromCookieHeader(cookieHeader?: string | null): string | null {
  if (!cookieHeader) return null
  // Busca admin_token=... en el header Cookie
  const m = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`)
  )
  return m?.[1] ?? null
}

/**
 * Extraer el token desde un Request/NextRequest.
 */
export function getTokenFromRequest(req: Request | NextRequest): string | null {
  return getTokenFromCookieHeader(req.headers.get('cookie'))
}

/**
 * Leer y verificar la sesión directamente desde un Request.
 */
export async function readSessionFromRequest(
  req: Request | NextRequest
): Promise<JWTPayload | null> {
  const token = getTokenFromRequest(req)
  return await verifySession(token ?? undefined)
}

/**
 * Opciones estándar para setear el cookie de sesión.
 * Úsalo con `cookies().set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions(days))`
 * o con `NextResponse.cookies.set(...)`.
 */
export function buildSessionCookieOptions(days: number = DEFAULT_SESSION_DAYS) {
  const maxAge = days * 24 * 60 * 60 // en segundos
  return {
    httpOnly: true,
    secure: true, // en CF Pages siempre HTTPS
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

/**
 * Helper para borrar la sesión (construye opciones de borrado).
 * Útil para logout.
 */
export function buildClearSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}

export function sessionCookieOptions(days = 7) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: days * 24 * 60 * 60,
  };
}