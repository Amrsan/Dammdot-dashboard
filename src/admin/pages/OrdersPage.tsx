import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, SlidersHorizontal, X } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchDelivery, fetchOrdersPage, fetchProductTypes, fetchBloodTypes } from '../data/adminApi';
import type { AdminOrder, Paginated } from '../lib/types';
import { useAsync, useDebounced } from '../lib/useAsync';
import { currency, downloadFile, formatDate, toCsv } from '../lib/format';
import { DataTable, type Column } from '../components/DataTable';
import {
  Button,
  Card,
  OrderStatusBadge,
  PageHeader,
  Pagination,
  PaymentStatusBadge,
  SearchInput,
  Select,
  useToast,
} from '../components/ui';

export interface OrdersQueryState {
  search: string;
  status: string;
  paymentStatus: string;
  productTypeId: string;
  bloodType: string;
  area: string;
  from: string;
  to: string;
}

const ORDER_STATUSES = [
  'Order Received',
  'Pending Verification',
  'Verification',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'On Hold',
  'Cancelled',
  'Rejected',
];

const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded', 'Cash on Delivery'];

export const OrdersPage: React.FC<{
  onOpenOrder: (order: AdminOrder) => void;
  initialSearch?: string;
  initialStatus?: string;
  canExport: boolean;
}> = ({ onOpenOrder, initialSearch = '', initialStatus = '', canExport }) => {
  const { t, locale } = useAdminI18n();
  const toast = useToast();

  const [filters, setFilters] = useState<OrdersQueryState>({
    search: initialSearch,
    status: initialStatus || 'all',
    paymentStatus: 'all',
    productTypeId: 'all',
    bloodType: 'all',
    area: 'all',
    from: '',
    to: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'created_at', dir: 'desc' });

  const debouncedSearch = useDebounced(filters.search, 350);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filters.status, filters.paymentStatus, filters.productTypeId, filters.bloodType, filters.area, filters.from, filters.to]);

  const meta = useAsync(
    async () => {
      const [types, blood, delivery] = await Promise.all([fetchProductTypes(), fetchBloodTypes(), fetchDelivery()]);
      return {
        types: types.filter((x) => x.active),
        blood: blood.filter((x) => x.active),
        areas: delivery.rows.filter((a) => a.active),
      };
    },
    []
  );

  const ordersQuery = useAsync<Paginated<AdminOrder>>(
    () =>
      fetchOrdersPage({
        page,
        pageSize,
        search: debouncedSearch,
        status: filters.status,
        paymentStatus: filters.paymentStatus,
        productTypeId: filters.productTypeId,
        bloodType: filters.bloodType,
        area: filters.area,
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : undefined,
        sortBy: sort.key === 'total' ? 'total' : 'created_at',
        sortDir: sort.dir,
      }),
    [
      page,
      pageSize,
      debouncedSearch,
      filters.status,
      filters.paymentStatus,
      filters.productTypeId,
      filters.bloodType,
      filters.area,
      filters.from,
      filters.to,
      sort.key,
      sort.dir,
    ]
  );

  const activeFilterCount = [
    filters.status !== 'all',
    filters.paymentStatus !== 'all',
    filters.productTypeId !== 'all',
    filters.bloodType !== 'all',
    filters.area !== 'all',
    Boolean(filters.from || filters.to),
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      paymentStatus: 'all',
      productTypeId: 'all',
      bloodType: 'all',
      area: 'all',
      from: '',
      to: '',
    });
    setPage(0);
  };

  const exportCsv = useCallback(async () => {
    try {
      const result = await fetchOrdersPage({
        page: 0,
        pageSize: 1000,
        search: debouncedSearch,
        status: filters.status,
        paymentStatus: filters.paymentStatus,
        productTypeId: filters.productTypeId,
        bloodType: filters.bloodType,
        area: filters.area,
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : undefined,
      });
      if (!result.rows.length) {
        toast.push(t('orders.empty'), 'info');
        return;
      }
      const csv = toCsv(
        result.rows.map((o) => ({
          order_number: o.order_number,
          created_at: o.created_at,
          customer: o.customer_name,
          phone: o.customer_phone,
          email: o.customer_email,
          product: o.product_name,
          blood_type: o.blood_type,
          quantity: o.quantity,
          total: o.total,
          payment_method: o.payment_method,
          payment_status: o.payment_status,
          order_status: o.order_status,
          area: o.area_name,
          city: o.city_name,
        }))
      );
      downloadFile(`hemoportal-orders-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch {
      toast.push(t('error.load'), 'error');
    }
  }, [filters, debouncedSearch, t, toast]);

  const columns: Column<AdminOrder>[] = useMemo(
    () => [
      {
        key: 'order',
        header: t('orders.colOrder'),
        sortKey: 'created_at',
        render: (o) => (
          <div className="min-w-[120px]">
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
        header: t('orders.colCustomer'),
        render: (o) => (
          <div className="min-w-0 max-w-[160px]">
            <p className="truncate font-medium text-slate-800">{o.customer_name}</p>
            <p className="truncate text-[10.5px] text-slate-400">{o.customer_email}</p>
          </div>
        ),
      },
      {
        key: 'phone',
        header: t('orders.colPhone'),
        className: 'hidden 2xl:table-cell',
        headerClassName: 'hidden 2xl:table-cell',
        render: (o) => <span className="whitespace-nowrap text-[12px] text-slate-600">{o.customer_phone}</span>,
      },
      {
        key: 'product',
        header: t('orders.colProduct'),
        render: (o) => (
          <div className="min-w-0 max-w-[200px]">
            <p className="truncate text-slate-700" title={o.product_name}>
              {o.product_name}
            </p>
            <p className="text-[10.5px] text-slate-400">{o.product_type_name}</p>
          </div>
        ),
      },
      {
        key: 'blood',
        header: t('orders.colBlood'),
        align: 'center',
        render: (o) => (
          <span className="inline-flex min-w-7 items-center justify-center rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[11px] font-bold text-slate-700">
            {o.blood_type}
          </span>
        ),
      },
      {
        key: 'qty',
        header: t('orders.colQty'),
        align: 'center',
        render: (o) => <span className="tabular-nums text-slate-600">{o.quantity}</span>,
      },
      {
        key: 'amount',
        header: t('orders.colAmount'),
        sortKey: 'total',
        align: 'end',
        render: (o) => (
          <span className="whitespace-nowrap font-semibold tabular-nums text-slate-800">{currency(o.total, locale)}</span>
        ),
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
        key: 'area',
        header: t('orders.colArea'),
        className: 'hidden xl:table-cell',
        headerClassName: 'hidden xl:table-cell',
        render: (o) => (
          <div className="min-w-0 max-w-[140px]">
            <p className="truncate text-[12px] text-slate-600" title={o.area_name}>
              {o.area_name}
            </p>
            <p className="truncate text-[10.5px] text-slate-400">{o.city_name}</p>
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'end',
        render: (o) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenOrder(o)}
            className="text-[11px] text-slate-600 hover:text-[#c8102e]"
          >
            {t('common.view')}
          </Button>
        ),
      },
    ],
    [locale, onOpenOrder, t]
  );

  return (
    <div>
      <PageHeader
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        actions={
          <>
            {canExport ? (
              <Button size="sm" variant="secondary" onClick={exportCsv} icon={<Download className="h-3.5 w-3.5" />}>
                {t('common.export')}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={showFilters ? 'primary' : 'secondary'}
              onClick={() => setShowFilters((v) => !v)}
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            >
              {t('common.filters')}
              {activeFilterCount ? (
                <span className="ms-0.5 rounded-full bg-[#c8102e]/10 px-1.5 text-[10px] font-bold text-[#c8102e]">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            value={filters.search}
            onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            placeholder={t('orders.searchPlaceholder')}
            className="sm:max-w-sm sm:flex-1"
          />
          <div className="flex items-center gap-2">
            <Select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              aria-label={t('orders.filterStatus')}
              className="sm:w-auto"
            >
              <option value="all">
                {t('orders.filterStatus')} · {t('common.all')}
              </option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              value={filters.paymentStatus}
              onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
              aria-label={t('orders.filterPayment')}
              className="sm:w-auto"
            >
              <option value="all">
                {t('orders.filterPayment')} · {t('common.all')}
              </option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            {activeFilterCount ? (
              <Button size="sm" variant="ghost" onClick={resetFilters} icon={<X className="h-3.5 w-3.5" />}>
                {t('common.reset')}
              </Button>
            ) : null}
          </div>
        </div>

        {showFilters ? (
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t('orders.filterProduct')}
              </span>
              <Select
                value={filters.productTypeId}
                onChange={(e) => setFilters((f) => ({ ...f, productTypeId: e.target.value }))}
              >
                <option value="all">{t('common.all')}</option>
                {(meta.data?.types || []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t('orders.filterBlood')}
              </span>
              <Select
                value={filters.bloodType}
                onChange={(e) => setFilters((f) => ({ ...f, bloodType: e.target.value }))}
              >
                <option value="all">{t('common.all')}</option>
                {(meta.data?.blood || []).map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t('orders.filterArea')}
              </span>
              <Select value={filters.area} onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}>
                <option value="all">{t('common.all')}</option>
                {(meta.data?.areas || []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.governorate_name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t('common.from')}
              </span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[12.5px] text-slate-700 focus:border-[#c8102e]/40 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t('common.to')}
              </span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[12.5px] text-slate-700 focus:border-[#c8102e]/40 focus:outline-none"
              />
            </label>
          </div>
        ) : null}
      </Card>

      <DataTable
        columns={columns}
        rows={ordersQuery.data?.rows || []}
        keyExtractor={(o) => o.id}
        loading={ordersQuery.loading}
        error={ordersQuery.error}
        onRetry={ordersQuery.reload}
        emptyTitle={t('orders.empty')}
        emptyDescription={t('orders.emptyHint')}
        emptyAction={
          activeFilterCount || filters.search ? (
            <Button size="sm" variant="secondary" onClick={resetFilters}>
              {t('common.reset')}
            </Button>
          ) : undefined
        }
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(0);
        }}
        onRowClick={onOpenOrder}
        footer={
          <Pagination
            page={page}
            pageSize={pageSize}
            total={ordersQuery.data?.total || 0}
            onPageChange={setPage}
          />
        }
      />
    </div>
  );
};
