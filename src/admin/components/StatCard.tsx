import React from 'react';
import { cn, Skeleton } from './ui';

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  tone?: 'brand' | 'amber' | 'emerald' | 'slate' | 'sky';
  loading?: boolean;
  onClick?: () => void;
}> = ({ label, value, icon, hint, tone = 'slate', loading, onClick }) => {
  const tones: Record<string, string> = {
    brand: 'bg-[#c8102e]/8 text-[#c8102e]',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-100 text-slate-500',
    sky: 'bg-sky-50 text-sky-600',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
        onClick && 'cursor-pointer transition-colors hover:border-slate-300'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
        {icon ? (
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-24" />
      ) : (
        <p className="mt-2 truncate text-[21px] font-semibold leading-none tracking-tight text-slate-900 sm:text-[26px]">
          {value}
        </p>
      )}
      {hint ? <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-400">{hint}</p> : null}
    </div>
  );
};
