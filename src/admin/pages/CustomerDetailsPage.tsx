import React, { useMemo } from 'react';
import { ArrowLeft, Mail, MapPin, Phone, User } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchCustomerAddresses, fetchCustomerDetail } from '../data/adminApi';
import { useAsync } from '../lib/useAsync';
import { currency, formatDate, formatDateTime, initials } from '../lib/format';
import { Badge, Card, CardHeader, ErrorState, OrderStatusBadge, PageHeader, PaymentStatusBadge, Skeleton } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { ADMIN_ROUTES } from '../components/AdminLayout';
import type { AdminOrder } from '../lib/types';
import type { DeliveryAddress } from '../../types';

export const CustomerDetailsPage: React.FC<{
  customerId: string;
  navigate: (path: string) => void;
}> = ({ customerId, navigate }) => {
  const { t, locale } = useAdminI18n();

  const query = useAsync(() => fetchCustomerDetail(decodeURIComponent(customerId)), [customerId]);
  const addresses = useAsync<DeliveryAddress[]>(
    () =>
      query.data && !query.data.customer.isGuest
        ? (fetchCustomerAddresses(query.data.customer.id) as Promise<DeliveryAddress[]>)
        : Promise.resolve([]),
    [query.data?.customer.id]
  );

  const columns: Column<AdminOrder>[] = useMemo(
    () => [
      {
        key: 'order',
        header: t('orders.colOrder'),
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
        key: 'product',
        header: t('orders.colProduct'),
        render: (o) => (
          <div className="min-w-0 max-w-[200px]">
            <p className="truncate text-slate-700">{o.product_name}</p>
            <p className="text-[10.5px] text-slate-400">
              {o.blood_type} · {o.quantity}
            </p>
          </div>
        ),
      },
      {
        key: 'amount',
        header: t('common.amount'),
        align: 'end',
        render: (o) => <span className="font-semibold tabular-nums">{currency(o.total, locale)}</span>,
      },
      { key: 'payment', header: t('orders.colPayment'), render: (o) => <PaymentStatusBadge status={o.payment_status} /> },
      { key: 'status', header: t('orders.colStatus'), render: (o) => <OrderStatusBadge status={o.order_status} /> },
      {
        key: 'date',
        header: t('common.date'),
        render: (o) => <span className="whitespace-nowrap text-[12px] text-slate-600">{formatDate(o.created_at, locale)}</span>,
      },
    ],
    [locale, navigate, t]
  );

  if (query.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(ADMIN_ROUTES.customers)}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" /> {t('customers.title')}
        </button>
        <Card>
          <ErrorState message={t('customers.emptyHint')} onRetry={query.reload} />
        </Card>
      </div>
    );
  }

  const { customer, orders } = query.data;
  const paymentRows = orders.filter((o) => o.payment_method === 'Online Payment' || o.payment_status !== 'Pending');

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(ADMIN_ROUTES.customers)}
        className="mb-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" /> {t('customers.title')}
      </button>

      <PageHeader
        title={customer.name}
        breadcrumb={t('customers.profile')}
        subtitle={customer.email}
        actions={customer.isGuest ? <Badge tone="neutral">{t('customers.guest')}</Badge> : <Badge tone="success">{t('common.active')}</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader title={t('customers.contact')} />
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white">
                  {initials(customer.name) || 'HP'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{customer.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {customer.isGuest ? t('customers.guest') : `${t('customers.colJoined')} ${formatDate(customer.joinedAt, locale)}`}
                  </p>
                </div>
              </div>
              <dl className="mt-4 space-y-2.5 text-[12px]">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> <span dir="ltr">{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="h-3.5 w-3.5 text-slate-400" />{' '}
                  {customer.isGuest ? t('customers.guest') : t('common.customer')}
                </div>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('customers.addresses')} action={<MapPin className="h-3.5 w-3.5 text-slate-400" />} />
            <div className="px-5 pb-5">
              {addresses.loading ? (
                <Skeleton className="h-12 w-full" />
              ) : (addresses.data || []).length ? (
                <ul className="space-y-2.5">
                  {(addresses.data || []).map((address) => (
                    <li key={address.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11.5px] font-semibold text-slate-700">
                          {address.area_name || address.area_id}
                        </p>
                        {address.is_default ? <Badge tone="brand">{t('customers.defaultAddress')}</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                        {[address.address, address.building, address.floor, address.landmark].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-slate-400" dir="ltr">
                        {address.phone}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11.5px] text-slate-400">{t('customers.noAddresses')}</p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t('customers.totalOrders'), value: customer.orders },
              { label: t('customers.totalSpend'), value: currency(customer.totalSpend, locale) },
              { label: t('customers.lastOrder'), value: formatDate(customer.lastOrderAt, locale) },
              { label: t('customers.colJoined'), value: formatDate(customer.joinedAt, locale) },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{metric.label}</p>
                <p className="mt-1 truncate text-[14px] font-semibold text-slate-800">{metric.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="mb-2 text-[13px] font-semibold text-slate-900">{t('customers.orderHistory')}</h2>
            <DataTable
              columns={columns}
              rows={orders}
              keyExtractor={(o) => o.id}
              emptyTitle={t('customers.noOrders')}
              onRowClick={(o) => navigate(`${ADMIN_ROUTES.orders}/${o.id}`)}
              dense
            />
          </div>

          <Card>
            <CardHeader title={t('customers.paymentHistory')} subtitle={t('payments.verifyNote')} />
            <div className="px-5 pb-5">
              {paymentRows.length ? (
                <ul className="divide-y divide-slate-100">
                  {paymentRows.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-slate-800">
                          {o.order_number} · {o.payment_method}
                        </p>
                        <p className="text-[10.5px] text-slate-400">
                          {formatDateTime(o.updated_at || o.created_at, locale)}
                          {o.paymob_transaction_id ? ` · ${o.paymob_transaction_id}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[12px] font-semibold tabular-nums text-slate-800">
                          {currency(o.total, locale)}
                        </span>
                        <PaymentStatusBadge status={o.payment_status} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11.5px] text-slate-400">{t('customers.noOrders')}</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
