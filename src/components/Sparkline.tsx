import { useId } from 'react';

interface Props {
  values: number[];
  width?: number;
  height?: number;
}

/** A tiny dependency-free SVG line chart for the table's "last 7 days" column. */
export function Sparkline({ values, width = 112, height = 34 }: Props) {
  const gradientId = 'spark' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;

  // ~170 hourly samples is more detail than 112px can show; thin it out.
  const step = Math.max(1, Math.floor(values.length / 56));
  const pts = values.filter((_, i) => i % step === 0 || i === values.length - 1);
  const min = Math.min(...pts);
  const span = Math.max(...pts) - min || 1;
  const pad = 2;

  const line = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * width;
      const y = height - pad - ((v - min) / span) * (height - pad * 2);
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join('');
  const color = pts[pts.length - 1] >= pts[0] ? 'var(--up)' : 'var(--down)';

  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${width},${height}L0,${height}Z`} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
