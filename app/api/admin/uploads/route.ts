export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const ALLOWED = new Set(["image/jpeg","image/png","image/webp","image/avif"]);
const MAX = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok:false, error:"Bad form" }, { status:400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok:false, error:"Missing file" }, { status:400 });

  const type = (file.type || "").toLowerCase();
  if (!ALLOWED.has(type)) return NextResponse.json({ ok:false, error:"Tipo no permitido (JPG/PNG/WEBP/AVIF)" }, { status:400 });
  if (file.size > MAX) return NextResponse.json({ ok:false, error:"Archivo muy grande (máx 5MB)" }, { status:400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = ({ "image/jpeg":".jpg", "image/png":".png", "image/webp":".webp", "image/avif":".avif" } as Record<string,string>)[type] || "";

  const now = new Date();
  const relDir = path.posix.join("uploads", String(now.getFullYear()), String(now.getMonth()+1).padStart(2,"0"));
  const absDir = path.join(process.cwd(), "public", relDir);
  await fs.mkdir(absDir, { recursive: true });

  const name = crypto.randomBytes(16).toString("hex") + ext;
  const abs = path.join(absDir, name);
  await fs.writeFile(abs, buf);

  const url = ("/" + path.posix.join(relDir, name)).replace(/\\+/g,"/");
  return NextResponse.json({ ok:true, url });
}