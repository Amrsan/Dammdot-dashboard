import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Power, Search } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchProducts, fetchProductTypes, saveProduct, setProductActive, type ProductInput } from '../data/adminApi';
import type { Product, ProductTypeItem } from '../../types';
import { useAsync } from '../lib/useAsync';
import { currency, formatDate } from '../lib/format';
import { DataTable, type Column } from '../components/DataTable';
import {
  AvailabilityBadge,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  InlineNotice,
  Modal,
  PageHeader,
  Select,
  Textarea,
  useToast,
  Input,
  cn,
} from '../components/ui';
import type { AdminSession } from '../lib/types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A', 'B', 'AB', 'O'];
const AVAILABILITY = ['In Stock', 'Limited Stock', 'Out of Stock'];

const emptyProduct = (): ProductInput => ({
  name: '',
  description: '',
  blood_type: 'O+',
  product_type_id: '',
  price: 0,
  stock_quantity: 0,
  availability: 'In Stock',
  image_url: '',
});

export const ProductsPage: React.FC<{ session: AdminSession }> = ({ session }) => {
  const { t, locale } = useAdminI18n();
  const toast = useToast();
  const canWrite = session.permissions.includes('products.write');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editing, setEditing] = useState<{ product: Product | null; input: ProductInput } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Product | null>(null);
  const [toggling, setToggling] = useState(false);

  const products = useAsync(() => fetchProducts(), []);
  const types = useAsync<ProductTypeItem[]>(() => fetchProductTypes(), []);

  const productsHaveActiveFlag = useMemo(
    () => (products.data || []).some((p) => Object.prototype.hasOwnProperty.call(p, 'active')),
    [products.data]
  );

  const filtered = useMemo(() => {
    let rows = products.data || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.blood_type.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') rows = rows.filter((p) => p.product_type_id === typeFilter);
    return rows;
  }, [products.data, search, typeFilter]);

  const isActive = (p: Product) =>
    Object.prototype.hasOwnProperty.call(p, 'active') ? Boolean((p as Product & { active?: boolean }).active) : p.availability !== 'Out of Stock';

  const startEdit = (product: Product) => {
    setFormError(null);
    setEditing({
      product,
      input: {
        name: product.name,
        description: product.description || '',
        blood_type: product.blood_type,
        product_type_id: product.product_type_id,
        price: Number(product.price || 0),
        stock_quantity: Number(product.stock_quantity || 0),
        availability: product.availability,
        image_url: product.image_url || '',
      },
    });
  };

  const startCreate = () => {
    setFormError(null);
    setEditing({
      product: null,
      input: { ...emptyProduct(), product_type_id: types.data?.find((x) => x.active)?.id || types.data?.[0]?.id || '' },
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.input.name.trim()) {
      setFormError(t('products.nameRequired'));
      return;
    }
    if (editing.input.price < 0) {
      setFormError(t('products.priceInvalid'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await saveProduct(editing.product?.id ?? null, editing.input);
      toast.push(t('products.saved'));
      setEditing(null);
      products.reload();
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
      const nextActive = !isActive(toggleTarget);
      await setProductActive(toggleTarget, nextActive);
      toast.push(nextActive ? t('products.activated') : t('products.deactivated'));
      setToggleTarget(null);
      products.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setToggling(false);
    }
  };

  const columns: Column<Product>[] = useMemo(
    () => [
      {
        key: 'product',
        header: t('products.colName'),
        render: (p) => (
          <div className="flex items-center gap-2.5">
            {p.image_url ? (
              <img
                src={p.image_url}
                alt=""
                loading="lazy"
                className="h-9 w-9 shrink-0 rounded-lg border border-slate-100 object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">
                —
              </span>
            )}
            <div className="min-w-0">
              <p className="max-w-[230px] truncate font-semibold text-slate-900" title={p.name}>
                {p.name}
              </p>
              <p className="max-w-[230px] truncate text-[10.5px] text-slate-400">{p.description}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: t('products.colType'),
        render: (p) => (
          <span className="text-[12px] text-slate-600">
            {types.data?.find((x) => x.id === p.product_type_id)?.name || p.product_type_id}
          </span>
        ),
      },
      {
        key: 'blood',
        header: t('products.colBlood'),
        align: 'center',
        render: (p) => (
          <span className="inline-flex min-w-8 items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
            {p.blood_type}
          </span>
        ),
      },
      {
        key: 'price',
        header: t('products.colPrice'),
        align: 'end',
        render: (p) => <span className="font-semibold tabular-nums text-slate-800">{currency(Number(p.price), locale)}</span>,
      },
      {
        key: 'stock',
        header: t('products.colStock'),
        align: 'center',
        render: (p) => (
          <span
            className={cn(
              'tabular-nums',
              Number(p.stock_quantity) === 0 ? 'font-semibold text-red-600' : 'text-slate-700'
            )}
          >
            {p.stock_quantity}
          </span>
        ),
      },
      {
        key: 'availability',
        header: t('products.colAvailability'),
        render: (p) => <AvailabilityBadge value={p.availability} />,
      },
      {
        key: 'status',
        header: t('products.colStatus'),
        render: (p) =>
          isActive(p) ? (
            <Badge tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t('common.active')}
            </Badge>
          ) : (
            <Badge tone="neutral">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {t('common.inactive')}
            </Badge>
          ),
      },
      {
        key: 'updated',
        header: t('products.colUpdated'),
        render: (p) => (
          <span className="whitespace-nowrap text-[11.5px] text-slate-500">
            {formatDate(p.updated_at || p.created_at, locale)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'end',
        render: (p) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={!canWrite}
              onClick={() => startEdit(p)}
              icon={<Pencil className="h-3.5 w-3.5" />}
              aria-label={t('common.edit')}
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={!canWrite}
              onClick={() => setToggleTarget(p)}
              icon={<Power className="h-3.5 w-3.5" />}
              aria-label={isActive(p) ? t('products.deactivate') : t('products.activate')}
            />
          </div>
        ),
      },
    ],
    [canWrite, locale, t, types.data]
  );

  return (
    <div>
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={
          canWrite ? (
            <Button size="sm" variant="primary" onClick={startCreate} icon={<Plus className="h-3.5 w-3.5" />}>
              {t('products.add')}
            </Button>
          ) : null
        }
      />

      {!productsHaveActiveFlag && !products.loading ? (
        <div className="mb-3">
          <InlineNotice tone="info">{t('products.migrationBanner')}</InlineNotice>
        </div>
      ) : null}

      <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('products.searchPlaceholder')}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white ps-8 pe-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-[#c8102e]/40 focus:outline-none focus:ring-2 focus:ring-[#c8102e]/10"
          />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sm:w-56">
          <option value="all">
            {t('products.colType')} · {t('common.all')}
          </option>
          {(types.data || []).map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
        <span className="text-[11px] text-slate-400 sm:ms-auto">
          {filtered.length} {t('common.rows')}
        </span>
      </Card>

      <DataTable
        columns={columns}
        rows={filtered}
        keyExtractor={(p) => p.id}
        loading={products.loading}
        error={products.error}
        onRetry={products.reload}
        emptyTitle={t('products.empty')}
        emptyDescription={t('products.emptyHint')}
        emptyAction={
          canWrite && !search && typeFilter === 'all' ? (
            <Button size="sm" onClick={startCreate} icon={<Plus className="h-3.5 w-3.5" />}>
              {t('products.add')}
            </Button>
          ) : undefined
        }
      />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.product ? t('products.editTitle') : t('products.newTitle')}
        description={editing?.product?.name}
        width="max-w-2xl"
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" type="submit" form="product-form" loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {editing ? (
          <form id="product-form" onSubmit={submit} className="space-y-3">
            {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}
            <Field label={t('products.name')} required>
              <Input
                value={editing.input.name}
                onChange={(e) => setEditing({ ...editing, input: { ...editing.input, name: e.target.value } })}
                required
              />
            </Field>
            <Field label={t('products.description')}>
              <Textarea
                rows={3}
                value={editing.input.description}
                onChange={(e) => setEditing({ ...editing, input: { ...editing.input, description: e.target.value } })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t('products.type')} required>
                <Select
                  value={editing.input.product_type_id}
                  onChange={(e) =>
                    setEditing({ ...editing, input: { ...editing.input, product_type_id: e.target.value } })
                  }
                  required
                >
                  <option value="">—</option>
                  {(types.data || []).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                      {type.active ? '' : ' (inactive)'}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('products.bloodType')} required>
                <Select
                  value={editing.input.blood_type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      input: { ...editing.input, blood_type: e.target.value as ProductInput['blood_type'] },
                    })
                  }
                >
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('products.price')} hint={t('products.priceWarn')}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editing.input.price}
                  onChange={(e) =>
                    setEditing({ ...editing, input: { ...editing.input, price: Number(e.target.value) } })
                  }
                />
              </Field>
              <Field label={t('products.stock')}>
                <Input
                  type="number"
                  min={0}
                  value={editing.input.stock_quantity}
                  onChange={(e) =>
                    setEditing({ ...editing, input: { ...editing.input, stock_quantity: Number(e.target.value) } })
                  }
                />
              </Field>
              <Field label={t('products.availability')}>
                <Select
                  value={editing.input.availability}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      input: { ...editing.input, availability: e.target.value as ProductInput['availability'] },
                    })
                  }
                >
                  {AVAILABILITY.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('products.imageUrl')}>
                <Input
                  value={editing.input.image_url}
                  onChange={(e) => setEditing({ ...editing, input: { ...editing.input, image_url: e.target.value } })}
                  placeholder="https://…"
                />
              </Field>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget && isActive(toggleTarget) ? t('products.confirmDeactivate') : t('products.activate')}
        description={toggleTarget && isActive(toggleTarget) ? t('products.confirmDeactivateBody') : toggleTarget?.name}
        confirmLabel={
          toggleTarget && isActive(toggleTarget) ? t('products.deactivate') : t('products.activate')
        }
        danger={Boolean(toggleTarget && isActive(toggleTarget))}
        loading={toggling}
        onConfirm={applyToggle}
        onClose={() => setToggleTarget(null)}
      />
    </div>
  );
};
