import React from 'react';
import { Droplets } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchBloodTypes, toggleBloodType } from '../data/adminApi';
import type { BloodTypeItem } from '../../types';
import { useAsync } from '../lib/useAsync';
import { Card, InlineNotice, PageHeader, Skeleton, Toggle, useToast } from '../components/ui';
import type { AdminSession } from '../lib/types';

export const BloodTypesPage: React.FC<{ session: AdminSession }> = ({ session }) => {
  const { t } = useAdminI18n();
  const toast = useToast();
  const canWrite = session.permissions.includes('catalog.write');

  const blood = useAsync(() => fetchBloodTypes(), []);

  const toggle = async (item: BloodTypeItem) => {
    try {
      await toggleBloodType(item);
      toast.push(t('blood.toggled'));
      blood.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    }
  };

  return (
    <div>
      <PageHeader title={t('blood.title')} subtitle={t('blood.subtitle')} />

      <div className="mb-3">
        <InlineNotice tone="warning">{t('blood.notice')}</InlineNotice>
      </div>

      <Card className="p-4">
        {blood.loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(blood.data || []).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/40 px-3.5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#c8102e] ring-1 ring-slate-200">
                    <Droplets className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[15px] font-bold leading-tight text-slate-900">{item.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      item.active
                        ? 'text-[10.5px] font-semibold uppercase tracking-wide text-emerald-600'
                        : 'text-[10.5px] font-semibold uppercase tracking-wide text-slate-400'
                    }
                  >
                    {item.active ? t('common.active') : t('common.inactive')}
                  </span>
                  <Toggle
                    checked={item.active}
                    onChange={() => (canWrite ? toggle(item) : undefined)}
                    disabled={!canWrite}
                    label={`${item.name} ${t('blood.colStatus')}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!blood.loading && (blood.data || []).length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">{t('empty.title')}</p>
        ) : null}
      </Card>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{t('blood.notice')}</p>
    </div>
  );
};
