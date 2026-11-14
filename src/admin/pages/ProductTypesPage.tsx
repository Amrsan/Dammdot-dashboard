import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchProducts, fetchProductTypes, saveProductType, toggleProductType } from '../data/adminApi';
import type { ProductTypeItem } from '../../types';
import { useAsync } from '../lib/useAsync';
import { formatDate } from '../lib/format';
import { DataTable, type Column } from '../components/DataTable';
import {
  ActiveBadge,
  Button,
  ConfirmDialog,
  Field,
  InlineNotice,
  Input,
  Modal,
  PageHeader,
  Textarea,
  useToast,
} from '../components/ui';
import type { AdminSession } from '../lib/types';

export const ProductTypesPage: React.FC<{ session: AdminSession }> = ({ session }) => {
  const { t, locale } = useAdminI18n();
  const toast = useToast();
  const canWrite = session.permissions.includes('catalog.write');

  const types = useAsync(() => fetchProductTypes(), []);
  const products = useAsync(() => fetchProducts(), []);

  const [editing, setEditing] = useState<{ item: ProductTypeItem | null; name: string; description: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ProductTypeItem | null>(null);
  const [toggling, setToggling] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    (products.data || []).forEach((p) => map.set(p.product_type_id, (map.get(p.product_type_id) || 0) + 1));
    return map;
  }, [products.data]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name.trim()) {
      setFormError(t('common.required'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await saveProductType(editing.item?.id ?? null, {
        name: editing.name.trim(),
        description: editing.description.trim(),
      });
      toast.push(t('types.saved'));
      setEditing(null);
      types.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('error.load'));
    } finally {
      setSaving(false);
    }
  };

  const applyToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await toggleProductType(toggleTarget);
      toast.push(t('types.toggled'));
      setToggleTarget(null);
      types.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setToggling(false);
    }
  };

  const columns: Column<ProductTypeItem>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('types.colName'),
        render: (row) => (
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="text-[10.5px] text-slate-400">#{row.id}</p>
          </div>
        ),
      },
      {
        key: 'description',
        header: t('types.colDescription'),
        render: (row) => <p className="max-w-[420px] text-[12px] leading-relaxed text-slate-600">{row.description || '—'}</p>,
      },
      {
        key: 'count',
        header: t('types.colCount'),
        align: 'center',
        render: (row) => <span className="tabular-nums text-slate-700">{counts.get(row.id) || 0}</span>,
      },
      {
        key: 'status',
        header: t('types.colStatus'),
        render: (row) => <ActiveBadge active={row.active} />,
      },
      {
        key: 'updated',
        header: t('products.colUpdated'),
        render: (row) => (
          <span className="whitespace-nowrap text-[11.5px] text-slate-500">{formatDate(row.updated_at || row.created_at, locale)}</span>
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
              aria-label={t('common.edit')}
              onClick={() => {
                setFormError(null);
                setEditing({ item: row, name: row.name, description: row.description || '' });
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={!canWrite}
              icon={<Power className="h-3.5 w-3.5" />}
              aria-label={row.active ? t('common.disable') : t('common.enable')}
              onClick={() => setToggleTarget(row)}
            />
          </div>
        ),
      },
    ],
    [canWrite, counts, locale, t]
  );

  return (
    <div>
      <PageHeader
        title={t('types.title')}
        subtitle={t('types.subtitle')}
        actions={
          canWrite ? (
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setFormError(null);
                setEditing({ item: null, name: '', description: '' });
              }}
            >
              {t('types.add')}
            </Button>
          ) : null
        }
      />

      <div className="mb-3">
        <InlineNotice tone="info">{t('types.deleteWarn')}</InlineNotice>
      </div>

      <DataTable
        columns={columns}
        rows={types.data || []}
        keyExtractor={(row) => row.id}
        loading={types.loading}
        error={types.error}
        onRetry={types.reload}
        emptyTitle={t('types.empty')}
        emptyDescription={t('types.subtitle')}
      />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.item ? t('types.editTitle') : t('types.newTitle')}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" type="submit" form="type-form" loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {editing ? (
          <form id="type-form" onSubmit={submit} className="space-y-3">
            {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}
            <Field label={t('types.colName')} required>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </Field>
            <Field label={t('types.colDescription')}>
              <Textarea
                rows={3}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.active ? t('common.disable') : t('common.enable')}
        description={toggleTarget?.name}
        confirmLabel={toggleTarget?.active ? t('common.disable') : t('common.enable')}
        danger={Boolean(toggleTarget?.active)}
        loading={toggling}
        onConfirm={applyToggle}
        onClose={() => setToggleTarget(null)}
      />
    </div>
  );
};
