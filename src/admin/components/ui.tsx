import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

/* ------------------------------- surfaces -------------------------- */

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    {...props}
    className={cn(
      'rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
      className
    )}
  />
);

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className }) => (
  <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)}>
    <div className="min-w-0">
      <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: string;
}> = ({ title, subtitle, actions, breadcrumb }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {breadcrumb ? (
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
          {breadcrumb}
        </p>
      ) : null}
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-[22px]">{title}</h1>
      {subtitle ? <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

/* ------------------------------- controls -------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: 'sm' | 'md';
    loading?: boolean;
    icon?: React.ReactNode;
  }
> = ({ variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...props }) => {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-[#c8102e] text-white hover:bg-[#a90d26] border border-transparent shadow-[0_1px_2px_rgba(200,16,46,0.25)]',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    outline: 'bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100',
    danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]/30 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-[13px]',
        variants[variant],
        className
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input
    {...props}
    className={cn(
      'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400',
      'focus:border-[#c8102e]/40 focus:outline-none focus:ring-2 focus:ring-[#c8102e]/10 disabled:bg-slate-50',
      className
    )}
  />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  ...props
}) => (
  <textarea
    {...props}
    className={cn(
      'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400',
      'focus:border-[#c8102e]/40 focus:outline-none focus:ring-2 focus:ring-[#c8102e]/10',
      className
    )}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, ...props }) => (
  <select
    {...props}
    className={cn(
      'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700',
      'focus:border-[#c8102e]/40 focus:outline-none focus:ring-2 focus:ring-[#c8102e]/10',
      className
    )}
  />
);

export const Field: React.FC<{
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, required, children, className }) => (
  <label className={cn('block', className)}>
    <span className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {label}
      {required ? <span className="text-[#c8102e]">*</span> : null}
    </span>
    {children}
    {hint ? <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{hint}</span> : null}
  </label>
);

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
      checked ? 'bg-slate-900' : 'bg-slate-300',
      disabled && 'cursor-not-allowed opacity-50'
    )}
  >
    <span
      className={cn(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-[18px] rtl:-translate-x-[18px]' : 'translate-x-[3px] rtl:-translate-x-[3px]'
      )}
    />
  </button>
);

export const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => (
  <div className={cn('relative', className)}>
    <svg
      className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-lg border border-slate-200 bg-white ps-8 pe-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-[#c8102e]/40 focus:outline-none focus:ring-2 focus:ring-[#c8102e]/10"
    />
    {value ? (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    ) : null}
  </div>
);

/* ------------------------------- badges ---------------------------- */

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  brand: 'bg-[#c8102e]/8 text-[#a90d26] ring-[#c8102e]/20',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({
  tone = 'neutral',
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
      TONES[tone],
      className
    )}
  >
    {children}
  </span>
);

const ORDER_STATUS_KEY: Record<string, string> = {
  'Order Received': 'badge.orderReceived',
  'Pending Verification': 'badge.pendingVerification',
  Verification: 'badge.verification',
  Confirmed: 'badge.confirmed',
  Preparing: 'badge.preparing',
  'Out for Delivery': 'badge.outForDelivery',
  Delivered: 'badge.delivered',
  'On Hold': 'badge.onHold',
  Cancelled: 'badge.cancelled',
  Rejected: 'badge.rejected',
};

const ORDER_STATUS_TONE: Record<string, Tone> = {
  'Order Received': 'info',
  'Pending Verification': 'warning',
  Verification: 'warning',
  Confirmed: 'brand',
  Preparing: 'info',
  'Out for Delivery': 'info',
  Delivered: 'success',
  'On Hold': 'warning',
  Cancelled: 'danger',
  Rejected: 'danger',
};

export const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const { t } = useAdminI18n();
  const key = ORDER_STATUS_KEY[status] as never;
  return <Badge tone={ORDER_STATUS_TONE[status] || 'neutral'}>{key ? t(key) : status}</Badge>;
};

const PAYMENT_STATUS_TONE: Record<string, Tone> = {
  Paid: 'success',
  Pending: 'warning',
  Failed: 'danger',
  Refunded: 'neutral',
  'Cash on Delivery': 'info',
};

const PAYMENT_STATUS_KEY: Record<string, string> = {
  Paid: 'badge.paid',
  Pending: 'badge.pending',
  Failed: 'badge.failed',
  Refunded: 'badge.refunded',
  'Cash on Delivery': 'badge.cod',
};

export const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const { t } = useAdminI18n();
  const key = PAYMENT_STATUS_KEY[status] as never;
  return <Badge tone={PAYMENT_STATUS_TONE[status] || 'neutral'}>{key ? t(key) : status}</Badge>;
};

export const AvailabilityBadge: React.FC<{ value: string }> = ({ value }) => {
  const { t } = useAdminI18n();
  if (value === 'In Stock') return <Badge tone="success">{t('badge.inStock')}</Badge>;
  if (value === 'Limited Stock') return <Badge tone="warning">{t('badge.limited')}</Badge>;
  return <Badge tone="danger">{t('badge.outOfStock')}</Badge>;
};

export const ActiveBadge: React.FC<{ active: boolean }> = ({ active }) => {
  const { t } = useAdminI18n();
  return active ? (
    <Badge tone="success">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {t('common.active')}
    </Badge>
  ) : (
    <Badge tone="neutral">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {t('common.inactive')}
    </Badge>
  );
};

/* ------------------------------ states ----------------------------- */

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 6 }) => (
  <div className="divide-y divide-slate-100">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-4 px-5 py-3.5">
        {Array.from({ length: cols }).map((__, c) => (
          <Skeleton key={c} className={cn('h-3.5', c === 0 ? 'w-28' : c === 1 ? 'w-36' : 'w-20')} />
        ))}
      </div>
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      {icon || <Inbox className="h-5 w-5" />}
    </div>
    <p className="text-[13px] font-semibold text-slate-700">{title}</p>
    {description ? <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({ message, onRetry }) => {
  const { t } = useAdminI18n();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle className="h-5 w-5" />
      </div>
      <p className="text-[13px] font-semibold text-slate-800">{t('error.title')}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{message || t('error.load')}</p>
      {onRetry ? (
        <Button className="mt-4" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  );
};

export const PermissionDenied: React.FC = () => {
  const { t } = useAdminI18n();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{t('error.permission')}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{t('error.permissionBody')}</p>
    </div>
  );
};

export const InlineNotice: React.FC<{
  tone?: 'info' | 'warning' | 'danger' | 'success';
  children: React.ReactNode;
}> = ({ tone = 'info', children }) => {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[tone];
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed', styles)}>
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
};

/* ------------------------------- modal ----------------------------- */

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, onClose, title, description, children, footer, width = 'max-w-lg' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:rounded-2xl',
          width
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children ? <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div> : null}
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}> = ({ open, title, description, confirmLabel, danger, loading, onConfirm, onClose, children }) => {
  const { t } = useAdminI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      width="max-w-md"
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            variant={danger ? 'primary' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            className={danger ? 'bg-[#b42318] hover:bg-[#971a12]' : undefined}
          >
            {confirmLabel || t('common.confirm')}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
};

/* ------------------------------ toasts ----------------------------- */

interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

const ToastContext = createContext<{ push: (message: string, tone?: ToastItem['tone']) => void } | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastItem['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 end-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-[13px] shadow-lg',
              item.tone === 'error' ? 'border-red-200' : item.tone === 'info' ? 'border-sky-200' : 'border-emerald-200'
            )}
          >
            {item.tone === 'error' ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <CheckCircle2
                className={cn('mt-0.5 h-4 w-4 shrink-0', item.tone === 'info' ? 'text-sky-500' : 'text-emerald-500')}
              />
            )}
            <span className="text-slate-700">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

/* ---------------------------- pagination --------------------------- */

export const Pagination: React.FC<{
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}> = ({ page, pageSize, total, onPageChange }) => {
  const { t } = useAdminI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);

  const windowed = useMemo(() => {
    const list: number[] = [];
    const from = Math.max(0, Math.min(page - 1, pages - 3));
    for (let i = from; i < Math.min(pages, from + 3); i++) list.push(i);
    return list;
  }, [page, pages]);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row">
      <p className="text-[11px] text-slate-500">
        {start}–{end} {t('common.of')} {total} {t('common.rows')}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
          aria-label={t('common.prev')}
        >
          <ChevronLeft className="h-3.5 w-3.5 rtl:hidden" />
          <ChevronRight className="hidden h-3.5 w-3.5 rtl:block" />
        </button>
        {windowed.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              'h-7 min-w-7 rounded-md px-1.5 text-[11px] font-semibold',
              p === page ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {p + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pages - 1, page + 1))}
          disabled={page >= pages - 1}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
          aria-label={t('common.next')}
        >
          <ChevronRight className="h-3.5 w-3.5 rtl:hidden" />
          <ChevronLeft className="hidden h-3.5 w-3.5 rtl:block" />
        </button>
      </div>
    </div>
  );
};

/* ------------------------------ range ------------------------------ */

export const RangePicker: React.FC<{
  preset: import('../lib/types').RangePreset;
  onChange: (preset: import('../lib/types').RangePreset) => void;
  custom?: { from?: string; to?: string };
  onCustomChange?: (v: { from?: string; to?: string }) => void;
}> = ({ preset, onChange, custom, onCustomChange }) => {
  const { t } = useAdminI18n();
  const options: { key: import('../lib/types').RangePreset; label: string }[] = [
    { key: 'today', label: t('range.today') },
    { key: '7d', label: t('range.7d') },
    { key: '30d', label: t('range.30d') },
    { key: 'month', label: t('range.month') },
    { key: 'custom', label: t('range.custom') },
  ];
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              'whitespace-nowrap rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
              preset === opt.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={custom?.from || ''}
            onChange={(e) => onCustomChange?.({ ...custom, from: e.target.value })}
            className="h-8 rounded-md border border-slate-200 px-2 text-[11px] text-slate-700"
            aria-label={t('common.from')}
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            value={custom?.to || ''}
            onChange={(e) => onCustomChange?.({ ...custom, to: e.target.value })}
            className="h-8 rounded-md border border-slate-200 px-2 text-[11px] text-slate-700"
            aria-label={t('common.to')}
          />
        </div>
      ) : null}
    </div>
  );
};
