// components/SafeImage.tsx
'use client';

import React from 'react';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

export default function SafeImage({
  src,
  alt,
  style,
  className,
  fallbackSrc = '/placeholder.jpg',
  ...rest
}: Props) {
  const [err, setErr] = React.useState(false);

  // Normalizo la ruta: http(s) | /absoluta | relativa -> /relativa
  const finalSrc = React.useMemo(() => {
    if (err || !src) return fallbackSrc;
    const s = String(src);
    if (s.startsWith('http') || s.startsWith('/')) return s;
    return `/${s}`;
  }, [err, src, fallbackSrc]);

  return (
    <img
      src={finalSrc}
      alt={alt ?? ''}
      onError={() => setErr(true)}
      style={style}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      {...rest}
    />
  );
}
