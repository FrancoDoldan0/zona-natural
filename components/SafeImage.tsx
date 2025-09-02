// components/SafeImage.tsx
"use client";

import * as React from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

export default function SafeImage({ fallbackSrc = "/placeholder.png", ...imgProps }: Props) {
  const [src, setSrc] = React.useState(imgProps.src ?? fallbackSrc);

  return (
    <img
      {...imgProps}
      src={src as string}
      onError={() => setSrc(fallbackSrc)}
      // preserva estilos que le pases desde el padre
      style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", ...(imgProps.style || {}) }}
    />
  );
}
