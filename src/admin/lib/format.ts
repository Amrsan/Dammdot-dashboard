import type { RangePreset } from './types';

export const currency = (value: number, locale = 'en-EG') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);

export const compactNumber = (value: number, locale = 'en') =>
  new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);

export const formatDate = (value?: string | null, locale = 'en-GB') => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value?: string | null, locale = 'en-GB') => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const timeAgo = (value: string, lang: 'en' | 'ar') => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return lang === 'ar' ? 'الآن' : 'just now';
  if (minutes < 60) return lang === 'ar' ? `قبل ${minutes} دقيقة` : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return lang === 'ar' ? `قبل ${hours} ساعة` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return lang === 'ar' ? `قبل ${days} يوم` : `${days}d ago`;
  return formatDate(value, lang === 'ar' ? 'ar-EG' : 'en-GB');
};

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function resolveRange(
  preset: RangePreset,
  custom?: { from?: string; to?: string }
): { from: Date; to: Date; days: number } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      return { from, to, days: 1 };
    case '7d':
      from.setDate(from.getDate() - 6);
      return { from, to, days: 7 };
    case '30d':
      from.setDate(from.getDate() - 29);
      return { from, to, days: 30 };
    case 'month':
      from.setDate(1);
      return { from, to, days: Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000)) };
    case 'year':
      from.setMonth(0, 1);
      return { from, to, days: Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000)) };
    case 'custom': {
      const f = custom?.from ? new Date(custom.from) : new Date(from);
      const t = custom?.to ? new Date(custom.to) : new Date(to);
      f.setHours(0, 0, 0, 0);
      t.setHours(23, 59, 59, 999);
      return {
        from: f,
        to: t,
        days: Math.max(1, Math.ceil((t.getTime() - f.getTime()) / 86400000)),
      };
    }
    default:
      from.setDate(from.getDate() - 29);
      return { from, to, days: 30 };
  }
}

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (!rows.length) return '';
  const keys = headers?.length ? headers : Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join('\n');
}

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([`\uFEFF${content}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
