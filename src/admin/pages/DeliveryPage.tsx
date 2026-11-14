import React, { useMemo, useState } from 'react';
import { MapPin, Pencil, Power } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchDelivery, saveArea, saveCityActive, saveGovernorateActive, type DeliveryRow } from '../data/adminApi';
import { useAsync } from '../lib/useAsync';
import { currency } from '../lib/format';
import { DataTable, type Column } from '../components/DataTable';
import {
  ActiveBadge,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  InlineNotice,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Toggle,
  useToast,
} from '../components/ui';
import type { AdminSession } from '../lib/types';

export const DeliveryPage: React.FC<{ session: AdminSession }> = ({ session }) => {
  const { t, locale } = useAdminI18n();
  const toast = useToast();
  const canWrite = session.permissions.includes('delivery.write');

  const delivery = useAsync(() => fetchDelivery(), []);
  const [search, setSearch] = useState('');
  const [govFilter, setGovFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [feeTarget, setFeeTarget] = useState<DeliveryRow | null>(null);
  const [feeValue, setFeeValue] = useState('0');
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<{ row: DeliveryRow; kind: 'area' | 'governorate' } | null>(null);

  const cities = useMemo(() => {
    const set = new Map<string, string>();
    (delivery.data?.rows || []).forEach((row) => set.set(row.city_id, row.city_name));
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [delivery.data]);

  const rows = useMemo(() => {
    let data = delivery.data?.rows || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.city_name.toLowerCase().includes(q) ||
          row.governorate_name.toLowerCase().includes(q)
      );
    }
    if (govFilter !== 'all') data = data.filter((row) => row.governorate_id === govFilter);
    if (cityFilter !== 'all') data = data.filter((row) => row.city_id === cityFilter);
    return data;
  }, [delivery.data, search, govFilter, cityFilter]);

  const coverage = useMemo(() => {
    const all = delivery.data?.rows || [];
    return {
      total: all.length,
      active: all.filter((row) => row.active && row.city_active && row.governorate_active).length,
      disabled: all.filter((row) => !row.active || !row.city_active || !row.governorate_active).length,
      avgFee: all.length ? all.reduce((sum, row) => sum + Number(row.delivery_fee || 0), 0) / all.length : 0,
    };
  }, [delivery.data]);

  const saveFee = async () => {
    if (!feeTarget) return;
    const value = Number(feeValue);
    if (Number.isNaN(value) || value < 0) {
      toast.push(t('products.priceInvalid'), 'error');
      return;
    }
    setSaving(true);
    try {
      await saveArea(feeTarget.id, { delivery_fee: value });
      toast.push(t('delivery.saved'));
      setFeeTarget(null);
      delivery.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const applyToggle = async () => {
    if (!confirmToggle) return;
    setSaving(true);
    try {
      if (confirmToggle.kind === 'area') {
        await saveArea(confirmToggle.row.id, { active: !confirmToggle.row.active });
      } else {
        await saveGovernorateActive(confirmToggle.row.governorate_id, !confirmToggle.row.governorate_active);
      }
      toast.push(t('delivery.saved'));
      setConfirmToggle(null);
      delivery.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleCity = async (row: DeliveryRow) => {
    try {
      await saveCityActive(row.city_id, !row.city_active);
      toast.push(t('delivery.saved'));
      delivery.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    }
  };

  const columns: Column<DeliveryRow>[] = useMemo(
    () => [
      {
        key: 'area',
        header: t('delivery.colArea'),
        render: (row) => (
          <div className="min-w-0">
            <p className="max-w-[260px] truncate font-medium text-slate-900">{row.name}</p>
            <p className="text-[10.5px] text-slate-400">#{row.id}</p>
          </div>
        ),
      },
      {
        key: 'city',
        header: t('delivery.colCity'),
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-slate-600">{row.city_name}</span>
            <Toggle
              checked={row.city_active}
              onChange={() => (canWrite ? toggleCity(row) : undefined)}
              disabled={!canWrite}
              label={`${row.city_name} ${t('common.status')}`}
            />
          </div>
        ),
      },
      {
        key: 'governorate',
        header: t('delivery.colGovernorate'),
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-slate-600">{row.governorate_name}</span>
            <Toggle
              checked={row.governorate_active}
              onChange={() =>
                canWrite ? setConfirmToggle({ row, kind: 'governorate' }) : undefined
              }
              disabled={!canWrite}
              label={`${row.governorate_name} ${t('common.status')}`}
            />
          </div>
        ),
      },
      {
        key: 'fee',
        header: t('delivery.colFee'),
        align: 'end',
        render: (row) => (
          <span className="whitespace-nowrap font-semibold tabular-nums text-slate-800">
            {currency(Number(row.delivery_fee), locale)}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('delivery.colStatus'),
        render: (row) => (
          <div className="flex items-center gap-2">
            <ActiveBadge active={row.active && row.city_active && row.governorate_active} />
            {!row.governorate_active ? <Badge tone="warning">gov</Badge> : null}
            {!row.city_active ? <Badge tone="warning">city</Badge> : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'end',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={!canWrite}
              icon={<Pencil className="h-3.5 w-3.5" />}
              aria-label={t('delivery.editFee')}
              onClick={() => {
                setFeeTarget(row);
                setFeeValue(String(row.delivery_fee));
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={!canWrite}
              icon={<Power className="h-3.5 w-3.5" />}
              aria-label={row.active ? t('common.disable') : t('common.enable')}
              onClick={() => setConfirmToggle({ row, kind: 'area' })}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite, locale, t]
  );

  return (
    <div>
      <PageHeader title={t('delivery.title')} subtitle={t('delivery.subtitle')} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t('delivery.summary'), value: coverage.total },
          { label: t('common.active'), value: coverage.active },
          { label: t('common.inactive'), value: coverage.disabled },
          { label: t('delivery.colFee'), value: currency(coverage.avgFee, locale) },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{metric.label}</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-800">{metric.value}</p>
          </div>
        ))}
      </div>

      <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder={t('delivery.searchPlaceholder')} className="sm:max-w-xs" />
        <Select
          value={govFilter}
          onChange={(e) => {
            setGovFilter(e.target.value);
            setCityFilter('all');
          }}
          className="sm:w-48"
          aria-label={t('delivery.filterGov')}
        >
          <option value="all">
            {t('delivery.filterGov')} · {t('common.all')}
          </option>
          {(delivery.data?.governorates || []).map((gov) => (
            <option key={gov.id} value={gov.id}>
              {gov.name}
              {gov.active ? '' : ' (off)'}
            </option>
          ))}
        </Select>
        <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="sm:w-44" aria-label={t('delivery.filterCity')}>
          <option value="all">
            {t('delivery.filterCity')} · {t('common.all')}
          </option>
          {cities
            .filter((city) => {
              if (govFilter === 'all') return true;
              return (delivery.data?.rows || []).some((row) => row.city_id === city.id && row.governorate_id === govFilter);
            })
            .map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
        </Select>
        <span className="text-[11px] text-slate-400 sm:ms-auto">
          {rows.length} {t('common.rows')}
        </span>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        keyExtractor={(row) => row.id}
        loading={delivery.loading}
        error={delivery.error}
        onRetry={delivery.reload}
        emptyTitle={t('delivery.empty')}
        emptyDescription={t('delivery.treeHint')}
      />

      <div className="mt-3">
        <InlineNotice tone="info">{t('delivery.treeHint')}</InlineNotice>
      </div>

      <Modal
        open={Boolean(feeTarget)}
        onClose={() => setFeeTarget(null)}
        title={t('delivery.feeTitle')}
        description={feeTarget?.name}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setFeeTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" onClick={saveFee} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <Field label={t('delivery.colFee')} hint={t('delivery.feeHint')}>
          <Input type="number" min={0} step="0.01" value={feeValue} onChange={(e) => setFeeValue(e.target.value)} />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmToggle)}
        title={
          confirmToggle?.kind === 'governorate'
            ? `${confirmToggle?.row.governorate_name} · ${t('common.status')}`
            : confirmToggle?.row.active
              ? t('common.disable')
              : t('common.enable')
        }
        description={confirmToggle?.kind === 'area' ? confirmToggle?.row.name : t('delivery.treeHint')}
        confirmLabel={t('common.confirm')}
        danger={Boolean(
          (confirmToggle?.kind === 'area' && confirmToggle?.row.active) ||
            (confirmToggle?.kind === 'governorate' && confirmToggle?.row.governorate_active)
        )}
        loading={saving}
        onConfirm={applyToggle}
        onClose={() => setConfirmToggle(null)}
      >
        <div className="flex items-center gap-2 text-[12px] text-slate-600">
          <MapPin className="h-4 w-4 text-slate-400" />
          {confirmToggle?.row.city_name} · {confirmToggle?.row.governorate_name}
        </div>
      </ConfirmDialog>
    </div>
  );
};
