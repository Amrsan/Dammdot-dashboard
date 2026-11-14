import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, CreditCard, Download, RotateCcw, XCircle } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchPaymentSummary, fetchPaymentsPage, updateOrderPaymentStatus } from '../data/adminApi';
import type { AdminOrder, DateRange, RangePreset } from '../lib/types';
import { useAsync, useDebounced } from '../lib/useAsync';
import { currency, downloadFile, formatDate, formatDateTime, resolveRange, toCsv } from '../lib/format';
import { DataTable, type Column } from '../components/DataTable';
import { StatCard } from '../components/StatCard';
import {
  Button,
  Card,
  ConfirmDialog,
  InlineNotice,
  PageHeader,
  Pagination,
  PaymentStatusBadge,
  RangePicker,
  SearchInput,
  Select,
  useToast,
} from '../components/ui';
import { ADMIN_ROUTES } from '../components/AdminLayout';
import type { AdminSession } from '../lib/types';

const STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded', 'Cash on Delivery'];

export const PaymentsPage: React.FC<{
  session: AdminSession;
  navigate: (path: string) => void;
}> = ({ session, navigate }) => {
  const { t, locale } = useAdminI18n();
  const toast = useToast();
  const canRefund = session.permissions.includes('payments.refund');

  const [preset, setPreset] = useState<RangePreset>('30d');
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [refundTarget, setRefundTarget] = useState<AdminOrder | null>(null);
  const [working, setWorking] = useState(false);

  const debounced = useDebounced(search, 350);

  const range: DateRange = useMemo(() => {
    const resolved = resolveRange(preset, custom);
    return { from: resolved.from.toISOString(), to: resolved.to.toISOString() };
  }, [preset, custom]);

  const summary = useAsync(() => fetchPaymentSummary(range), [range.from, range.to]);

  const rows = useAsync(
    () =>
      fetchPaymentsPage({
        page,
        pageSize,
        search: debounced,
        status,
        method,
        from: range.from,
        to: range.to,
      }),
    [page, debounced, status, method, range.from, range.to]
  );

  const exportCsv = async () => {
    try {
      const result = await fetchPaymentsPage({
        page: 0,
        pageSize: 1000,
        search: debounced,
        status,
        method,
        from: range.from,
        to: range.to,
      });
      if (!result.rows.length) {
        toast.push(t('payments.empty'), 'info');
        return;
      }
      downloadFile(
        `hemoportal-payments-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(
          result.rows.map((o) => ({
            order_number: o.order_number,
            paymob_transaction_id: o.paymob_transaction_id || '',
            paymob_order_id: o.paymob_order_id || '',
            customer: o.customer_name,
            amount: o.total,
            method: o.payment_method,
            status: o.payment_status,
            date: o.created_at,
            order_status: o.order_status,
          }))
        )
      );
    } catch {
      toast.push(t('error.load'), 'error');
    }
  };

  const applyRefund = async () => {
    if (!refundTarget) return;
    setWorking(true);
    try {
      await updateOrderPaymentStatus(refundTarget.id, 'Refunded');
      toast.push(t('payments.refundedDone'));
      setRefundTarget(null);
      rows.reload();
      summary.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setWorking(false);
    }
  };

  const columns: Column<AdminOrder>[] = useMemo(
    () => [
      {
        key: 'transaction',
        header: t('payments.colTransaction'),
        render: (o) => (
          <div className="min-w-0">
            <p className="font-mono text-[11.5px] font-medium text-slate-800">
              {o.paymob_transaction_id || o.order_number}
            </p>
            <p className="text-[10.5px] text-slate-400">
              {o.paymob_order_id ? `${t('orders.paymobRef')}: ${o.paymob_order_id}` : o.payment_method}
            </p>
          </div>
        ),
      },
      {
        key: 'order',
        header: t('payments.colOrder'),
        render: (o) => (
          <button
            type="button"
            onClick={() => navigate(`${ADMIN_ROUTES.orders}/${o.id}`)}
            className="font-semibold text-slate-900 hover:text-[#c8102e]"
          >
            {o.order_number}
          </button>
        ),
      },
      {
        key: 'customer',
        header: t('common.customer'),
        render: (o) => (
          <div className="min-w-0 max-w-[170px]">
            <p className="truncate text-slate-700">{o.customer_name}</p>
            <p className="truncate text-[10.5px] text-slate-400">{o.customer_phone}</p>
          </div>
        ),
      },
      {
        key: 'amount',
        header: t('payments.colAmount'),
        align: 'end',
        render: (o) => (
          <span className="whitespace-nowrap font-semibold tabular-nums text-slate-800">{currency(o.total, locale)}</span>
        ),
      },
      {
        key: 'method',
        header: t('payments.colMethod'),
        render: (o) => (
          <span className="whitespace-nowrap text-[12px] text-slate-600">
            {o.payment_method === 'Cash on Delivery' ? t('payments.cash') : o.payment_method}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('payments.colStatus'),
        render: (o) => <PaymentStatusBadge status={o.payment_status} />,
      },
      {
        key: 'date',
        header: t('payments.colDate'),
        render: (o) => (
          <span className="whitespace-nowrap text-[11.5px] text-slate-500">
            {formatDateTime(o.updated_at || o.created_at, locale)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'end',
        render: (o) =>
          canRefund && o.payment_status === 'Paid' ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px] text-red-600"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => setRefundTarget(o)}
            >
              {t('payments.markRefunded')}
            </Button>
          ) : null,
      },
    ],
    [canRefund, locale, navigate, t]
  );

  return (
    <div>
      <PageHeader
        title={t('payments.title')}
        subtitle={t('payments.subtitle')}
        actions={
          <>
            <RangePicker preset={preset} onChange={setPreset} custom={custom} onCustomChange={setCustom} />
            <Button size="sm" variant="secondary" onClick={exportCsv} icon={<Download className="h-3.5 w-3.5" />}>
              {t('common.export')}
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('payments.totalRevenue')}
          value={currency(summary.data?.revenue || 0, locale)}
          icon={<CreditCard className="h-3.5 w-3.5" />}
          tone="brand"
          hint={t('payments.verifyNote')}
          loading={summary.loading}
        />
        <StatCard
          label={t('payments.paid')}
          value={summary.data?.paid ?? 0}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="emerald"
          loading={summary.loading}
        />
        <StatCard
          label={t('payments.pending')}
          value={summary.data?.pending ?? 0}
          icon={<Clock3 className="h-3.5 w-3.5" />}
          tone="amber"
          loading={summary.loading}
        />
        <StatCard
          label={t('payments.failed')}
          value={summary.data?.failed ?? 0}
          icon={<XCircle className="h-3.5 w-3.5" />}
          tone="sky"
          loading={summary.loading}
        />
      </div>

      <div className="mb-3">
        <InlineNotice tone="info">{t('payments.verifyNote')}</InlineNotice>
      </div>

      <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder={t('orders.searchPlaceholder')}
          className="sm:max-w-xs sm:flex-1"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="sm:w-44"
          aria-label={t('payments.colStatus')}
        >
          <option value="all">
            {t('payments.colStatus')} · {t('common.all')}
          </option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(0);
          }}
          className="sm:w-48"
          aria-label={t('payments.colMethod')}
        >
          <option value="all">
            {t('payments.colMethod')} · {t('common.all')}
          </option>
          <option value="Online Payment">Online Payment</option>
          <option value="Cash on Delivery">Cash on Delivery</option>
        </Select>
        <span className="text-[11px] text-slate-400 sm:ms-auto">
          {rows.data?.total ?? 0} {t('common.rows')}
        </span>
      </Card>

      <DataTable
        columns={columns}
        rows={rows.data?.rows || []}
        keyExtractor={(o) => o.id}
        loading={rows.loading}
        error={rows.error}
        onRetry={rows.reload}
        emptyTitle={t('payments.empty')}
        emptyDescription={t('payments.verifyNote')}
        footer={<Pagination page={page} pageSize={pageSize} total={rows.data?.total || 0} onPageChange={setPage} />}
      />

      <ConfirmDialog
        open={Boolean(refundTarget)}
        title={t('payments.confirmRefund')}
        description={t('payments.confirmRefundBody')}
        confirmLabel={t('payments.markRefunded')}
        danger
        loading={working}
        onConfirm={applyRefund}
        onClose={() => setRefundTarget(null)}
      >
        {refundTarget ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
            <p className="font-semibold">{refundTarget.order_number}</p>
            <p className="text-slate-500">
              {refundTarget.customer_name} · {currency(refundTarget.total, locale)} · {formatDate(refundTarget.created_at, locale)}
            </p>
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
};
