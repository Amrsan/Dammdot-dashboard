import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchReports, fetchOrdersPage, type ReportData } from '../data/adminApi';
import type { DateRange, RangePreset } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { currency, downloadFile, formatDate, resolveRange, toCsv } from '../lib/format';
import {
  Button,
  Card,
  CardHeader,
  InlineNotice,
  PageHeader,
  RangePicker,
  Skeleton,
  useToast,
} from '../components/ui';
import { HBarList, Legend, TrendChart, STATUS_COLORS } from '../components/charts';
import { DataTable, type Column } from '../components/DataTable';

export const ReportsPage: React.FC = () => {
  const { t, locale, lang } = useAdminI18n();
  const toast = useToast();
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});

  const range: DateRange = useMemo(() => {
    const resolved = resolveRange(preset, custom);
    return { from: resolved.from.toISOString(), to: resolved.to.toISOString() };
  }, [preset, custom]);

  const report = useAsync<ReportData>(() => fetchReports(range), [range.from, range.to]);

  const data = report.data;

  const exportReport = async (kind: 'orders' | 'products' | 'delivery') => {
    try {
      if (kind === 'products') {
        const rows = (data?.topProducts || []).map((p) => ({
          product: p.name,
          units: p.quantity,
          orders: p.orders,
          revenue: p.revenue,
        }));
        if (!rows.length) {
          toast.push(t('reports.noData'), 'info');
          return;
        }
        downloadFile(`hemoportal-product-performance-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
        return;
      }
      if (kind === 'delivery') {
        const rows = (data?.deliveryByArea || []).map((d) => ({
          area: d.area,
          orders: d.orders,
          delivered: d.delivered,
          cancelled: d.cancelled,
          revenue: d.revenue,
        }));
        if (!rows.length) {
          toast.push(t('reports.noData'), 'info');
          return;
        }
        downloadFile(`hemoportal-delivery-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
        return;
      }
      const orders = await fetchOrdersPage({ page: 0, pageSize: 1000, from: range.from, to: range.to });
      if (!orders.rows.length) {
        toast.push(t('reports.noData'), 'info');
        return;
      }
      downloadFile(
        `hemoportal-orders-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(
          orders.rows.map((o) => ({
            order_number: o.order_number,
            created_at: o.created_at,
            customer: o.customer_name,
            product: o.product_name,
            blood_type: o.blood_type,
            quantity: o.quantity,
            total: o.total,
            payment_status: o.payment_status,
            order_status: o.order_status,
            area: o.area_name,
          }))
        )
      );
    } catch {
      toast.push(t('error.load'), 'error');
    }
  };

  const revenueSeries = useMemo(
    () =>
      (data?.series || []).map((p) => ({
        label: formatDate(p.date, locale).replace(/\s\d{4}$/, ''),
        value: p.revenue,
      })),
    [data, locale]
  );

  const orderSeries = useMemo(
    () =>
      (data?.series || []).map((p) => ({
        label: formatDate(p.date, locale).replace(/\s\d{4}$/, ''),
        value: p.orders,
      })),
    [data, locale]
  );

  const statusSlices = useMemo(
    () =>
      (data?.statusBreakdown || []).map((s) => ({
        label: s.status,
        value: s.count,
        color: STATUS_COLORS[s.status] || '#94a3b8',
      })),
    [data]
  );

  const deliveryColumns: Column<ReportData['deliveryByArea'][number]>[] = [
    { key: 'area', header: t('reports.colArea'), render: (row) => <span className="font-medium text-slate-800">{row.area}</span> },
    { key: 'orders', header: t('reports.colOrders'), align: 'center', render: (row) => row.orders },
    { key: 'delivered', header: t('reports.colDelivered'), align: 'center', render: (row) => row.delivered },
    { key: 'cancelled', header: t('reports.colCancelled'), align: 'center', render: (row) => row.cancelled },
    {
      key: 'revenue',
      header: t('reports.colRevenue'),
      align: 'end',
      render: (row) => <span className="tabular-nums">{currency(row.revenue, locale)}</span>,
    },
  ];

  const productColumns: Column<ReportData['topProducts'][number]>[] = [
    { key: 'name', header: t('reports.colProduct'), render: (row) => <span className="text-slate-800">{row.name}</span> },
    { key: 'units', header: t('reports.colUnits'), align: 'center', render: (row) => row.quantity },
    { key: 'orders', header: t('reports.colOrders'), align: 'center', render: (row) => row.orders },
    {
      key: 'revenue',
      header: t('reports.colRevenue'),
      align: 'end',
      render: (row) => <span className="tabular-nums">{currency(row.revenue, locale)}</span>,
    },
  ];

  const kpis = [
    { label: t('dash.revenue'), value: currency(data?.metrics.revenue || 0, locale) },
    { label: t('dash.totalOrders'), value: data?.metrics.totalOrders ?? 0 },
    { label: t('reports.cancellation'), value: `${(data?.cancellationRate || 0).toFixed(1)}%` },
    { label: t('reports.deliverySuccess'), value: `${(data?.deliverySuccessRate || 0).toFixed(1)}%` },
    { label: t('reports.avgProcessing'), value: `${(data?.avgProcessingHours || 0).toFixed(1)} ${t('reports.hours')}` },
  ];

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={<RangePicker preset={preset} onChange={setPreset} custom={custom} onCustomChange={setCustom} />}
      />

      {report.error ? (
        <div className="mb-4">
          <InlineNotice tone="danger">{report.error}</InlineNotice>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{kpi.label}</p>
            {report.loading ? (
              <Skeleton className="mt-1.5 h-5 w-20" />
            ) : (
              <p className="mt-1 truncate text-[16px] font-semibold text-slate-800">{kpi.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t('reports.revenue')}
            action={
              <Button size="sm" variant="ghost" onClick={() => exportReport('orders')} icon={<Download className="h-3.5 w-3.5" />}>
                {t('common.export')}
              </Button>
            }
          />
          <div className="px-3 pb-4">
            {report.loading ? (
              <Skeleton className="mx-2 h-[210px]" />
            ) : (
              <TrendChart
                data={revenueSeries}
                formatValue={(v) => currency(v, locale)}
                axisFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
                primaryLabel={t('dash.revenue')}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('reports.orders')} />
          <div className="px-3 pb-4">
            {report.loading ? (
              <Skeleton className="mx-2 h-[210px]" />
            ) : (
              <TrendChart data={orderSeries} color="#0f766e" primaryLabel={t('dash.totalOrders')} />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={t('reports.products')}
            action={
              <Button size="sm" variant="ghost" onClick={() => exportReport('products')} icon={<Download className="h-3.5 w-3.5" />}>
                {t('reports.exportProducts')}
              </Button>
            }
          />
          <div className="px-4 pb-4">
            <DataTable
              columns={productColumns}
              rows={data?.topProducts || []}
              keyExtractor={(row) => row.name}
              loading={report.loading}
              emptyTitle={t('reports.noData')}
              dense
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('reports.blood')} subtitle={t('dash.bloodDemandHint')} />
          <div className="px-4 pb-4">
            {report.loading ? (
              <Skeleton className="h-40" />
            ) : (
              <HBarList
                items={(data?.bloodTypeDemand || []).map((b) => ({ label: b.bloodType, value: b.quantity }))}
                valueLabel={(v) => `${v} ${lang === 'ar' ? 'وحدة' : 'u'}`}
                color="#0f766e"
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('reports.customers')} />
          <div className="space-y-3 px-4 pb-4">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="text-[12px] text-slate-600">{t('reports.newCustomers')}</span>
              <span className="text-[14px] font-semibold text-slate-900">{data?.metrics.newCustomers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="text-[12px] text-slate-600">{t('reports.returning')}</span>
              <span className="text-[14px] font-semibold text-slate-900">{data?.metrics.returningCustomers ?? 0}</span>
            </div>
            <div className="rounded-lg border border-slate-100 px-3 py-2.5">
              <p className="mb-2 text-[12px] font-semibold text-slate-700">{t('dash.orderStatus')}</p>
              {report.loading ? <Skeleton className="h-24" /> : <Legend items={statusSlices} />}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={t('reports.delivery')}
            action={
              <Button size="sm" variant="ghost" onClick={() => exportReport('delivery')} icon={<Download className="h-3.5 w-3.5" />}>
                {t('reports.exportDelivery')}
              </Button>
            }
          />
          <div className="px-4 pb-4">
            <DataTable
              columns={deliveryColumns}
              rows={data?.deliveryByArea || []}
              keyExtractor={(row) => row.area}
              loading={report.loading}
              emptyTitle={t('reports.noData')}
              dense
            />
          </div>
        </Card>
      </div>
    </div>
  );
};
