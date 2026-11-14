import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Droplets } from 'lucide-react';
import { AdminI18nProvider } from './lib/i18n';
import { restoreSession, signOut, fetchNotifications } from './data/adminApi';
import type { AdminSession, Permission } from './lib/types';
import { permissionsForRole } from './lib/permissions';
import { isSupabaseConfigured } from '../services/supabase';
import { AdminLayout, ADMIN_ROUTES } from './components/AdminLayout';
import { PermissionDenied, ToastProvider } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailsPage } from './pages/CustomerDetailsPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductTypesPage } from './pages/ProductTypesPage';
import { BloodTypesPage } from './pages/BloodTypesPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { StaffPage } from './pages/StaffPage';
import { SettingsPage } from './pages/SettingsPage';

const normalize = (pathname: string) => {
  let path = pathname.replace(/\/+$/, '');
  if (!path.startsWith('/admin')) path = '/admin';
  return path || '/admin';
};

const AdminShell: React.FC = () => {
  const [path, setPath] = useState<string>(() => normalize(window.location.pathname));
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    () => new URLSearchParams(window.location.search)
  );
  const [session, setSession] = useState<AdminSession | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((restored) => {
        if (cancelled) return;
        setSession(restored);
        if (!restored && normalize(window.location.pathname) === '/admin') {
          window.history.replaceState({}, '', '/admin');
        }
      })
      .catch(() => setSession(null))
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onPop = () => {
      setPath(normalize(window.location.pathname));
      setSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!session) return;
    if (normalize(window.location.pathname) === '/admin') {
      window.history.replaceState({ route: ADMIN_ROUTES.dashboard }, '', ADMIN_ROUTES.dashboard);
      setPath(ADMIN_ROUTES.dashboard);
    }
  }, [session]);

  const navigate = useCallback((next: string, options?: { replace?: boolean }) => {
    const url = new URL(next, window.location.origin);
    if (options?.replace) window.history.replaceState({ route: url.pathname }, '', url.pathname + url.search);
    else window.history.pushState({ route: url.pathname }, '', url.pathname + url.search);
    setPath(normalize(url.pathname));
    setSearchParams(new URLSearchParams(url.search));
    window.scrollTo({ top: 0 });
  }, []);

  const loadUnread = useCallback(async () => {
    if (!session?.permissions.includes('notifications.read')) return;
    try {
      const items = await fetchNotifications();
      setUnread(items.filter((n) => !n.read).length);
    } catch {
      /* badge is non-critical */
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    loadUnread();
    const interval = window.setInterval(loadUnread, 120000);
    return () => window.clearInterval(interval);
  }, [session, loadUnread]);

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    window.history.replaceState({}, '', '/admin');
    setPath('/admin');
  };

  const openOrder = (order: { id: string }) => navigate(`${ADMIN_ROUTES.orders}/${order.id}`);

  const permissions = session?.permissions || [];
  const can = (permission: Permission) => permissions.includes(permission);

  const route = useMemo(() => {
    if (path === '/admin' || path === '/admin/dashboard') {
      return { key: 'dashboard', permission: 'orders.read' as Permission, node: null };
    }
    const segments = path.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
    const [head, id] = segments;
    switch (head) {
      case 'orders':
        return id
          ? { key: 'order-details', permission: 'orders.read' as Permission, node: id }
          : { key: 'orders', permission: 'orders.read' as Permission, node: null };
      case 'customers':
        return id
          ? { key: 'customer-details', permission: 'customers.read' as Permission, node: id }
          : { key: 'customers', permission: 'customers.read' as Permission, node: null };
      case 'products':
        return { key: 'products', permission: 'products.read' as Permission, node: null };
      case 'product-types':
        return { key: 'product-types', permission: 'catalog.read' as Permission, node: null };
      case 'blood-types':
        return { key: 'blood-types', permission: 'catalog.read' as Permission, node: null };
      case 'delivery':
        return { key: 'delivery', permission: 'delivery.read' as Permission, node: null };
      case 'payments':
        return { key: 'payments', permission: 'payments.read' as Permission, node: null };
      case 'reports':
        return { key: 'reports', permission: 'reports.read' as Permission, node: null };
      case 'notifications':
        return { key: 'notifications', permission: 'notifications.read' as Permission, node: null };
      case 'staff':
        return { key: 'staff', permission: 'staff.read' as Permission, node: null };
      case 'settings':
        return { key: 'settings', permission: 'settings.read' as Permission, node: null };
      default:
        return { key: 'dashboard', permission: 'orders.read' as Permission, node: null };
    }
  }, [path]);

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220]">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-10 w-10 animate-pulse items-center justify-center rounded-xl bg-[#c8102e]">
            <Droplets className="h-5 w-5 text-white" />
          </span>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">HemoPortal</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // If Supabase is configured, create anon session and bypass login
    if (isSupabaseConfigured) {
      const anonSession: AdminSession = {
        userId: 'anon',
        profileId: 'anon',
        name: 'Admin (Anon)',
        email: 'admin@hemoportal.local',
        role: 'super_admin',
        roleLabel: 'Super Admin',
        permissions: permissionsForRole('super_admin'),
        localMode: false,
      };
      setSession(anonSession);
      navigate(ADMIN_ROUTES.dashboard, { replace: true });
      return null;
    }
    return (
      <LoginPage
        onAuthenticated={(authenticated) => {
          setSession(authenticated);
          navigate(ADMIN_ROUTES.dashboard, { replace: true });
        }}
      />
    );
  }

  const content = () => {
    if (!can(route.permission)) return <PermissionDenied />;

    switch (route.key) {
      case 'dashboard':
        return <DashboardPage navigate={navigate} session={session} onOpenOrder={openOrder} />;
      case 'orders':
        return (
          <OrdersPage
            // Remount when the header search sends a new query to an already-open page.
            key={`${searchParams.get('search') || ''}|${searchParams.get('status') || ''}`}
            onOpenOrder={openOrder}
            initialSearch={searchParams.get('search') || ''}
            initialStatus={searchParams.get('status') || ''}
            canExport={can('orders.read')}
          />
        );
      case 'order-details':
        return <OrderDetailsPage orderId={route.node as string} navigate={navigate} />;
      case 'customers':
        return <CustomersPage navigate={navigate} />;
      case 'customer-details':
        return <CustomerDetailsPage customerId={route.node as string} navigate={navigate} />;
      case 'products':
        return <ProductsPage session={session} />;
      case 'product-types':
        return <ProductTypesPage session={session} />;
      case 'blood-types':
        return <BloodTypesPage session={session} />;
      case 'delivery':
        return <DeliveryPage session={session} />;
      case 'payments':
        return <PaymentsPage session={session} navigate={navigate} />;
      case 'reports':
        return <ReportsPage />;
      case 'notifications':
        return <NotificationsPage navigate={navigate} />;
      case 'staff':
        return <StaffPage session={session} />;
      case 'settings':
        return <SettingsPage session={session} />;
      default:
        return <DashboardPage navigate={navigate} session={session} onOpenOrder={openOrder} />;
    }
  };

  return (
    <AdminLayout
      session={session}
      path={path}
      navigate={navigate}
      onLogout={handleLogout}
      unreadCount={unread}
    >
      {content()}
    </AdminLayout>
  );
};

export const AdminApp: React.FC = () => (
  <AdminI18nProvider>
    <ToastProvider>
      <AdminShell />
    </ToastProvider>
  </AdminI18nProvider>
);

export default AdminApp;
