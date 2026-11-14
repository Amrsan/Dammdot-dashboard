import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchDashboard } from '../data/adminApi';
import type { AdminOrder, DateRange, DashboardData, RangePreset } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { resolveRange, currency, formatDate } from '../lib/format';
import { ADMIN_ROUTES } from '../components/AdminLayout';
import { Card, CardHeader, PageHeader, RangePicker, Badge, Button, Skeleton, cn, OrderStatusBadge, PaymentStatusBadge } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { StatCard } from '../components/StatCard';
import { Donut, HBarList, Legend, STATUS_COLORS, TrendChart } from '../components/charts';
import type { AdminSession } from '../lib/types';

export const DashboardPage: React.FC<{
  navigate: (path: string) => void;
  session: AdminSession;
  onOpenOrder: (order: AdminOrder) => void;
}> = ({ navigate, session, onOpenOrder }) => {
  const { t, locale, lang } = useAdminI18n();
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});

  const range: DateRange = useMemo(() => {
    const resolved = resolveRange(preset, custom);
    return { from: resolved.from.toISOString(), to: resolved.to.toISOString() };
  }, [preset, custom]);

  const { data, loading, error, reload } = useAsync<DashboardData>(() => fetchDashboard(range), [
    range.from,
    range.to,
  ]);

  const metrics = data?.metrics;
  const can = (p: string) => session.permissions.includes(p as never);

  const series = useMemo(
    () =>
      (data?.series || []).map((point) => ({
        label: formatDate(point.date, locale).replace(/\s\d{4}$/, ''),
        value: point.orders,
        secondary: point.revenue,
      })),
    [data, locale]
  );

  const statusSlices = useMemo(
    () =>
      (data?.statusBreakdown || []).map((item) => ({
        label: item.status,
        value: item.count,
        color: STATUS_COLORS[item.status] || '#94a3b8',
      })),
    [data]
  );

  const recentColumns: Column<AdminOrder>[] = [
    {
      key: 'order',
      header: t('orders.colOrder'),
      render: (o) => (
        <div>
          <button
            type="button"
            onClick={() => onOpenOrder(o)}
            className="font-semibold text-slate-900 hover:text-[#c8102e]"
          >
            {o.order_number}
          </button>
          <p className="text-[10.5px] text-slate-400">{formatDate(o.created_at, locale)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: t('common.customer'),
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{o.customer_name}</p>
          <p className="truncate text-[10.5px] text-slate-400">{o.customer_phone}</p>
        </div>
      ),
    },
    {
      key: 'product',
      header: t('orders.colProduct'),
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate text-slate-700">{o.product_name}</p>
          <p className="text-[10.5px] text-slate-400">
            {o.blood_type} · {o.quantity} {lang === 'ar' ? 'وحدة' : 'unit(s)'}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: t('common.amount'),
      align: 'end',
      render: (o) => <span className="font-semibold tabular-nums text-slate-800">{currency(o.total, locale)}</span>,
    },
    {
      key: 'payment',
      header: t('orders.colPayment'),
      render: (o) => <PaymentStatusBadge status={o.payment_status} />,
    },
    {
      key: 'status',
      header: t('orders.colStatus'),
      render: (o) => <OrderStatusBadge status={o.order_status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (o) => (
        <Button size="sm" variant="ghost" onClick={() => onOpenOrder(o)} className="text-[11px]">
          {t('common.view')}
        </Button>
      ),
    },
  ];

  const secondaryMetrics = [
    { label: t('dash.aov'), value: currency(metrics?.averageOrderValue || 0, locale), icon: <Banknote className="h-3.5 w-3.5" /> },
    { label: t('dash.paidOrders'), value: metrics?.paidOrders ?? 0, icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    { label: t('dash.unpaidOrders'), value: metrics?.unpaidOrders ?? 0, icon: <Clock3 className="h-3.5 w-3.5" /> },
    { label: t('dash.cancelled'), value: metrics?.cancelledOrders ?? 0, icon: <XCircle className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <PageHeader
        title={t('dash.title')}
        subtitle={t('dash.subtitle')}
        actions={
          <>
            <RangePicker preset={preset} onChange={setPreset} custom={custom} onCustomChange={setCustom} />
            <Button size="sm" variant="secondary" onClick={reload} icon={<RefreshCw className="h-3.5 w-3.5" />}>
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </Button>
          </>
        }
      />

      {error ? (
        <Card className="mb-4 border-red-200 bg-red-50/60 px-4 py-3 text-[12.5px] text-red-700">
          {error} ·{' '}
          <button type="button" onClick={reload} className="font-semibold underline">
            {t('common.retry')}
          </button>
        </Card>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label={t('dash.totalOrders')}
          value={(metrics?.totalOrders ?? 0).toLocaleString(locale)}
          loading={loading}
          icon={<ClipboardList className="h-3.5 w-3.5" />}
          tone="sky"
          onClick={() => navigate(ADMIN_ROUTES.orders)}
        />
        <StatCard
          label={t('dash.pendingOrders')}
          value={(metrics?.pendingOrders ?? 0).toLocaleString(locale)}
          loading={loading}
          icon={<Clock3 className="h-3.5 w-3.5" />}
          tone="amber"
          onClick={() => navigate(`${ADMIN_ROUTES.orders}?status=Order Received`)}
        />
        <StatCard
          label={t('dash.completedOrders')}
          value={(metrics?.completedOrders ?? 0).toLocaleString(locale)}
          loading={loading}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="emerald"
          onClick={() => navigate(`${ADMIN_ROUTES.orders}?status=Delivered`)}
        />
        <StatCard
          label={t('dash.revenue')}
          value={currency(metrics?.revenue || 0, locale)}
          loading={loading}
          icon={<CreditCard className="h-3.5 w-3.5" />}
          tone="brand"
          hint={t('dash.revenueHint')}
        />
      </div>

      {/* Secondary metrics */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {secondaryMetrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{metric.label}</p>
              {loading ? <Skeleton className="mt-1 h-4 w-16" /> : <p className="mt-0.5 text-[15px] font-semibold text-slate-800">{metric.value}</p>}
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
              {metric.icon}
            </span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t('dash.ordersOverview')}
            subtitle={t('dash.ordersOverviewHint')}
            action={<Badge tone="neutral">{t(`range.${preset}` as never)}</Badge>}
          />
          <div className="px-3 pb-4">
            {loading ? (
              <Skeleton className="mx-2 h-[200px] w-[calc(100%-16px)]" />
            ) : (
              <TrendChart
                data={series}
                primaryLabel={t('orders.title')}
                secondaryLabel={t('dash.revenue')}
                showSecondary
                formatValue={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('dash.orderStatus')} subtitle={t('dash.orderStatusHint')} />
          <div className="px-4 pb-4">
            {loading ? (
              <Skeleton className="mx-auto h-[168px] w-[168px] rounded-full" />
            ) : (
              <>
                <Donut
                  slices={statusSlices}
                  centerLabel={t('orders.title')}
                  centerValue={String(metrics?.totalOrders ?? 0)}
                />
                <div className="mt-4">
                  <Legend items={statusSlices} />
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Recent orders */}
      <div className="mt-4">
        <div className="mb-2.5 flex items-end justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-900">{t('dash.recentOrders')}</h2>
            <p className="text-[11px] text-slate-500">{t('orders.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(ADMIN_ROUTES.orders)}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#c8102e] hover:underline"
          >
            {t('common.viewAll')} <ArrowRight className="h-3 w-3 rtl:-scale-x-100" />
          </button>
        </div>
        <DataTable
          columns={recentColumns}
          rows={data?.recentOrders || []}
          keyExtractor={(o) => o.id}
          loading={loading}
          error={null}
          emptyTitle={t('orders.empty')}
          emptyDescription={t('dash.noData')}
          onRowClick={onOpenOrder}
          dense
        />
      </div>

      {/* Operational cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={t('dash.topProducts')} subtitle={t('dash.topProductsHint')} />
          <div className="px-4 pb-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <HBarList
                items={(data?.topProducts || []).map((p) => ({
                  label: p.name,
                  value: p.quantity,
                  hint: `${p.orders} ${lang === 'ar' ? 'طلب' : 'orders'}`,
                }))}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('dash.bloodDemand')} subtitle={t('dash.bloodDemandHint')} />
          <div className="px-4 pb-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <HBarList
                items={(data?.bloodTypeDemand || []).map((b) => ({ label: b.bloodType, value: b.quantity }))}
                valueLabel={(v) => `${v} ${lang === 'ar' ? 'وحدة' : 'u'}`}
                color="#0f766e"
              />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('dash.areas')} subtitle={t('dash.areasHint')} />
            <div className="px-4 pb-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <HBarList
                  items={(data?.areaDemand || []).map((a) => ({
                    label: a.area,
                    value: a.orders,
                  }))}
                  valueLabel={(v) => `${v}`}
                  color="#334155"
                />
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title={t('dash.health')} />
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('dash.newCustomers')}
                </p>
                {loading ? <Skeleton className="mt-1 h-4 w-10" /> : <p className="text-[15px] font-semibold text-slate-800">{metrics?.newCustomers ?? 0}</p>}
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('dash.returningCustomers')}
                </p>
                {loading ? <Skeleton className="mt-1 h-4 w-10" /> : <p className="text-[15px] font-semibold text-slate-800">{metrics?.returningCustomers ?? 0}</p>}
              </div>
              <button
                type="button"
                onClick={() => navigate(ADMIN_ROUTES.payments)}
                className={cn(
                  'col-span-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-[11.5px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900'
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {t('nav.payments')}
                </span>
                <ArrowRight className="h-3 w-3 rtl:-scale-x-100" />
              </button>
            </div>
          </Card>
        </div>
      </div>

      {!can('orders.write') ? (
        <p className="mt-4 text-[11px] text-slate-400">{t('common.readOnly')}</p>
      ) : null}
    </div>
  );
};
