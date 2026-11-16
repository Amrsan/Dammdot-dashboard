-- Reconcile the live storefront schema with the columns the console queries.
-- Safe to run repeatedly. Apply in Supabase -> SQL Editor.
--
-- Symptom this fixes: the Operations overview and Reports & analytics show
-- zero orders/revenue because the orders query requests a column that does not
-- exist yet, and dashboard reads fall back to an empty dataset.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS manual_delivery_address TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- The staff console also expects these tables. They are created by
-- migrations/002_admin_dashboard.sql; run that file first if you have not yet.
-- (admin_roles, staff_members, audit_logs, admin_notifications, business_settings)
