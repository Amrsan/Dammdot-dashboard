-- ============================================================================
-- HemoPortal — 002: Staff console (roles, audit, notifications, settings, RLS)
-- ----------------------------------------------------------------------------
-- Additive and reversible. No existing row is dropped or rewritten.
-- Rollback: see the ROLLBACK section at the bottom of this file.
-- Apply with:  supabase db push  (or paste into the SQL editor)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. STAFF ROLES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM (
    'super_admin',
    'operations_manager',
    'order_manager',
    'product_manager',
    'finance',
    'viewer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_roles (
  role        staff_role PRIMARY KEY,
  label_en    TEXT NOT NULL,
  label_ar    TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.admin_roles (role, label_en, label_ar, description) VALUES
  ('super_admin',        'Super Admin',        'مسؤول عام',        'Full access to every module'),
  ('operations_manager', 'Operations Manager', 'مدير عمليات',      'Orders, customers, delivery, reports'),
  ('order_manager',      'Order Manager',      'مدير طلبات',       'Process and update orders'),
  ('product_manager',    'Product Manager',    'مدير منتجات',      'Catalog, types, blood groups, stock'),
  ('finance',            'Finance',            'الشؤون المالية',   'Payments, refunds, financial reports'),
  ('viewer',             'Viewer',             'مشاهدة فقط',       'Read-only access')
ON CONFLICT (role) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.staff_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          staff_role NOT NULL DEFAULT 'viewer',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS staff_members_profile_idx ON public.staff_members (profile_id);

-- Permission helper. Mirrors src/admin/lib/permissions.ts, which is only a UI hint.
CREATE OR REPLACE FUNCTION public.has_staff_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_members sm
    WHERE sm.profile_id = auth.uid()
      AND sm.active
      AND (
        sm.role = 'super_admin'
        OR (sm.role = 'operations_manager' AND p_permission IN (
              'orders.read','orders.write','orders.cancel','customers.read','customers.write',
              'delivery.read','delivery.write','reports.read','notifications.read','audit.read'))
        OR (sm.role = 'order_manager' AND p_permission IN (
              'orders.read','orders.write','customers.read','delivery.read','notifications.read'))
        OR (sm.role = 'product_manager' AND p_permission IN (
              'products.read','products.write','catalog.read','catalog.write',
              'delivery.read','notifications.read'))
        OR (sm.role = 'finance' AND p_permission IN (
              'orders.read','payments.read','payments.refund','reports.read','notifications.read'))
        OR (sm.role = 'viewer' AND p_permission LIKE '%.read')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE profile_id = auth.uid() AND active
  ) OR EXISTS (
    -- legacy flag, keeps a single existing admin working during rollout
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_staff_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. AUDIT LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name       TEXT NOT NULL,
  actor_role       TEXT NOT NULL,
  action           TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        TEXT NOT NULL,
  details          JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx  ON public.audit_logs (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 3. ADMIN NOTIFICATIONS (deduplicated by key)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL CHECK (type IN ('order','payment','system','inventory')),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  order_id     TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number TEXT,
  dedupe_key   TEXT UNIQUE,
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_idx ON public.admin_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_unread_idx  ON public.admin_notifications (read) WHERE read = FALSE;

-- ----------------------------------------------------------------------------
-- 4. BUSINESS SETTINGS (single JSON document; never holds secrets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_settings (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.business_settings (id, data)
VALUES ('global', '{}'::JSONB)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. PRODUCT ACTIVE FLAG (storefront visibility without deleting rows)
-- ----------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- ----------------------------------------------------------------------------
-- 6. SUPPORTING INDEXES FOR CONSOLE QUERIES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_created_idx        ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx         ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS orders_customer_phone_idx ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS orders_user_idx           ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_area_idx           ON public.orders (area_id);
CREATE INDEX IF NOT EXISTS order_history_order_idx   ON public.order_status_history (order_id, created_at);
CREATE INDEX IF NOT EXISTS products_type_idx         ON public.products (product_type_id);
CREATE INDEX IF NOT EXISTS products_search_idx       ON public.products (lower(name));
CREATE INDEX IF NOT EXISTS areas_city_idx            ON public.areas (city_id);
CREATE INDEX IF NOT EXISTS profiles_created_idx      ON public.profiles (created_at DESC);

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- Reads of the public catalog stay open (the storefront depends on them).
-- Every write now requires a staff permission instead of `USING (true)`.
-- ----------------------------------------------------------------------------
ALTER TABLE public.admin_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings  ENABLE ROW LEVEL SECURITY;

-- admin_roles: readable by any signed-in user, writable by nobody through the API
DROP POLICY IF EXISTS "admin roles readable" ON public.admin_roles;
CREATE POLICY "admin roles readable" ON public.admin_roles FOR SELECT TO authenticated USING (TRUE);

-- staff_members
DROP POLICY IF EXISTS "staff read self or managers" ON public.staff_members;
CREATE POLICY "staff read self or managers" ON public.staff_members
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.has_staff_permission('staff.read'));

DROP POLICY IF EXISTS "staff managed by super admin" ON public.staff_members;
CREATE POLICY "staff managed by super admin" ON public.staff_members
  FOR ALL TO authenticated
  USING (public.has_staff_permission('staff.write'))
  WITH CHECK (public.has_staff_permission('staff.write'));

-- audit_logs: append-only for staff writers, readable with audit.read
DROP POLICY IF EXISTS "audit readable" ON public.audit_logs;
CREATE POLICY "audit readable" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_staff_permission('audit.read') OR public.has_staff_permission('settings.read'));

DROP POLICY IF EXISTS "audit append only" ON public.audit_logs;
CREATE POLICY "audit append only" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

-- admin_notifications
DROP POLICY IF EXISTS "notifications read" ON public.admin_notifications;
CREATE POLICY "notifications read" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (public.has_staff_permission('notifications.read'));

DROP POLICY IF EXISTS "notifications update" ON public.admin_notifications;
CREATE POLICY "notifications update" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (public.has_staff_permission('notifications.read'))
  WITH CHECK (public.has_staff_permission('notifications.read'));

DROP POLICY IF EXISTS "notifications insert" ON public.admin_notifications;
CREATE POLICY "notifications insert" ON public.admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

-- business_settings
DROP POLICY IF EXISTS "settings read" ON public.business_settings;
CREATE POLICY "settings read" ON public.business_settings
  FOR SELECT TO authenticated
  USING (public.has_staff_permission('settings.read') OR public.has_staff_permission('orders.read'));

DROP POLICY IF EXISTS "settings write" ON public.business_settings;
CREATE POLICY "settings write" ON public.business_settings
  FOR ALL TO authenticated
  USING (public.has_staff_permission('settings.write'))
  WITH CHECK (public.has_staff_permission('settings.write'));

-- PROFILES / ADDRESSES: intentionally left as-is.
-- The storefront signs customers in with its own localStorage accounts and talks to
-- PostgREST with the anon key, so auth.uid() is NULL for real customers. Restricting
-- these tables now would break profile saving, address saving and order sync.
-- Tightening them requires first moving the storefront onto Supabase Auth. Target
-- policies are kept here, commented, so the follow-up is a one-line uncomment:
--
-- DROP POLICY IF EXISTS "Public view profiles" ON public.profiles;
-- CREATE POLICY "profiles read own or staff" ON public.profiles FOR SELECT TO authenticated
--   USING (id = auth.uid() OR public.has_staff_permission('customers.read'));
-- DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
-- CREATE POLICY "profiles update own or staff" ON public.profiles FOR UPDATE TO authenticated
--   USING (id = auth.uid() OR public.has_staff_permission('customers.write'))
--   WITH CHECK (id = auth.uid() OR public.has_staff_permission('customers.write'));
-- DROP POLICY IF EXISTS "Manage delivery addresses" ON public.delivery_addresses;
-- CREATE POLICY "owners manage addresses" ON public.delivery_addresses FOR ALL TO authenticated
--   USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
--
-- The staff console never depends on these permissive policies: it authenticates
-- with Supabase Auth and reads customers through customers.read checks in the app,
-- plus the indexes added above.

-- PRODUCTS: public read, staff write
DROP POLICY IF EXISTS "Anyone can manage products" ON public.products;
DROP POLICY IF EXISTS "staff manage products" ON public.products;
CREATE POLICY "staff manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_staff_permission('products.write'))
  WITH CHECK (public.has_staff_permission('products.write'));

-- PRODUCT TYPES / BLOOD TYPES: public read, catalog.write
DROP POLICY IF EXISTS "Anyone can manage product types" ON public.product_types;
DROP POLICY IF EXISTS "staff manage product types" ON public.product_types;
CREATE POLICY "staff manage product types" ON public.product_types
  FOR ALL TO authenticated
  USING (public.has_staff_permission('catalog.write'))
  WITH CHECK (public.has_staff_permission('catalog.write'));

DROP POLICY IF EXISTS "Anyone can manage blood types" ON public.blood_types;
DROP POLICY IF EXISTS "staff manage blood types" ON public.blood_types;
CREATE POLICY "staff manage blood types" ON public.blood_types
  FOR ALL TO authenticated
  USING (public.has_staff_permission('catalog.write'))
  WITH CHECK (public.has_staff_permission('catalog.write'));

-- DELIVERY: public read, delivery.write
DROP POLICY IF EXISTS "staff manage areas" ON public.areas;
CREATE POLICY "staff manage areas" ON public.areas
  FOR ALL TO authenticated
  USING (public.has_staff_permission('delivery.write'))
  WITH CHECK (public.has_staff_permission('delivery.write'));

DROP POLICY IF EXISTS "staff manage governorates" ON public.governorates;
CREATE POLICY "staff manage governorates" ON public.governorates
  FOR ALL TO authenticated
  USING (public.has_staff_permission('delivery.write'))
  WITH CHECK (public.has_staff_permission('delivery.write'));

DROP POLICY IF EXISTS "staff manage cities" ON public.cities;
CREATE POLICY "staff manage cities" ON public.cities
  FOR ALL TO authenticated
  USING (public.has_staff_permission('delivery.write'))
  WITH CHECK (public.has_staff_permission('delivery.write'));

-- ORDERS
-- SELECT stays public because guest checkout + order tracking read by order number.
-- Recommended follow-up: replace it with a SECURITY DEFINER track_order() RPC before
-- moving the storefront to Supabase Auth. UPDATE is staff-only, which is safe because
-- the storefront never updates an existing order.
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
DROP POLICY IF EXISTS "staff update orders" ON public.orders;
CREATE POLICY "staff update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_staff_permission('orders.write') OR public.has_staff_permission('payments.refund'))
  WITH CHECK (public.has_staff_permission('orders.write') OR public.has_staff_permission('payments.refund'));

-- ORDER STATUS HISTORY
DROP POLICY IF EXISTS "Anyone can insert status history" ON public.order_status_history;
DROP POLICY IF EXISTS "staff insert status history" ON public.order_status_history;
CREATE POLICY "staff insert status history" ON public.order_status_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission('orders.write'));


COMMIT;

-- ----------------------------------------------------------------------------
-- ROLLBACK (run manually; restores the previous permissive policies)
-- ----------------------------------------------------------------------------
-- BEGIN;
-- DROP POLICY IF EXISTS "staff update orders" ON public.orders;
-- CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true);
-- DROP POLICY IF EXISTS "staff insert status history" ON public.order_status_history;
-- CREATE POLICY "Anyone can insert status history" ON public.order_status_history FOR INSERT WITH CHECK (true);
-- DROP POLICY IF EXISTS "staff manage products" ON public.products;
-- CREATE POLICY "Anyone can manage products" ON public.products FOR ALL USING (true);
-- DROP POLICY IF EXISTS "staff manage product types" ON public.product_types;
-- CREATE POLICY "Anyone can manage product types" ON public.product_types FOR ALL USING (true);
-- DROP POLICY IF EXISTS "staff manage blood types" ON public.blood_types;
-- CREATE POLICY "Anyone can manage blood types" ON public.blood_types FOR ALL USING (true);
-- DROP TABLE IF EXISTS public.business_settings, public.admin_notifications, public.audit_logs, public.staff_members, public.admin_roles;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS active;
-- DROP TYPE IF EXISTS staff_role;
-- COMMIT;
