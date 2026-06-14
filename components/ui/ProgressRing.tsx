import React from 'react';

interface Props {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  trackClassName?: string;
  progressClassName?: string;
  children?: React.ReactNode;
}

/** Circular progress gauge (SVG). Color via Tailwind stroke-* classes. */
export const ProgressRing = ({
  value,
  size = 96,
  stroke = 8,
  trackClassName = 'stroke-white/15',
  progressClassName = 'stroke-white',
  children,
}: Props): React.ReactNode => {
  const v = Math.max(0, Math.min(100, value || 0));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - v / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClassName} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={progressClassName}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">{children}</div>
    </div>
  );
};

export default ProgressRing;
