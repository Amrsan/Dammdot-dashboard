import React, { useMemo, useState } from 'react';
import { useAdminI18n } from '../lib/i18n';
import { fetchCustomersPage, type CustomerRow } from '../data/adminApi';
import { useAsync, useDebounced } from '../lib/useAsync';
import { currency, formatDate, initials } from '../lib/format';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, Button, Card, PageHeader, Pagination, SearchInput } from '../components/ui';
import { ADMIN_ROUTES } from '../components/AdminLayout';

export const CustomersPage: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const { t, locale } = useAdminI18n();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const debounced = useDebounced(search, 350);

  const query = useAsync(() => fetchCustomersPage({ search: debounced, page, pageSize }), [debounced, page]);

  const columns: Column<CustomerRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('customers.colName'),
        render: (row) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10.5px] font-bold text-slate-600">
              {initials(row.name) || 'HP'}
            </span>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(`${ADMIN_ROUTES.customers}/${encodeURIComponent(row.id)}`)}
                className="block max-w-[180px] truncate font-semibold text-slate-900 hover:text-[#c8102e]"
              >
                {row.name}
              </button>
              <p className="truncate text-[10.5px] text-slate-400">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'phone',
        header: t('common.phone'),
        render: (row) => <span className="whitespace-nowrap text-[12px] text-slate-600">{row.phone}</span>,
      },
      {
        key: 'orders',
        header: t('customers.colOrders'),
        align: 'center',
        render: (row) => <span className="tabular-nums text-slate-700">{row.orders}</span>,
      },
      {
        key: 'spend',
        header: t('customers.colSpend'),
        align: 'end',
        render: (row) => (
          <span className="whitespace-nowrap font-semibold tabular-nums text-slate-800">
            {currency(row.totalSpend, locale)}
          </span>
        ),
      },
      {
        key: 'last',
        header: t('customers.colLastOrder'),
        render: (row) => <span className="whitespace-nowrap text-[12px] text-slate-600">{formatDate(row.lastOrderAt, locale)}</span>,
      },
      {
        key: 'joined',
        header: t('customers.colJoined'),
        render: (row) => <span className="whitespace-nowrap text-[12px] text-slate-600">{formatDate(row.joinedAt, locale)}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (row) =>
          row.isGuest ? <Badge tone="neutral">{t('customers.guest')}</Badge> : <Badge tone="success">{t('common.active')}</Badge>,
      },
      {
        key: 'actions',
        header: '',
        align: 'end',
        render: (row) => (
          <Button
            size="sm"
            variant="ghost"
            className="text-[11px]"
            onClick={() => navigate(`${ADMIN_ROUTES.customers}/${encodeURIComponent(row.id)}`)}
          >
            {t('common.view')}
          </Button>
        ),
      },
    ],
    [locale, navigate, t]
  );

  return (
    <div>
      <PageHeader title={t('customers.title')} subtitle={t('customers.subtitle')} />

      <Card className="mb-4 p-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder={t('customers.searchPlaceholder')}
          className="sm:max-w-sm"
        />
      </Card>

      <DataTable
        columns={columns}
        rows={query.data?.rows || []}
        keyExtractor={(row) => row.id}
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
        emptyTitle={t('customers.empty')}
        emptyDescription={t('customers.emptyHint')}
        onRowClick={(row) => navigate(`${ADMIN_ROUTES.customers}/${encodeURIComponent(row.id)}`)}
        footer={<Pagination page={page} pageSize={pageSize} total={query.data?.total || 0} onPageChange={setPage} />}
      />
    </div>
  );
};
