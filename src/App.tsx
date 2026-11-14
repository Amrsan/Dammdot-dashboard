import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { supabase } from './services/supabase';
import { Order, Product, UserProfile } from './types';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { useLanguage } from './i18n/LanguageContext';
import { stripBase, toPublicPath } from './lib/basePath';

import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { SelectProductPage } from './pages/SelectProductPage';
import { MultiStepOrderFlow } from './components/order/MultiStepOrderFlow';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { CustomerAccountPage } from './pages/CustomerAccountPage';
import { AboutUsPage } from './pages/AboutUsPage';
import { TherapeuticPhlebotomyCallPage } from './pages/TherapeuticPhlebotomyCallPage';
// The staff console lives in its own entry (src/admin) mounted at /admin by main.tsx.

const VALID_ROUTES = [
  '/',
  '/products',
  '/select-product',
  '/order',
  '/order-confirmation',
  '/account',
  '/account/orders',
  '/about',
  '/phlebotomy-call',
  '/admin',
];

const getInitialRouteState = () => {
  try {
    const pathname = stripBase(window.location.pathname || '/');
    const searchParams = new URLSearchParams(window.location.search);
    const params: any = {};
    searchParams.forEach((val, key) => {
      params[key] = val;
    });

    const matchedRoute = VALID_ROUTES.includes(pathname) ? pathname : '/';
    return { route: matchedRoute, params };
  } catch {
    return { route: '/', params: {} };
  }
};

export default function App() {
  const { language } = useLanguage();
  const initialRouteInfo = React.useMemo(() => getInitialRouteState(), []);
  const [currentRoute, setCurrentRoute] = useState<string>(initialRouteInfo.route);
  const [routeParams, setRouteParams] = useState<any>(initialRouteInfo.params);
  const historyStackRef = React.useRef<{ route: string; params: any }[]>([
    { route: initialRouteInfo.route, params: initialRouteInfo.params }
  ]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => db.getCurrentUser());
  // Modal starts closed by default and only opens on explicit user action or password recovery link
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot' | 'updatePassword'>('login');
  const [authReason, setAuthReason] = useState<string>('');
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [recoveryCode, setRecoveryCode] = useState<string>('');
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<Order | null>(null);
  const [selectedProductIdForOrder, setSelectedProductIdForOrder] = useState<string | undefined>(
    undefined
  );
  const [pendingRouteAfterAuth, setPendingRouteAfterAuth] = useState<{
    route: string;
    params?: any;
  } | null>(null);

  useEffect(() => {
    // Sync user session
    const syncUser = () => {
      const active = db.getCurrentUser();
      setCurrentUser(active);
    };
    const unsub = db.subscribe(syncUser);

    // Initialize initial browser history state if absent
    try {
      const currentState = window.history.state;
      if (!currentState || !currentState.route) {
        window.history.replaceState(
          { route: currentRoute, params: routeParams },
          '',
          window.location.href
        );
      }
    } catch {}

    // Listen to browser Back and Forward button events (popstate)
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && typeof state.route === 'string') {
        setCurrentRoute(state.route);
        setRouteParams(state.params || {});
        if (historyStackRef.current.length > 1) {
          const top = historyStackRef.current[historyStackRef.current.length - 1];
          if (top.route !== state.route) {
            historyStackRef.current.pop();
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        if (historyStackRef.current.length > 1) {
          historyStackRef.current.pop();
          const prev = historyStackRef.current[historyStackRef.current.length - 1];
          setCurrentRoute(prev.route);
          setRouteParams(prev.params || {});
        } else {
          const fallback = getInitialRouteState();
          setCurrentRoute(fallback.route);
          setRouteParams(fallback.params);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Clean any residual URL hash or search code quietly on mount without opening modals
    try {
      if (window.location.hash || window.location.search.includes('code=')) {
        window.history.replaceState(
          { route: currentRoute, params: routeParams },
          '',
          window.location.pathname
        );
      }
    } catch {}

    return () => {
      unsub();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleOpenAuth = (
    mode: 'login' | 'register' | 'forgot' = 'login',
    pending?: { route: string; params?: any },
    reason?: string
  ) => {
    setAuthModalMode(mode);
    if (pending) {
      setPendingRouteAfterAuth(pending);
    }
    setAuthReason(reason || '');
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthOpen(false);
    setAuthReason('');
    try {
      window.history.replaceState(
        { route: currentRoute, params: routeParams },
        '',
        window.location.pathname
      );
    } catch {}
    const active = db.getCurrentUser();
    setCurrentUser(active);
    if (pendingRouteAfterAuth) {
      const target = pendingRouteAfterAuth;
      setPendingRouteAfterAuth(null);
      navigateTo(target.route, target.params);
    }
  };

  const navigateTo = (
    route: string,
    params?: any,
    options?: { replace?: boolean }
  ) => {
    // If route is contact, lead directly to the number in the footer
    if (route === '/contact' || route === '/contact-us') {
      const el = document.getElementById('footer-hotline');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-red-500/50', 'bg-slate-800');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-red-500/50');
        }, 3000);
      }
      // Also initiate phone dialer
      window.location.href = 'tel:+201015570651';
      return;
    }

    // If route was track-order, fallback to home
    if (route === '/track-order') {
      route = '/';
      params = {};
    }

    // Admin route protection
    if (route === '/admin') {
      const activeUser = currentUser || db.getCurrentUser();
      if (!activeUser || activeUser.role !== 'admin') {
        handleOpenAuth(
          'login',
          { route: '/admin', params },
          language === 'ar'
            ? 'يجب أن تكون مسؤولاً للوصول إلى لوحة التحكم.'
            : 'Administrator access required to access the dashboard.'
        );
        return;
      }
    }

    // Therapeutic Phlebotomy is temporarily removed from active ordering; fallback to select-product
    if (route === '/order' && params?.category === 'phlebotomy') {
      route = '/select-product';
      params = {};
    }

    // Account profile access requires user authentication unless viewing guest orders
    if (
      (route === '/account' || route === '/account/orders') &&
      !currentUser &&
      !db.getCurrentUser() &&
      db.getGuestOrders().length === 0
    ) {
      handleOpenAuth(
        'login',
        { route, params },
        language === 'ar'
          ? 'يرجى تسجيل الدخول للوصول إلى تفاصيل الحساب وسجل الطلبات.'
          : 'Please sign in to access your account profile and order history.'
      );
      return;
    }

    // Construct URL with query parameters
    let queryString = '';
    if (params && Object.keys(params).length > 0) {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && typeof v !== 'object') {
          sp.set(k, String(v));
        }
      });
      const qs = sp.toString();
      if (qs) queryString = `?${qs}`;
    }
    const targetUrl = `${route}${queryString}`;

    // Update internal navigation history stack
    const lastEntry = historyStackRef.current[historyStackRef.current.length - 1];
    const isSameAsLast =
      lastEntry &&
      lastEntry.route === route &&
      JSON.stringify(lastEntry.params || {}) === JSON.stringify(params || {});

    if (options?.replace) {
      if (historyStackRef.current.length > 0) {
        historyStackRef.current[historyStackRef.current.length - 1] = { route, params: params || {} };
      } else {
        historyStackRef.current.push({ route, params: params || {} });
      }
    } else if (!isSameAsLast) {
      historyStackRef.current.push({ route, params: params || {} });
    }

    // Push or replace state in window.history for browser Back/Forward integration
    try {
      if (options?.replace) {
        window.history.replaceState({ route, params: params || {} }, '', toPublicPath(targetUrl));
      } else if (!isSameAsLast) {
        window.history.pushState({ route, params: params || {} }, '', toPublicPath(targetUrl));
      }
    } catch {}

    setCurrentRoute(route);
    setRouteParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (historyStackRef.current.length > 1) {
      historyStackRef.current.pop();
      const prev = historyStackRef.current[historyStackRef.current.length - 1];
      let qs = '';
      if (prev.params && Object.keys(prev.params).length > 0) {
        const sp = new URLSearchParams();
        Object.entries(prev.params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && typeof v !== 'object') {
            sp.set(k, String(v));
          }
        });
        const str = sp.toString();
        if (str) qs = `?${str}`;
      }
      try {
        window.history.replaceState({ route: prev.route, params: prev.params || {} }, '', toPublicPath(`${prev.route}${qs}`));
      } catch {}
      setCurrentRoute(prev.route);
      setRouteParams(prev.params || {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo('/', {}, { replace: true });
    }
  };

  const handleOrderCompleted = (order: Order) => {
    setLastSubmittedOrder(order);
    navigateTo('/order-confirmation', { orderId: order.id });
  };

  const handleOrderNow = () => {
    setSelectedProductIdForOrder(undefined);
    navigateTo('/select-product');
  };

  const handleSelectProductForOrder = (product: Product) => {
    // If selecting a phlebotomy procedure, route directly to dedicated Call Us page
    if (
      product.product_type_id === 'pt-phlebotomy' ||
      product.product_type_name?.toLowerCase().includes('phlebotom') ||
      product.name?.toLowerCase().includes('phlebotom') ||
      product.name?.includes('فصد')
    ) {
      navigateTo('/phlebotomy-call');
      return;
    }

    setSelectedProductIdForOrder(product.id);
    navigateTo('/order', { productId: product.id });
  };

  const handleReorder = (previousOrder: Order) => {
    setSelectedProductIdForOrder(previousOrder.product_id);
    navigateTo('/order', {
      productId: previousOrder.product_id,
      patientAge: previousOrder.patient_age,
      bloodType: previousOrder.blood_type,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-red-100 selection:text-red-900">
      {/* Main Navigation Bar */}
      <Header
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        onBack={handleBack}
        currentUser={currentUser}
        onLogout={() => {
          db.logout();
          setCurrentUser(null);
          navigateTo('/');
          handleOpenAuth('login');
        }}
        onOpenAuth={(mode, pending, reason) => handleOpenAuth(mode || 'login', pending, reason)}
        cartCount={0}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {currentRoute === '/' && (
          <HomePage
            onOrderNow={handleOrderNow}
            onViewProducts={() => navigateTo('/products')}
            onSelectProduct={handleSelectProductForOrder}
          />
        )}

        {currentRoute === '/products' && (
          <ProductsPage
            onSelectProductForOrder={handleSelectProductForOrder}
            onBackHome={handleBack}
          />
        )}

        {currentRoute === '/select-product' && (
          <SelectProductPage
            onSelectCategory={(category) => {
              if (category === 'phlebotomy') {
                navigateTo('/phlebotomy-call');
              } else {
                navigateTo('/order', { category });
              }
            }}
            onBackHome={handleBack}
          />
        )}

        {currentRoute === '/phlebotomy-call' && (
          <TherapeuticPhlebotomyCallPage
            onBackToProducts={handleBack}
            onBackToHome={() => navigateTo('/')}
          />
        )}

        {currentRoute === '/order' && (
          <MultiStepOrderFlow
            initialProductId={selectedProductIdForOrder || routeParams.productId}
            initialCategory={routeParams.category}
            onOrderCompleted={handleOrderCompleted}
            onNavigateProducts={() => navigateTo('/products')}
            onChangeCategory={handleBack}
            onOpenAuth={(mode, reason) =>
              handleOpenAuth(mode || 'register', { route: '/order', params: routeParams }, reason)
            }
          />
        )}

        {currentRoute === '/order-confirmation' && (
          <OrderConfirmationPage
            order={
              lastSubmittedOrder ||
              (routeParams.orderId ? db.getOrderById(routeParams.orderId) : null) ||
              db.getOrders()[0]
            }
            onViewAccountOrders={() => navigateTo('/account')}
            onReturnHome={() => navigateTo('/')}
          />
        )}

        {(currentRoute === '/account' || currentRoute === '/account/orders') && (
          <CustomerAccountPage
            onReorder={handleReorder}
            onNavigateProducts={() => navigateTo('/products')}
            onOpenAuth={(mode) => handleOpenAuth(mode || 'login', { route: currentRoute })}
            onBackHome={handleBack}
          />
        )}

        {currentRoute === '/about' && (
          <AboutUsPage
            onOrderNow={handleOrderNow}
            onBackHome={handleBack}
          />
        )}

      </main>

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthModalMode('login');
          setRecoveryEmail('');
          setRecoveryCode('');
          setPendingRouteAfterAuth(null);
          setAuthReason('');
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch {}
        }}
        initialMode={authModalMode}
        initialEmail={recoveryEmail}
        initialCode={recoveryCode}
        reason={authReason}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
