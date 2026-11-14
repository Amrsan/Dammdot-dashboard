import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Droplets,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  X,
} from 'lucide-react';
import type { AdminSession, Permission } from '../lib/types';
import type { AdminTextKey } from '../lib/i18n';
import { useAdminI18n } from '../lib/i18n';
import { cn } from './ui';
import { initials } from '../lib/format';

interface NavItem {
  path: string;
  labelKey: AdminTextKey;
  icon: React.ReactNode;
  permission: Permission;
  badge?: number;
}

interface NavGroup {
  titleKey: AdminTextKey;
  items: NavItem[];
}

export const ADMIN_ROUTES = {
  dashboard: '/admin/dashboard',
  orders: '/admin/orders',
  customers: '/admin/customers',
  products: '/admin/products',
  productTypes: '/admin/product-types',
  bloodTypes: '/admin/blood-types',
  delivery: '/admin/delivery',
  payments: '/admin/payments',
  reports: '/admin/reports',
  notifications: '/admin/notifications',
  staff: '/admin/staff',
  settings: '/admin/settings',
};

const PAGE_TITLES: { match: string; key: AdminTextKey }[] = [
  { match: ADMIN_ROUTES.dashboard, key: 'nav.dashboard' },
  { match: ADMIN_ROUTES.orders, key: 'nav.orders' },
  { match: ADMIN_ROUTES.customers, key: 'nav.customers' },
  { match: ADMIN_ROUTES.products, key: 'nav.products' },
  { match: ADMIN_ROUTES.productTypes, key: 'nav.productTypes' },
  { match: ADMIN_ROUTES.bloodTypes, key: 'nav.bloodTypes' },
  { match: ADMIN_ROUTES.delivery, key: 'nav.delivery' },
  { match: ADMIN_ROUTES.payments, key: 'nav.payments' },
  { match: ADMIN_ROUTES.reports, key: 'nav.reports' },
  { match: ADMIN_ROUTES.notifications, key: 'nav.notifications' },
  { match: ADMIN_ROUTES.staff, key: 'nav.staff' },
  { match: ADMIN_ROUTES.settings, key: 'nav.settings' },
];

const Logo: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className="flex items-center gap-2.5">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#c8102e] shadow-[0_2px_8px_rgba(200,16,46,0.35)]">
      <Droplets className="h-4 w-4 text-white" />
    </span>
    {!compact ? (
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold tracking-tight text-white">HemoPortal</span>
        <span className="block truncate text-[9.5px] font-medium uppercase tracking-[0.18em] text-slate-400">
          Operations
        </span>
      </span>
    ) : null}
  </div>
);

export const AdminLayout: React.FC<{
  session: AdminSession;
  path: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  onLogout: () => void;
  unreadCount: number;
  children: React.ReactNode;
}> = ({ session, path, navigate, onLogout, unreadCount, children }) => {
  const { t, lang, setLang, dir } = useAdminI18n();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hemoportal_admin_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('hemoportal_admin_collapsed', collapsed ? '1' : '0');
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [path]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const can = (permission: Permission) => session.permissions.includes(permission);

  const groups: NavGroup[] = ([
    {
      titleKey: 'nav.operations',
      items: [
        {
          path: ADMIN_ROUTES.dashboard,
          labelKey: 'nav.dashboard',
          icon: <LayoutDashboard className="h-[17px] w-[17px]" />,
          permission: 'orders.read',
        },
        {
          path: ADMIN_ROUTES.orders,
          labelKey: 'nav.orders',
          icon: <ClipboardList className="h-[17px] w-[17px]" />,
          permission: 'orders.read',
        },
        {
          path: ADMIN_ROUTES.customers,
          labelKey: 'nav.customers',
          icon: <Users className="h-[17px] w-[17px]" />,
          permission: 'customers.read',
        },
      ],
    },
    {
      titleKey: 'nav.catalog',
      items: [
        {
          path: ADMIN_ROUTES.products,
          labelKey: 'nav.products',
          icon: <Package className="h-[17px] w-[17px]" />,
          permission: 'products.read',
        },
        {
          path: ADMIN_ROUTES.productTypes,
          labelKey: 'nav.productTypes',
          icon: <Tags className="h-[17px] w-[17px]" />,
          permission: 'catalog.read',
        },
        {
          path: ADMIN_ROUTES.bloodTypes,
          labelKey: 'nav.bloodTypes',
          icon: <Droplets className="h-[17px] w-[17px]" />,
          permission: 'catalog.read',
        },
        {
          path: ADMIN_ROUTES.delivery,
          labelKey: 'nav.delivery',
          icon: <MapPin className="h-[17px] w-[17px]" />,
          permission: 'delivery.read',
        },
      ],
    },
    {
      titleKey: 'nav.finance',
      items: [
        {
          path: ADMIN_ROUTES.payments,
          labelKey: 'nav.payments',
          icon: <CreditCard className="h-[17px] w-[17px]" />,
          permission: 'payments.read',
        },
        {
          path: ADMIN_ROUTES.reports,
          labelKey: 'nav.reports',
          icon: <BarChart3 className="h-[17px] w-[17px]" />,
          permission: 'reports.read',
        },
      ],
    },
    {
      titleKey: 'nav.administration',
      items: [
        {
          path: ADMIN_ROUTES.notifications,
          labelKey: 'nav.notifications',
          icon: <Bell className="h-[17px] w-[17px]" />,
          permission: 'notifications.read',
          badge: unreadCount,
        },
        {
          path: ADMIN_ROUTES.staff,
          labelKey: 'nav.staff',
          icon: <ShieldCheck className="h-[17px] w-[17px]" />,
          permission: 'staff.read',
        },
        {
          path: ADMIN_ROUTES.settings,
          labelKey: 'nav.settings',
          icon: <Settings className="h-[17px] w-[17px]" />,
          permission: 'settings.read',
        },
      ],
    },
  ] as NavGroup[])
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) }))
    .filter((group) => group.items.length > 0);

  const activeItem = PAGE_TITLES.find((p) => path === p.match || path.startsWith(`${p.match}/`));
  const pageTitle = activeItem ? t(activeItem.key) : t('nav.dashboard');

  const submitGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = globalSearch.trim();
    navigate(term ? `${ADMIN_ROUTES.orders}?search=${encodeURIComponent(term)}` : ADMIN_ROUTES.orders);
    setGlobalSearch('');
  };

  const navList = (isMobile: boolean) => (
    <nav className={cn('flex-1 overflow-y-auto px-2.5 pb-4', isMobile && 'px-3')}>
      {groups.map((group) => (
        <div key={group.titleKey} className="mt-4 first:mt-1">
          {(!collapsed || isMobile) && (
            <p className="mb-1.5 px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t(group.titleKey)}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = path === item.path || path.startsWith(`${item.path}/`);
              return (
                <li key={item.path}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    title={collapsed && !isMobile ? t(item.labelKey) : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors',
                      active
                        ? 'bg-white/[0.09] text-white'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100',
                      collapsed && !isMobile && 'justify-center px-0'
                    )}
                  >
                    {active ? (
                      <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-[#e11d3c]" />
                    ) : null}
                    <span className={cn('shrink-0', active ? 'text-[#f06a7f]' : 'text-slate-500 group-hover:text-slate-300')}>
                      {item.icon}
                    </span>
                    {(!collapsed || isMobile) && <span className="flex-1 truncate text-start">{t(item.labelKey)}</span>}
                    {(!collapsed || isMobile) && item.badge ? (
                      <span className="rounded-full bg-[#c8102e] px-1.5 py-0.5 text-[9.5px] font-bold text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebarFooter = (
    <div className="border-t border-white/5 p-2.5">
      <button
        type="button"
        onClick={onLogout}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white',
          collapsed && 'justify-center px-0'
        )}
      >
        <LogOut className="h-[17px] w-[17px] rtl:-scale-x-100" />
        {!collapsed && <span>{t('nav.logout')}</span>}
      </button>
      {!collapsed && (
        <p className="px-2.5 pt-1 text-[9px] leading-relaxed text-slate-600">{t('common.poweredBy')}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900" dir={dir}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-30 hidden flex-col bg-[#0b1220] transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[68px]' : 'w-[248px]'
        )}
      >
        <div className={cn('flex h-14 items-center border-b border-white/5 px-4', collapsed && 'justify-center px-0')}>
          <Logo compact={collapsed} />
        </div>
        {navList(false)}
        {sidebarFooter}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 start-0 flex w-[264px] flex-col bg-[#0b1220] shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navList(true)}
            {sidebarFooter}
          </aside>
        </div>
      ) : null}

      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:ps-[68px]' : 'lg:ps-[248px]')}>
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label={t('nav.openMenu')}
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:block"
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>

          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-slate-900">{pageTitle}</p>
            <p className="hidden truncate text-[10.5px] text-slate-400 sm:block">
              {session.name} · {session.roleLabel}
            </p>
          </div>

          <form onSubmit={submitGlobalSearch} className="relative ms-auto hidden w-full max-w-[280px] md:block">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder={t('orders.searchPlaceholder')}
              aria-label={t('common.search')}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/70 ps-8 pe-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-[#c8102e]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c8102e]/10"
            />
          </form>

          <div className="ms-auto flex items-center gap-1 md:ms-0">
            <div className="me-1 flex rounded-md border border-slate-200 p-0.5" role="group" aria-label="Language">
              {(['en', 'ar'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10.5px] font-bold',
                    lang === code ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {code === 'en' ? 'EN' : 'ع'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate(ADMIN_ROUTES.notifications)}
              className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label={t('nav.notifications')}
            >
              <Bell className="h-[17px] w-[17px]" />
              {unreadCount > 0 ? (
                <span className="absolute end-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#c8102e] px-1 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg py-1 pe-1.5 ps-1 hover:bg-slate-100"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10.5px] font-bold text-white">
                  {initials(session.name) || 'HP'}
                </span>
                <span className="hidden text-start sm:block">
                  <span className="block max-w-[120px] truncate text-[11.5px] font-semibold leading-tight text-slate-800">
                    {session.name}
                  </span>
                  <span className="block text-[9.5px] uppercase tracking-wide text-slate-400">{session.roleLabel}</span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
              </button>
              {profileOpen ? (
                <div
                  role="menu"
                  className="absolute end-0 top-full z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-[12px] font-semibold text-slate-800">{session.name}</p>
                    <p className="truncate text-[10.5px] text-slate-500">{session.email}</p>
                    <p className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-600">
                      {session.roleLabel}
                    </p>
                  </div>
                  {session.permissions.includes('settings.read') ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => navigate(ADMIN_ROUTES.settings)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-slate-600 hover:bg-slate-50"
                    >
                      <Settings className="h-3.5 w-3.5" /> {t('nav.settings')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5 rtl:-scale-x-100" /> {t('nav.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
};
