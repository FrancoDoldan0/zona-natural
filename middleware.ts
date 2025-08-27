import { NextResponse } from "next/server";
export function middleware() {
  // no-op: deja pasar
  return NextResponse.next();
}
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};