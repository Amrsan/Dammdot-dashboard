# Security report — staff console

## Verified in this change

**Admin authentication**
- `/admin` requires a Supabase Auth session. `restoreSession()` reads `supabase.auth.getSession()`
  and resolves the staff role from `staff_members`; without a staff row (or the legacy
  `profiles.role = 'admin'` flag) the session is rejected and signed out.
- The console never stores a role in `localStorage`; the demo session is `sessionStorage` only and
  exists solely when no Supabase project is configured.
- Every `/admin/*` path is rendered by a separate shell in `src/main.tsx`, so the storefront's
  header, footer, modals and language provider never mount for staff.

**Authorisation**
- `src/admin/lib/permissions.ts` mirrors the SQL matrix used by `has_staff_permission()`.
- The UI hides unavailable actions (`PermissionGuard` via route-level permission checks and
  disabled controls) and the database rejects them independently through RLS.
- Migration 002 replaced `Anyone can manage products / product types / blood types` and
  `Anyone can update orders` with staff-permission policies. A signed-in customer cannot write to
  the catalog, orders, delivery or settings even with a hand-crafted request.
- Refunds require `payments.refund`; cancelling/rejecting requires `orders.cancel`; staff and
  settings changes require `staff.write` / `settings.write`.

**Payment integrity**
- The console never computes a payable amount and never marks an order paid from a redirect.
  `markPaid` is a manual staff action, confirmed in a dialog, restricted to `orders.write`, and
  written to the audit log.
- "Verified revenue" and average order value only include `payment_status = 'Paid'`; refunds are
  excluded. Paymob webhook verification and idempotency in `server.ts` were not weakened.
- No Paymob or Supabase secret is present in frontend code or editable in Settings.

**Auditing**
- `audit_logs` records actor, role, action, entity and payload for order/payment/catalog/delivery/
  staff/settings mutations. `order_status_history` remains the customer-visible timeline.

## Known gaps (not silently claimed as fixed)

1. **Customer-level data isolation is still weak.** The storefront signs customers in with its own
   localStorage accounts and calls PostgREST with the anon key, so `auth.uid()` is null for real
   customers. `profiles` is still publicly selectable, `orders` still publicly selectable (needed
   for guest tracking by order number + phone), and `delivery_addresses` still permissive.
   Tightening these requires migrating the storefront to Supabase Auth; the target policies are
   included, commented, in migration 002. Until then, a determined user with the anon key can read
   order rows. This is a P1 follow-up, not a solved problem.
2. **Role changes are not self-protected in SQL.** The UI blocks changing your own role and removing
   the last active super admin; add a trigger for defence in depth.
3. **Notifications are derived in local mode.** With Supabase configured the console reads
   `admin_notifications`; nothing yet inserts rows there on new orders/payments. A DB trigger or
   server-side insert is the next step, and `dedupe_key` already prevents duplicates.
4. **No MFA requirement** for staff accounts. Enable Supabase MFA enforcement for the staff group.
5. **Audit log retention** is unbounded; add a retention job before go-live.

## Recommended follow-ups, in order

1. Migrate storefront authentication to Supabase Auth, then enable the commented customer RLS
   policies and replace public order select with a `track_order(order_number, phone)` RPC.
2. Add the notification-producing trigger (`orders` insert / `payment_status` transitions) with
   `dedupe_key = 'order:'||id` and `'payment:'||id||':'||status`.
3. Enforce MFA for `staff_members` and log sign-ins to `audit_logs`.
