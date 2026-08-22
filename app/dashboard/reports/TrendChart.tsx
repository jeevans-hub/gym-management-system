'use client';

import { useId } from 'react';
import ReportEmptyState from './ReportEmptyState';

interface ChartPoint {
  label: string;
  value: number;
}

export default function TrendChart({
  title,
  description,
  points,
  color,
  kind = 'line',
  valueFormatter = (value) => String(value),
}: {
  title: string;
  description: string;
  points: ChartPoint[];
  color: string;
  kind?: 'line' | 'bar';
  valueFormatter?: (value: number) => string;
}) {
  const id = useId().replace(/:/g, '');
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const width = 680;
  const height = 260;
  const padding = { top: 18, right: 18, bottom: 44, left: 52 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...points.map((point) => point.value), 0);

  if (!points.length || maxValue === 0) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p></div>
        <ReportEmptyState compact title="No activity in this range" message="Choose another reporting period when source activity is available." />
      </article>
    );
  }

  const yMax = maxValue * 1.1 || 1;
  const xAt = (index: number) => padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
  const yAt = (value: number) => padding.top + chartHeight - (value / yMax) * chartHeight;
  const linePath = points.map((point, index) => `${index ? 'L' : 'M'} ${xAt(index)} ${yAt(point.value)}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const barWidth = Math.max(3, Math.min(28, (chartWidth / points.length) * 0.62));

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <div className="p-3 sm:p-4">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`} className="block h-auto w-full overflow-visible">
          <title id={titleId}>{title}</title>
          <desc id={descriptionId}>{description}</desc>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight - ratio * chartHeight;
            return (
              <g key={ratio}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padding.left - 9} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">{valueFormatter(yMax * ratio)}</text>
              </g>
            );
          })}
          {kind === 'bar' ? points.map((point, index) => {
            const y = yAt(point.value);
            return (
              <rect key={`${point.label}-${index}`} x={xAt(index) - barWidth / 2} y={y} width={barWidth} height={padding.top + chartHeight - y} rx="3" fill={color} opacity="0.88">
                <title>{point.label}: {valueFormatter(point.value)}</title>
              </rect>
            );
          }) : (
            <>
              <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point, index) => <circle key={`${point.label}-${index}`} cx={xAt(index)} cy={yAt(point.value)} r="4" fill="white" stroke={color} strokeWidth="3"><title>{point.label}: {valueFormatter(point.value)}</title></circle>)}
            </>
          )}
          {points.map((point, index) => (index % labelStep === 0 || index === points.length - 1) ? (
            <text key={`label-${point.label}-${index}`} x={xAt(index)} y={height - 14} textAnchor="middle" fontSize="10" fill="#64748b">{point.label}</text>
          ) : null)}
        </svg>
        <ul className="sr-only">{points.map((point, index) => <li key={`${point.label}-accessible-${index}`}>{point.label}: {valueFormatter(point.value)}</li>)}</ul>
      </div>
    </article>
  );
}
