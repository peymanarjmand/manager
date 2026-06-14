import React from 'react';

interface Props {
  data: number[];
  className?: string;
  height?: number;
  strokeWidth?: number;
}

/** Lightweight decorative sparkline (SVG). Color inherits via currentColor. */
export const Sparkline = ({ data, className, height = 34, strokeWidth = 2 }: Props): React.ReactNode => {
  if (!data || data.length < 2) return null;
  const w = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((d, i) => `${(i / (data.length - 1)) * w},${height - 3 - ((d - min) / range) * (height - 6)}`)
    .join(' ');
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export default Sparkline;
