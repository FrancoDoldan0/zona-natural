// components/ui/TrackLink.tsx
"use client";

import Link from "next/link";
import { bumpProductClick } from "@/lib/metrics";

export default function TrackLink({
  href,
  slug,
  className,
  children,
}: {
  href: string;
  slug?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => slug && bumpProductClick(slug)}
    >
      {children}
    </Link>
  );
}
