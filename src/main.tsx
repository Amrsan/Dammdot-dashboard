import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import './index.css';

// The staff console is a separate application shell mounted only under /admin.
// It is lazy-loaded so the customer storefront bundle is unaffected.
const AdminApp = lazy(() => import('./admin/AdminApp.tsx').then((mod) => ({ default: mod.AdminApp })));

const isAdminArea =
  window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminArea ? (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#0b1220] text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            HemoPortal
          </div>
        }
      >
        <AdminApp />
      </Suspense>
    ) : (
      <LanguageProvider>
        <App />
      </LanguageProvider>
    )}
  </StrictMode>,
);
