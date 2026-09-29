// ============================================================
// RivalIQ Official Brand Logo Component
// ============================================================

import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'mark';
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function BrandLogo({
  variant = 'full',
  height = 26,
  className = '',
  style = {},
}: BrandLogoProps) {
  const src = variant === 'mark' ? '/rivaliq-mark.png' : '/rivaliq-full.png';

  return (
    <img
      src={src}
      alt="RivalIQ"
      className={className}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}
