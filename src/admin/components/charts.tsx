import React, { useMemo } from 'react';
import { useAdminI18n } from '../lib/i18n';

/* Lightweight dependency-free charts (inline SVG) so the dashboard stays fast. */

export interface SeriesPoint {
  label: string;
  value: number;
  secondary?: number;
}

const niceMax = (value: number) => {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

export const TrendChart: React.FC<{
  data: SeriesPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  /** Compact formatter for the y-axis so labels never overflow the plot area. */
  axisFormat?: (v: number) => string;
  showSecondary?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  color?: string;
}> = ({
  data,
  height = 210,
  formatValue = (v) => String(v),
  axisFormat,
  showSecondary = false,
  primaryLabel,
  secondaryLabel,
  color = '#c8102e',
}) => {
  const { t } = useAdminI18n();
  const width = 640;
  const padding = { top: 14, right: 12, bottom: 26, left: 52 };
  const tickLabel = axisFormat || formatValue;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const { points, secondaryPoints, max, ticks } = useMemo(() => {
    const maxPrimary = niceMax(Math.max(...data.map((d) => d.value), 1));
    // The secondary series (revenue) is drawn on its own scale, otherwise a few
    // thousand EGP would flatten an order-count line of 1–3 into the axis.
    const maxSecondary = niceMax(Math.max(...data.map((d) => d.secondary || 0), 1));
    const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
    const mapPrimary = (v: number) => padding.top + innerH - (v / maxPrimary) * innerH;
    const mapSecondary = (v: number) => padding.top + innerH - (v / maxSecondary) * innerH;
    const pts = data.map((d, i) => ({ x: padding.left + i * stepX, y: mapPrimary(d.value), ...d }));
    const sec = data.map((d, i) => ({ x: padding.left + i * stepX, y: mapSecondary(d.secondary || 0) }));
    const tickValues = [0, maxPrimary * 0.5, maxPrimary];
    return { points: pts, secondaryPoints: sec, max: maxPrimary, ticks: tickValues };
  }, [data, innerW, innerH, padding.left, padding.top, showSecondary]);

  if (!data.length) {
    return (
      <div className="flex h-[180px] items-center justify-center text-xs text-slate-400">{t('reports.noData')}</div>
    );
  }

  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${padding.left},${padding.top + innerH} ${line} ${points[points.length - 1].x},${padding.top + innerH}`;
  const secondaryLine = secondaryPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div>
      {(primaryLabel || secondaryLabel) && (
        <div className="mb-2 flex items-center gap-4 px-1 text-[11px] text-slate-500">
          {primaryLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-full" style={{ background: color }} />
              {primaryLabel}
            </span>
          ) : null}
          {showSecondary && secondaryLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-full bg-slate-300" />
              {secondaryLabel}
            </span>
          ) : null}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={primaryLabel}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const y = padding.top + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#eef1f5"
                strokeWidth="1"
              />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                {tickLabel(tick)}
              </text>
            </g>
          );
        })}
        <polygon points={area} fill="url(#trend-fill)" />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {showSecondary ? (
          <polyline
            points={secondaryLine}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        ) : null}
        {points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle cx={p.x} cy={p.y} r="7" fill="transparent">
              <title>{`${p.label}: ${formatValue(p.value)}`}</title>
            </circle>
            <circle cx={p.x} cy={p.y} r="2" fill="#fff" stroke={color} strokeWidth="1.5" />
            {i % labelEvery === 0 ? (
              <text x={p.x} y={height - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
};

export const Donut: React.FC<{
  slices: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
}> = ({ slices, centerLabel, centerValue, size = 168 }) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (!total) {
    return (
      <div
        className="mx-auto flex items-center justify-center rounded-full border-[14px] border-slate-100 text-xs text-slate-400"
        style={{ width: size, height: size }}
      >
        —
      </div>
    );
  }

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        {slices.map((slice) => {
          const length = (slice.value / total) * circumference;
          const dash = `${Math.max(0, length - 2)} ${circumference - Math.max(0, length - 2)}`;
          const el = (
            <circle
              key={slice.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="14"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            >
              <title>{`${slice.label}: ${slice.value}`}</title>
            </circle>
          );
          offset += length;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-slate-900">{centerValue ?? total}</span>
        {centerLabel ? <span className="text-[10px] uppercase tracking-wider text-slate-400">{centerLabel}</span> : null}
      </div>
    </div>
  );
};

export const Legend: React.FC<{ items: { label: string; value: number; color: string }[] }> = ({ items }) => {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="min-w-0 flex-1 truncate text-slate-600">{item.label}</span>
          <span className="font-semibold text-slate-800">{item.value}</span>
          <span className="w-9 text-end text-[10px] text-slate-400">{Math.round((item.value / total) * 100)}%</span>
        </li>
      ))}
    </ul>
  );
};

export const HBarList: React.FC<{
  items: { label: string; value: number; hint?: string }[];
  valueLabel?: (v: number) => string;
  color?: string;
}> = ({ items, valueLabel = (v) => String(v), color = '#c8102e' }) => {
  const { t } = useAdminI18n();
  const max = Math.max(...items.map((i) => i.value), 1);
  if (!items.length) return <p className="px-1 py-6 text-center text-xs text-slate-400">{t('dash.noData')}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-medium text-slate-700" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-slate-500">
              {valueLabel(item.value)}
              {item.hint ? <span className="ms-1 font-normal text-slate-400">· {item.hint}</span> : null}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(3, (item.value / max) * 100)}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

export const STATUS_COLORS: Record<string, string> = {
  'Order Received': '#0ea5e9',
  'Pending Verification': '#f59e0b',
  Verification: '#eab308',
  Confirmed: '#c8102e',
  Preparing: '#8b5cf6',
  'Out for Delivery': '#6366f1',
  Delivered: '#10b981',
  'On Hold': '#f97316',
  Cancelled: '#94a3b8',
  Rejected: '#64748b',
};
