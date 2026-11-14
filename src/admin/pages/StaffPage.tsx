import React, { useMemo, useState } from 'react';
import { Plus, ShieldCheck, UserPlus } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import {
  addStaffMember,
  fetchStaff,
  saveStaffActive,
  saveStaffRole,
  searchProfiles,
} from '../data/adminApi';
import type { AdminRoleKey, AdminSession, Permission, StaffMember } from '../lib/types';
import { permissionsForRole, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../lib/permissions';
import { useAsync } from '../lib/useAsync';
import { formatDateTime, initials } from '../lib/format';
import { DataTable, type Column } from '../components/DataTable';
import {
  ActiveBadge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  InlineNotice,
  Input,
  Modal,
  PageHeader,
  Select,
  Toggle,
  useToast,
} from '../components/ui';

const ROLE_KEYS: AdminRoleKey[] = ['super_admin', 'operations_manager', 'order_manager', 'product_manager', 'finance', 'viewer'];

const MATRIX: { permission: Permission; label: string; short: string }[] = [
  { permission: 'orders.read', label: 'Orders · read', short: 'Read' },
  { permission: 'orders.write', label: 'Orders · update', short: 'Update' },
  { permission: 'orders.cancel', label: 'Orders · cancel/reject', short: 'Cancel' },
  { permission: 'customers.read', label: 'Customers', short: 'Customers' },
  { permission: 'products.write', label: 'Products · write', short: 'Products' },
  { permission: 'catalog.write', label: 'Types & blood groups', short: 'Catalog' },
  { permission: 'delivery.write', label: 'Delivery fees', short: 'Delivery' },
  { permission: 'payments.read', label: 'Payments', short: 'Payments' },
  { permission: 'payments.refund', label: 'Refunds', short: 'Refunds' },
  { permission: 'reports.read', label: 'Reports', short: 'Reports' },
  { permission: 'staff.write', label: 'Staff management', short: 'Staff' },
  { permission: 'settings.write', label: 'Settings', short: 'Settings' },
  { permission: 'audit.read', label: 'Audit log', short: 'Audit' },
];

export const StaffPage: React.FC<{ session: AdminSession }> = ({ session }) => {
  const { t, lang, locale } = useAdminI18n();
  const toast = useToast();
  const canWrite = session.permissions.includes('staff.write');

  const staff = useAsync(() => fetchStaff(), []);
  const [roleTarget, setRoleTarget] = useState<StaffMember | null>(null);
  const [roleValue, setRoleValue] = useState<AdminRoleKey>('viewer');
  const [toggleTarget, setToggleTarget] = useState<StaffMember | null>(null);
  const [working, setWorking] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addRole, setAddRole] = useState<AdminRoleKey>('order_manager');
  const [selectedProfile, setSelectedProfile] = useState<{ id: string; label: string } | null>(null);

  const profiles = useAsync(() => (addQuery.trim().length >= 2 ? searchProfiles(addQuery) : Promise.resolve([])), [
    addQuery,
  ]);

  const rows = staff.data?.rows || [];

  const activeSupers = useMemo(
    () => rows.filter((r) => r.role === 'super_admin' && r.active).length,
    [rows]
  );

  const changeRole = async () => {
    if (!roleTarget) return;
    if (roleTarget.profile_id === session.profileId) {
      toast.push(t('staff.cannotSelf'), 'error');
      return;
    }
    if (roleTarget.role === 'super_admin' && roleValue !== 'super_admin' && activeSupers <= 1) {
      toast.push(t('staff.lastSuper'), 'error');
      return;
    }
    setWorking(true);
    try {
      await saveStaffRole(roleTarget.id, roleValue);
      toast.push(t('staff.roleChanged'));
      setRoleTarget(null);
      staff.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setWorking(false);
    }
  };

  const changeActive = async () => {
    if (!toggleTarget) return;
    if (toggleTarget.profile_id === session.profileId) {
      toast.push(t('staff.cannotSelf'), 'error');
      setToggleTarget(null);
      return;
    }
    setWorking(true);
    try {
      await saveStaffActive(toggleTarget.id, !toggleTarget.active);
      toast.push(t('staff.statusChanged'));
      setToggleTarget(null);
      staff.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setWorking(false);
    }
  };

  const addMember = async () => {
    if (!selectedProfile) {
      toast.push(t('staff.pickProfile'), 'error');
      return;
    }
    setWorking(true);
    try {
      await addStaffMember(selectedProfile.id, addRole);
      toast.push(t('staff.added'));
      setAddOpen(false);
      setSelectedProfile(null);
      setAddQuery('');
      staff.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : t('error.load'), 'error');
    } finally {
      setWorking(false);
    }
  };

  const columns: Column<StaffMember>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('staff.colName'),
        render: (row) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10.5px] font-bold text-white">
              {initials(row.name) || 'HP'}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                {row.name}
                {row.profile_id === session.profileId ? (
                  <span className="ms-1.5 rounded bg-slate-100 px-1 py-0.5 text-[9.5px] font-semibold uppercase text-slate-500">
                    {t('staff.you')}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-[10.5px] text-slate-400">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: t('staff.colRole'),
        render: (row) => (
          <div className="flex items-center gap-2">
            <Select
              value={row.role}
              disabled={!canWrite || row.profile_id === session.profileId}
              onChange={(e) => {
                setRoleTarget(row);
                setRoleValue(e.target.value as AdminRoleKey);
              }}
              className="h-8 w-44 text-[11.5px]"
              aria-label={t('staff.colRole')}
            >
              {ROLE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ROLE_LABELS[key][lang]}
                </option>
              ))}
            </Select>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('staff.colStatus'),
        render: (row) => (
          <div className="flex items-center gap-2">
            <ActiveBadge active={row.active} />
            <Toggle
              checked={row.active}
              disabled={!canWrite || row.profile_id === session.profileId}
              onChange={() => setToggleTarget(row)}
              label={`${row.name} ${t('common.status')}`}
            />
          </div>
        ),
      },
      {
        key: 'lastLogin',
        header: t('staff.colLastLogin'),
        render: (row) => (
          <span className="whitespace-nowrap text-[11.5px] text-slate-500">{formatDateTime(row.last_login_at, locale)}</span>
        ),
      },
    ],
    [canWrite, lang, locale, session.profileId, t]
  );

  return (
    <div>
      <PageHeader
        title={t('staff.title')}
        subtitle={t('staff.subtitle')}
        actions={
          canWrite ? (
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} icon={<Plus className="h-3.5 w-3.5" />}>
              {t('staff.add')}
            </Button>
          ) : null
        }
      />

      {staff.data && !staff.data.schemaReady ? (
        <div className="mb-3">
          <InlineNotice tone="warning">{t('error.schema')}</InlineNotice>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        keyExtractor={(row) => row.id}
        loading={staff.loading}
        error={staff.error}
        onRetry={staff.reload}
        emptyTitle={t('staff.empty')}
        emptyDescription={t('staff.emptyHint')}
      />

      <Card className="mt-4">
        <CardHeader
          title={t('staff.matrix')}
          subtitle={t('staff.matrixHint')}
          action={<ShieldCheck className="h-3.5 w-3.5 text-slate-400" />}
        />
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full min-w-[640px] border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pe-3 text-start text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('staff.colRole')}
                </th>
                {MATRIX.map((item) => (
                  <th
                    key={item.permission}
                    className="px-2 py-2 text-center text-[9.5px] font-semibold uppercase tracking-wide text-slate-400"
                    title={item.label}
                  >
                    {item.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ROLE_KEYS.map((role) => {
                const granted = permissionsForRole(role);
                const all = granted.length >= MATRIX.length;
                return (
                  <tr key={role}>
                    <td className="py-2 pe-3">
                      <p className="font-semibold text-slate-800">{ROLE_LABELS[role][lang]}</p>
                      <p className="text-[10px] text-slate-400">{ROLE_DESCRIPTIONS[role][lang]}</p>
                    </td>
                    {MATRIX.map((item) => (
                      <td key={item.permission} className="px-2 py-2 text-center">
                        {all || granted.includes(item.permission) ? (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="inline-block h-px w-2 bg-slate-200" />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(roleTarget)}
        title={t('staff.colRole')}
        description={roleTarget ? `${roleTarget.name} → ${ROLE_LABELS[roleValue][lang]}` : undefined}
        confirmLabel={t('common.save')}
        loading={working}
        onConfirm={changeRole}
        onClose={() => setRoleTarget(null)}
      >
        <Select value={roleValue} onChange={(e) => setRoleValue(e.target.value as AdminRoleKey)}>
          {ROLE_KEYS.map((key) => (
            <option key={key} value={key}>
              {ROLE_LABELS[key][lang]}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-[11px] text-slate-500">{ROLE_DESCRIPTIONS[roleValue][lang]}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.active ? t('common.disable') : t('common.enable')}
        description={toggleTarget?.name}
        confirmLabel={t('common.confirm')}
        danger={Boolean(toggleTarget?.active)}
        loading={working}
        onConfirm={changeActive}
        onClose={() => setToggleTarget(null)}
      >
        <p className="text-[12px] text-slate-600">{t('staff.matrixHint')}</p>
      </ConfirmDialog>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('staff.add')}
        description={t('staff.addHint')}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" onClick={addMember} loading={working} icon={<UserPlus className="h-3.5 w-3.5" />}>
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('staff.pickProfile')} hint={t('staff.addHint')}>
            <Input
              value={selectedProfile ? selectedProfile.label : addQuery}
              onChange={(e) => {
                setSelectedProfile(null);
                setAddQuery(e.target.value);
              }}
              placeholder={t('customers.searchPlaceholder')}
            />
          </Field>
          {!selectedProfile && (profiles.data || []).length > 0 ? (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
              {(profiles.data || []).map((profile) => (
                <li key={profile.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedProfile(profile)}
                    className="w-full px-3 py-2 text-start text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    {profile.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Field label={t('staff.pickRole')}>
            <Select value={addRole} onChange={(e) => setAddRole(e.target.value as AdminRoleKey)}>
              {ROLE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ROLE_LABELS[key][lang]}
                </option>
              ))}
            </Select>
          </Field>
          <InlineNotice tone="info">{t('staff.matrixHint')}</InlineNotice>
        </div>
      </Modal>
    </div>
  );
};
