# HemoPortal deployment

## 1. Environment variables (names only)

Server (`server.ts`):

```
SUPABASE_SERVICE_ROLE_KEY   # only if you move privileged reads to the server (not required today)
PAYMOB_SECRET_KEY
PAYMOB_PUBLIC_KEY
PAYMOB_INTEGRATION_ID
PAYMOB_HMAC_SECRET
PORT                        # server.ts currently listens on 3000
```

Browser (Vite, public by design):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Never place the service-role key, Paymob secret key or HMAC secret in `VITE_*` variables or in the
Settings screen. The console's Settings page only stores business configuration.

## 2. Database

Apply `migrations/002_admin_dashboard.sql` in the Supabase SQL editor (or `supabase db push`).

It is additive:

- creates `admin_roles`, `staff_members`, `audit_logs`, `admin_notifications`, `business_settings`
- adds `products.active` (default `true`)
- adds indexes used by the console
- replaces the permissive `USING (true)` write policies on catalog, delivery, orders and order
  history with staff-permission checks
- leaves the storefront's own policies (guest order insert, order select, profile/address writes)
  untouched, because the storefront authenticates with local accounts rather than Supabase Auth

The rollback block is at the bottom of the same file. Nothing is dropped or rewritten by the
forward migration.

## 3. Create the first staff account

1. Create/invite the user in **Supabase → Authentication → Users** (email + password).
2. Insert their profile if the trigger did not:
   ```sql
   insert into public.profiles (id, full_name, phone, email, role)
   values ('<auth-user-id>', 'Ops Lead', '+201000000000', 'ops@example.com', 'customer')
   on conflict (id) do nothing;
   ```
3. Grant staff access:
   ```sql
   insert into public.staff_members (profile_id, role)
   values ('<auth-user-id>', 'super_admin');
   ```
4. Sign in at `/admin` with that email/password. Additional staff are managed in
   Staff & Roles → Add staff member.

Only accounts that exist in `auth.users` can sign in; only rows in `staff_members` (or the legacy
`profiles.role = 'admin'` flag while it remains) grant dashboard access.

## 4. Frontend

```
npm install
npm run build      # vite build + bundled server
npm start          # node dist/server.cjs (port 3000)
```

The console is part of the same SPA and is lazy-loaded at `/admin/*`. Any static host must rewrite
unknown paths to `index.html`; `server.ts` already does this (`app.get('*')`).

## 4a. Deploying the storefront to GitHub Pages

GitHub Pages only serves static files, so it hosts the browser app (storefront + console UI) and
talks to Supabase directly. It cannot host `server.ts`; the Paymob endpoints in `server.ts` need
separate Node hosting (see section 6).

- Pages URL: `https://<owner>.github.io/Dammdot-dashboard/`
- The Vite `base` is applied only in the `pages` build mode, so the Express build stays at `/`:

  ```
  npm run build:pages
  ```

  This writes `dist/` with `/Dammdot-dashboard/` asset URLs, plus `dist/404.html` (SPA deep-link
  fallback) and `dist/.nojekyll`.
- `.github/workflows/deploy-pages.yml` runs on every push to `main`: `npm ci` → `npm run lint` →
  `npm run build:pages` → upload `dist` → deploy.
- Repository → Settings → Pages → **Source** must be **GitHub Actions** (not a branch).
- Optional repository variables (Settings → Secrets and variables → Actions → Variables):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. They are public values; never add
  `PAYMOB_SECRET_KEY`, `PAYMOB_HMAC_SECRET` or a service-role key here.

## 4b. Database schema required by the console

The console expects the base schema in `src/services/supabaseSchema.ts` and the additive
`migrations/002_admin_dashboard.sql`. Apply both before using `/admin`; without them the dashboard
logs PostgREST errors (`products.active`, `admin_notifications`, `delivery_addresses`,
`orders.manual_delivery_address`).

`migrations/003_reconcile_schema.sql` adds the two storefront columns the console reads
(`orders.manual_delivery_address`, `products.active`). The console also selects `*` so it keeps
rendering live data if the deployed schema is still behind.

## 5. Verification after deploy

1. `GET /admin` shows the sign-in screen, not the storefront.
2. Sign in with a staff account → `/admin/dashboard` loads with live numbers.
3. Create an order on the storefront → it appears in `/admin/orders` without refreshing the build.
4. Change a status in the console → `order_status_history` gains a row and the customer tracking
   page shows the new status.
5. Edit an area fee in `/admin/delivery` → the storefront checkout recalculates with it.
6. Sign in with a `viewer` account → write buttons are disabled and the API rejects writes.

## 6. Backend-dependent features on GitHub Pages

`/api/paymob/config`, `/api/paymob/create-intention` and `/api/paymob/webhook` live in `server.ts`.
On GitHub Pages those URLs return 404, so online card payments cannot complete there. Cash on
Delivery, catalog browsing, accounts and orders (via Supabase) work without the Node backend.
To enable Paymob in production, host `dist/server.cjs` (built by `npm run build`) on a Node host,
point a reverse proxy at it, and serve the SPA from the same origin.
