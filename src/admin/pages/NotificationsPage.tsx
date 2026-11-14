import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck, CreditCard, Package, ShieldAlert } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../data/adminApi';
import type { AdminNotificationRecord } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { timeAgo } from '../lib/format';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, cn, useToast } from '../components/ui';
import { ADMIN_ROUTES } from '../components/AdminLayout';

const TYPE_ICON: Record<string, React.ReactNode> = {
  order: <Package className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  system: <ShieldAlert className="h-4 w-4" />,
  inventory: <Bell className="h-4 w-4" />,
};

const TYPE_STYLE: Record<string, string> = {
  order: 'bg-sky-50 text-sky-600',
  payment: 'bg-emerald-50 text-emerald-600',
  system: 'bg-amber-50 text-amber-600',
  inventory: 'bg-slate-100 text-slate-500',
};

export const NotificationsPage: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const { t, lang } = useAdminI18n();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const query = useAsync(() => fetchNotifications(), []);
  const notifications = query.data || [];

  const filtered = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, filter]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const openNotification = async (item: AdminNotificationRecord) => {
    try {
      if (!item.read) {
        await markNotificationRead(item.id);
        query.setData((prev) =>
          (prev || []).map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
      }
    } catch {
      /* marking read is best-effort */
    }
    if (item.order_id) navigate(`${ADMIN_ROUTES.orders}/${item.order_id}`);
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead(notifications.filter((n) => !n.read).map((n) => n.id));
      query.setData((prev) => (prev || []).map((n) => ({ ...n, read: true })));
      toast.push(t('notif.markAll'));
    } catch {
      toast.push(t('error.load'), 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title={t('notif.title')}
        subtitle={t('notif.subtitle')}
        actions={
          <>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(['all', 'unread'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    'rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold',
                    filter === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {key === 'all' ? t('notif.filterAll') : t('notif.filterUnread')}
                  {key === 'unread' && unreadCount ? ` (${unreadCount})` : ''}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={markAll}
              disabled={!unreadCount}
              icon={<CheckCheck className="h-3.5 w-3.5" />}
            >
              {t('notif.markAll')}
            </Button>
          </>
        }
      />

      <Card>
        {query.loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-5 py-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t('notif.empty')}
            description={t('notif.emptyHint')}
            icon={<Bell className="h-5 w-5" />}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openNotification(item)}
                  className={cn(
                    'flex w-full items-start gap-3 px-5 py-3.5 text-start transition-colors hover:bg-slate-50',
                    !item.read && 'bg-[#c8102e]/[0.02]'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      TYPE_STYLE[item.type] || TYPE_STYLE.inventory
                    )}
                  >
                    {TYPE_ICON[item.type] || TYPE_ICON.inventory}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn('truncate text-[12.5px]', item.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900')}>
                        {item.title}
                      </p>
                      {!item.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e]" /> : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500">{item.message}</p>
                    <p className="mt-1 flex items-center gap-2 text-[10.5px] text-slate-400">
                      <span>{timeAgo(item.created_at, lang)}</span>
                      {item.order_number ? <span>· {item.order_number}</span> : null}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:block">
                    {t(`notif.type.${item.type}` as never)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
