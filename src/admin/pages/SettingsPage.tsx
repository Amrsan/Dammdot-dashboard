import React, { useEffect, useState } from 'react';
import { Lock, Save, ShieldCheck } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { backendMode, fetchAuditLogs, fetchSettings, saveSettings } from '../data/adminApi';
import type { AdminSession, AuditLogEntry, BusinessSettings } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { formatDateTime } from '../lib/format';
import { ROLE_LABELS } from '../lib/permissions';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  InlineNotice,
  Input,
  PageHeader,
  Skeleton,
  Toggle,
  useToast,
} from '../components/ui';

export const SettingsPage: React.FC<{ session: AdminSession }> = ({ session }) => {
  const { t, locale, lang } = useAdminI18n();
  const toast = useToast();
  const canWrite = session.permissions.includes('settings.write');
  const canAudit = session.permissions.includes('audit.read');

  const loaded = useAsync(() => fetchSettings(), []);
  const audit = useAsync<AuditLogEntry[]>(() => (canAudit ? fetchAuditLogs(15) : Promise.resolve([])), [canAudit]);

  const [form, setForm] = useState<BusinessSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded.data) setForm(loaded.data.settings);
  }, [loaded.data]);

  const set = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await saveSettings(form);
      toast.push(t('settings.saved'));
      loaded.reload();
      audit.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loaded.loading || !form) {
    return (
      <div>
        <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        actions={
          <Button
            size="sm"
            variant="primary"
            type="submit"
            loading={saving}
            disabled={!canWrite}
            icon={<Save className="h-3.5 w-3.5" />}
          >
            {t('common.save')}
          </Button>
        }
      />

      {!canWrite ? (
        <div className="mb-3">
          <InlineNotice tone="warning">{t('common.readOnly')}</InlineNotice>
        </div>
      ) : null}
      {backendMode === 'local' ? (
        <div className="mb-3">
          <InlineNotice tone="warning">{t('settings.localNote')}</InlineNotice>
        </div>
      ) : null}
      {loaded.data && !loaded.data.schemaReady ? (
        <div className="mb-3">
          <InlineNotice tone="info">{t('settings.schemaNote')}</InlineNotice>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('settings.general')} />
          <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label={t('settings.businessName')}>
              <Input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} disabled={!canWrite} />
            </Field>
            <Field label={t('settings.supportPhone')}>
              <Input value={form.support_phone} onChange={(e) => set('support_phone', e.target.value)} disabled={!canWrite} dir="ltr" />
            </Field>
            <Field label={t('settings.supportEmail')}>
              <Input type="email" value={form.support_email} onChange={(e) => set('support_email', e.target.value)} disabled={!canWrite} />
            </Field>
            <Field label={t('settings.address')}>
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} disabled={!canWrite} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.orders')} />
          <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label={t('settings.orderPrefix')}>
              <Input value={form.order_prefix} onChange={(e) => set('order_prefix', e.target.value)} disabled={!canWrite} />
            </Field>
            <Field label={t('settings.requireVerification')}>
              <div className="flex h-9 items-center">
                <Toggle
                  checked={form.require_verification}
                  onChange={(v) => set('require_verification', v)}
                  disabled={!canWrite}
                  label={t('settings.requireVerification')}
                />
              </div>
            </Field>
            <Field label={t('settings.minQty')}>
              <Input
                type="number"
                min={1}
                value={form.min_order_quantity}
                onChange={(e) => set('min_order_quantity', Number(e.target.value))}
                disabled={!canWrite}
              />
            </Field>
            <Field label={t('settings.maxQty')}>
              <Input
                type="number"
                min={1}
                value={form.max_order_quantity}
                onChange={(e) => set('max_order_quantity', Number(e.target.value))}
                disabled={!canWrite}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.delivery')} />
          <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label={t('settings.defaultFee')}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.default_delivery_fee}
                onChange={(e) => set('default_delivery_fee', Number(e.target.value))}
                disabled={!canWrite}
              />
            </Field>
            <Field label={t('settings.freeThreshold')}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.free_delivery_threshold}
                onChange={(e) => set('free_delivery_threshold', Number(e.target.value))}
                disabled={!canWrite}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.notifications')} />
          <div className="space-y-3 px-5 pb-5">
            {[
              { key: 'notification_new_order' as const, label: t('settings.newOrderNotif') },
              { key: 'notification_payment_failed' as const, label: t('settings.failedPaymentNotif') },
              { key: 'notification_low_stock' as const, label: t('settings.lowStockNotif') },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-slate-600">{item.label}</span>
                <Toggle
                  checked={Boolean(form[item.key])}
                  onChange={(v) => set(item.key, v)}
                  disabled={!canWrite}
                  label={item.label}
                />
              </div>
            ))}
            <Field label={t('settings.lowStockThreshold')}>
              <Input
                type="number"
                min={0}
                value={form.low_stock_threshold}
                onChange={(e) => set('low_stock_threshold', Number(e.target.value))}
                disabled={!canWrite}
              />
            </Field>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t('settings.security')} action={<ShieldCheck className="h-3.5 w-3.5 text-slate-400" />} />
          <div className="space-y-3 px-5 pb-5">
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-[11.5px] leading-relaxed text-slate-600">{t('settings.secretsNote')}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-[11.5px] sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('settings.backend')}</p>
                <p className="mt-0.5 font-medium text-slate-700">
                  {backendMode === 'supabase' ? 'Supabase (RLS enforced)' : 'Local demo data'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('settings.signedInAs')}
                </p>
                <p className="mt-0.5 font-medium text-slate-700">{session.email}</p>
              </div>
              <div className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('staff.colRole')}</p>
                <p className="mt-0.5 font-medium text-slate-700">{ROLE_LABELS[session.role][lang]}</p>
              </div>
            </div>
          </div>
        </Card>

        {canAudit ? (
          <Card className="lg:col-span-2">
            <CardHeader title={t('settings.audit')} subtitle={t('orders.auditHint')} />
            <div className="px-5 pb-5">
              {audit.loading ? (
                <Skeleton className="h-24 w-full" />
              ) : (audit.data || []).length ? (
                <ul className="divide-y divide-slate-100">
                  {(audit.data || []).map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-slate-800">
                          <span className="font-mono text-[11px] text-slate-500">{entry.action}</span> · {entry.entity_type}
                        </p>
                        <p className="text-[10.5px] text-slate-400">
                          {entry.actor_name} · {formatDateTime(entry.created_at, locale)}
                        </p>
                      </div>
                      <Badge tone="neutral">{entry.actor_role}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11.5px] text-slate-400">{t('settings.auditEmpty')}</p>
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </form>
  );
};
