# HemoPortal — Staff Console (Admin Dashboard)

The customer storefront was **not** redesigned, rebuilt or replaced. This change adds a separate
internal operations application mounted under `/admin/*`.

## What was added

A standalone React shell (`src/admin`) with its own routing, providers, layout and translation
layer. It is lazy-loaded, so the storefront bundle and runtime behaviour are unchanged.

| Route | Screen |
| --- | --- |
| `/admin` | Staff sign-in gate (redirects to the dashboard once authenticated) |
| `/admin/dashboard` | KPI cards, orders trend, status donut, recent orders, top products, blood-type demand, delivery areas |
| `/admin/orders` | Server-side paginated/searched/filtered order table, CSV export |
| `/admin/orders/:id` | Full order record, payment block, status workflow, internal notes, vertical timeline |
| `/admin/customers` | Customer list with order counts and verified spend |
| `/admin/customers/:id` | Profile, contact, addresses, order history, payment history |
| `/admin/products` | Shared catalog CRUD (same `public.products` the storefront reads) |
| `/admin/product-types` | Classification management with product counts |
| `/admin/blood-types` | Commercial availability of blood groups (no clinical rules) |
| `/admin/delivery` | Governorate → city → area coverage, fees, enable/disable |
| `/admin/payments` | Verified payment records, revenue/pending/failed/refunded summary, refunds |
| `/admin/reports` | Revenue, orders, product performance, blood demand, customer mix, delivery performance, CSV export |
| `/admin/notifications` | Operational alerts with read state |
| `/admin/staff` | Staff directory, role assignment, permission matrix |
| `/admin/settings` | Business/order/delivery/notification settings, security notes, audit trail |

## Key implementation points

- **Real data, one backend.** Every screen reads the existing Supabase tables
  (`orders`, `order_status_history`, `profiles`, `products`, `product_types`, `blood_types`,
  `governorates`, `cities`, `areas`). No parallel catalog, order or customer store was created.
- **Server-side work.** Order list search/filter/sort/pagination is pushed to PostgREST with
  `range()` and `count: 'exact'`; nothing downloads the whole order book.
- **Authorisation is two-layer.** The UI hides what a role cannot do, and migration
  `migrations/002_admin_dashboard.sql` enforces the same matrix through `staff_members` +
  `has_staff_permission()` inside RLS policies. The console signs in with Supabase Auth, so
  `auth.uid()` is real for staff.
- **Auditability.** Status changes, payment changes, catalog edits, delivery fee edits, staff and
  settings changes write to `audit_logs`; order status changes also append to
  `order_status_history` (the customer timeline source).
- **Money is not invented.** "Verified revenue" only sums `payment_status = 'Paid'`. Refunds are
  excluded. A browser redirect never marks anything paid; the server webhook remains the only
  path that can confirm a Paymob payment.
- **Offline/dev mode.** With no Supabase env vars the console runs against the seeded local
  dataset and says so in a banner. This is a development convenience, not a production path.

## Files

New (all under `src/admin/`): `AdminApp.tsx`, `components/{AdminLayout,DataTable,StatCard,charts,ui}.tsx`,
`data/adminApi.ts`, `lib/{i18n,permissions,format,types,useAsync}.ts`,
`pages/{Dashboard,Orders,OrderDetails,Customers,CustomerDetails,Products,ProductTypes,BloodTypes,Delivery,Payments,Reports,Notifications,Staff,Settings,Login}Page.tsx`.

Changed: `src/main.tsx` (mounts the console at `/admin`), `src/App.tsx` (removed the old admin
import/render), `migrations/002_admin_dashboard.sql` (new; replaces three conflicting draft files).

Removed: `src/pages/AdminDashboardPage.tsx` (the previous single-file admin tab page, superseded).
