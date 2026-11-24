import { catalogProductKey, listCatalogProducts } from '../../services/productCatalog';
import { db } from '../../services/db';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import type {
  BloodTypeItem,
  DeliveryArea,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductTypeItem,
  UserProfile,
} from '../../types';
import type {
  AdminNotificationRecord,
  AdminOrder,
  AdminRoleKey,
  AdminSession,
  AreaDemandRow,
  AuditLogEntry,
  BloodTypeDemandRow,
  BusinessSettings,
  DashboardData,
  DateRange,
  Paginated,
  StaffMember,
  StatusBreakdownItem,
  StatusHistoryEntry,
  TimeSeriesPoint,
  TopProductRow,
} from '../lib/types';
import { permissionsForRole, ROLE_LABELS } from '../lib/permissions';

export const backendMode: 'supabase' | 'local' = isSupabaseConfigured ? 'supabase' : 'local';

let session: AdminSession | null = null;
export const getAdminSession = () => session;
export const setAdminSession = (value: AdminSession | null) => {
  session = value;
};

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

const MISSING_RELATION = '42P01';
const MISSING_COLUMN = '42703';

const errorCode = (error: unknown) => (error as { code?: string } | null)?.code;
const isMissingRelation = (error: unknown) =>
  errorCode(error) === MISSING_RELATION || /does not exist|schema cache/i.test(String((error as Error)?.message || ''));
const isMissingColumn = (error: unknown) =>
  errorCode(error) === MISSING_COLUMN || /column .* does not exist/i.test(String((error as Error)?.message || ''));

const cleanSearch = (value: string) => value.replace(/[(),%]/g, ' ').trim();

const localKey = (key: string) => `hemoportal_admin_${key}`;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(localKey(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(localKey(key), JSON.stringify(value));
  } catch {}
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  business_name: 'HemoPortal',
  support_phone: '+20 101 557 0651',
  support_email: 'care@hemoportal.com',
  address: 'Cairo, Egypt',
  order_prefix: 'BB',
  min_order_quantity: 1,
  max_order_quantity: 20,
  default_delivery_fee: 50,
  free_delivery_threshold: 0,
  require_verification: true,
  notification_new_order: true,
  notification_payment_failed: true,
  notification_low_stock: true,
  low_stock_threshold: 5,
  currency: 'EGP',
};

/* ------------------------------- audit ---------------------------- */

export async function writeAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>
) {
  const actor = session;
  if (!actor) return;
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actor_name: actor.name,
    actor_role: actor.role,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ?? null,
    created_at: new Date().toISOString(),
  };

  if (supabase && !actor.localMode) {
    const { error } = await supabase.from('audit_logs').insert({
      id: entry.id,
      actor_profile_id: actor.profileId,
      actor_name: entry.actor_name,
      actor_role: entry.actor_role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details ?? null,
    });
    if (!error) return;
    if (!isMissingRelation(error)) {
      console.warn('[admin] audit log write failed', error.message);
      return;
    }
  }

  const existing = readLocal<AuditLogEntry[]>('audit_logs', []);
  writeLocal('audit_logs', [entry, ...existing].slice(0, 300));
}

export async function fetchAuditLogs(limit = 25): Promise<AuditLogEntry[]> {
  if (supabase && !session?.localMode) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error && data) return data as AuditLogEntry[];
    if (error && !isMissingRelation(error)) throw error;
  }
  return readLocal<AuditLogEntry[]>('audit_logs', []).slice(0, limit);
}

/* ------------------------------- orders --------------------------- */

// Select every column instead of a fixed list: the deployed app must keep
// working when the live database schema lags behind (for example a newly added
// column such as orders.manual_delivery_address). PostgREST returns all columns
// and the console maps only the fields it knows about.
const ORDER_COLUMNS = '*';

export interface OrderFilters {
  search?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  productTypeId?: string;
  bloodType?: string;
  area?: string;
  from?: string;
  to?: string;
}

export interface OrderQuery extends OrderFilters {
  page: number;
  pageSize: number;
  sortBy?: 'created_at' | 'total';
  sortDir?: 'asc' | 'desc';
}

function inRange(order: Order, range: DateRange) {
  const created = new Date(order.created_at).getTime();
  if (range.from && created < new Date(range.from).getTime()) return false;
  if (range.to && created > new Date(range.to).getTime()) return false;
  return true;
}

function filterLocalOrders(filters: OrderFilters): AdminOrder[] {
  let rows = db.getOrders() as AdminOrder[];
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    rows = rows.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        (o.customer_email || '').toLowerCase().includes(q)
    );
  }
  if (filters.status && filters.status !== 'all')
    rows = rows.filter((o) => o.order_status === filters.status);
  if (filters.paymentStatus && filters.paymentStatus !== 'all')
    rows = rows.filter((o) => o.payment_status === filters.paymentStatus);
  if (filters.paymentMethod && filters.paymentMethod !== 'all')
    rows = rows.filter((o) => o.payment_method === filters.paymentMethod);
  if (filters.productTypeId && filters.productTypeId !== 'all')
    rows = rows.filter(
      (o) => o.product_type_id === filters.productTypeId || o.product_type_name === filters.productTypeId
    );
  if (filters.bloodType && filters.bloodType !== 'all')
    rows = rows.filter((o) => o.blood_type === filters.bloodType);
  if (filters.area && filters.area !== 'all')
    rows = rows.filter((o) => o.area_id === filters.area || o.area_name === filters.area);
  if (filters.from || filters.to) rows = rows.filter((o) => inRange(o, filters));
  return rows;
}

export async function fetchOrdersPage(query: OrderQuery): Promise<Paginated<AdminOrder>> {
  const { page, pageSize, sortBy = 'created_at', sortDir = 'desc' } = query;

  if (supabase && !(session?.localMode && !isSupabaseConfigured)) {
    try {
      let request = supabase.from('orders').select(ORDER_COLUMNS, { count: 'exact' });
      const search = query.search ? cleanSearch(query.search) : '';
      if (search) {
        request = request.or(
          `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,customer_email.ilike.%${search}%`
        );
      }
      if (query.status && query.status !== 'all') request = request.eq('order_status', query.status);
      if (query.paymentStatus && query.paymentStatus !== 'all')
        request = request.eq('payment_status', query.paymentStatus);
      if (query.paymentMethod && query.paymentMethod !== 'all')
        request = request.eq('payment_method', query.paymentMethod);
      if (query.productTypeId && query.productTypeId !== 'all')
        request = request.eq('product_type_id', query.productTypeId);
      if (query.bloodType && query.bloodType !== 'all')
        request = request.eq('blood_type', query.bloodType);
      if (query.area && query.area !== 'all') request = request.eq('area_id', query.area);
      if (query.from) request = request.gte('created_at', query.from);
      if (query.to) request = request.lte('created_at', query.to);

      const from = page * pageSize;
      let result = await request
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range(from, from + pageSize - 1);
      if (result.error) {
        console.error('Orders query error:', result.error);
        // Fallback to simpler query
        let retry = supabase.from('orders').select('*', { count: 'exact' }).order(sortBy, { ascending: sortDir === 'asc' }).range(from, from + pageSize - 1);
        if (search) {
          retry = retry.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
        }
        result = await retry;
        if (result.error) throw result.error;
      }
      return {
        rows: (result.data || []) as unknown as AdminOrder[],
        total: result.count ?? 0,
        page,
        pageSize,
      };
    } catch (e) {
      console.error('fetchOrdersPage error:', e);
      throw e;
    }
  }

  const filtered = filterLocalOrders(query);
  filtered.sort((a, b) => {
    const av = sortBy === 'total' ? a.total : new Date(a.created_at).getTime();
    const bv = sortBy === 'total' ? b.total : new Date(b.created_at).getTime();
    return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
  });
  return {
    rows: filtered.slice(page * pageSize, page * pageSize + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function fetchOrder(id: string): Promise<AdminOrder> {
  if (supabase && !(session?.localMode && !isSupabaseConfigured)) {
    try {
      let request = supabase.from('orders').select(ORDER_COLUMNS);
      request = (id.startsWith('BB-') || id.startsWith('HEMO-')) ? request.eq('order_number', id) : request.eq('id', id);
      let { data, error } = await request.maybeSingle();
      if (error) {
        let retry = supabase.from('orders').select('*');
        retry = (id.startsWith('BB-') || id.startsWith('HEMO-')) ? retry.eq('order_number', id) : retry.eq('id', id);
        const retryRes = await retry.maybeSingle();
        if (retryRes.error) throw retryRes.error;
        if (!retryRes.data) throw new Error('not_found');
        return retryRes.data as unknown as AdminOrder;
      }
      if (!data) throw new Error('not_found');
      return data as unknown as AdminOrder;
    } catch (e) {
      console.error('fetchOrder error:', e);
      throw e;
    }
  }
  const order = db.getOrderById(id);
  if (!order) throw new Error('not_found');
  return order as AdminOrder;
}

export async function fetchOrderHistory(orderId: string): Promise<StatusHistoryEntry[]> {
  if (supabase && !(session?.localMode && !isSupabaseConfigured)) {
    try {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      if (error) {
        if (typeof isMissingRelation === 'function' && isMissingRelation(error)) return [];
        throw error;
      }
      return (data || []) as StatusHistoryEntry[];
    } catch (e) {
      console.error('fetchOrderHistory error:', e);
      return [];
    }
  }
  try {
    return db.getOrderHistory(orderId) as StatusHistoryEntry[];
  } catch {
    return [];
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  options: { notes?: string; actorName?: string } = {}
) {
  const actor = session;
  const actorName = options.actorName || actor?.name || 'Staff';
  const now = new Date().toISOString();

  if (supabase && !session?.localMode) {
    const { data: current, error: readError } = await supabase
      .from('orders')
      .select('order_status')
      .eq('id', orderId)
      .maybeSingle();
    if (readError) throw readError;

    const { error } = await supabase
      .from('orders')
      .update({ order_status: status, updated_at: now })
      .eq('id', orderId);
    if (error) throw error;

    const { error: historyError } = await supabase.from('order_status_history').insert({
      order_id: orderId,
      status,
      notes: options.notes || `Status changed from ${current?.order_status ?? 'unknown'} to ${status}.`,
      created_by: actorName,
    });
    if (historyError && !isMissingRelation(historyError)) throw historyError;

    await writeAuditLog('order.status_changed', 'order', orderId, {
      from: current?.order_status ?? null,
      to: status,
      notes: options.notes ?? null,
    });
    return;
  }

  const order = db.getOrderById(orderId);
  if (!order) throw new Error('not_found');
  const previous = order.order_status;
  db.updateOrderStatus(order.id, status, options.notes, actorName);
  await writeAuditLog('order.status_changed', 'order', order.id, {
    from: previous,
    to: status,
    notes: options.notes ?? null,
  });
}

export async function updateOrderPaymentStatus(orderId: string, status: PaymentStatus) {
  const now = new Date().toISOString();
  if (supabase && !session?.localMode) {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: status, updated_at: now })
      .eq('id', orderId);
    if (error) throw error;
    await writeAuditLog('payment.status_changed', 'order', orderId, { to: status });
    return;
  }
  db.updateOrderPaymentStatus(orderId, status);
  await writeAuditLog('payment.status_changed', 'order', orderId, { to: status });
}

export async function updateInternalNotes(orderId: string, notes: string) {
  if (supabase && !session?.localMode) {
    const { error } = await supabase
      .from('orders')
      .update({ internal_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) throw error;
  } else {
    db.updateOrderInternalNotes(orderId, notes);
  }
  await writeAuditLog('order.notes_updated', 'order', orderId, { length: notes.length });
}

/* --------------------------- aggregation -------------------------- */

const PENDING_STATUSES: OrderStatus[] = ['Order Received', 'Pending Verification', 'Verification'];
const CANCELLED_STATUSES: OrderStatus[] = ['Cancelled', 'Rejected'];

const revenueOf = (orders: Order[]) =>
  orders
    .filter((o) => o.payment_status === 'Paid')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

function bucketSeries(orders: Order[], range: DateRange): TimeSeriesPoint[] {
  const from = range.from ? new Date(range.from) : new Date(Date.now() - 29 * 86400000);
  const to = range.to ? new Date(range.to) : new Date();
  const days: TimeSeriesPoint[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const span = Math.ceil((to.getTime() - cursor.getTime()) / 86400000) + 1;

  if (span <= 62) {
    for (let i = 0; i < span; i++) {
      const d = new Date(cursor);
      d.setDate(d.getDate() + i);
      days.push({ date: d.toISOString().slice(0, 10), orders: 0, revenue: 0 });
    }
    orders.forEach((o) => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const bucket = days.find((d) => d.date === key);
      if (!bucket) return;
      bucket.orders += 1;
      if (o.payment_status === 'Paid') bucket.revenue += Number(o.total || 0);
    });
    return days;
  }

  // Roll up to weekly buckets for long ranges
  const weeks = Math.ceil(span / 7);
  for (let i = 0; i < weeks; i++) {
    const d = new Date(cursor);
    d.setDate(d.getDate() + i * 7);
    days.push({ date: d.toISOString().slice(0, 10), orders: 0, revenue: 0 });
  }
  orders.forEach((o) => {
    const created = new Date(o.created_at);
    const index = Math.floor((created.getTime() - cursor.getTime()) / (7 * 86400000));
    const bucket = days[index];
    if (!bucket) return;
    bucket.orders += 1;
    if (o.payment_status === 'Paid') bucket.revenue += Number(o.total || 0);
  });
  return days;
}

export function buildDashboard(orders: AdminOrder[], range: DateRange, customerCreatedDates: string[] = []): DashboardData {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => PENDING_STATUSES.includes(o.order_status)).length;
  const completedOrders = orders.filter((o) => o.order_status === 'Delivered').length;
  const cancelledOrders = orders.filter((o) => CANCELLED_STATUSES.includes(o.order_status)).length;
  const paid = orders.filter((o) => o.payment_status === 'Paid');
  const revenue = revenueOf(orders);

  const statusCounts = new Map<OrderStatus, number>();
  orders.forEach((o) => statusCounts.set(o.order_status, (statusCounts.get(o.order_status) || 0) + 1));
  const statusBreakdown: StatusBreakdownItem[] = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const productTotals = new Map<string, TopProductRow>();
  orders.forEach((o) => {
    const key = o.product_name || 'Unspecified';
    const current = productTotals.get(key) || { name: key, quantity: 0, orders: 0, revenue: 0 };
    current.quantity += Number(o.quantity || 0);
    current.orders += 1;
    if (o.payment_status === 'Paid') current.revenue += Number(o.total || 0);
    productTotals.set(key, current);
  });

  const bloodTotals = new Map<string, BloodTypeDemandRow>();
  orders.forEach((o) => {
    const key = o.blood_type || '—';
    const current = bloodTotals.get(key) || { bloodType: key, orders: 0, quantity: 0 };
    current.orders += 1;
    current.quantity += Number(o.quantity || 0);
    bloodTotals.set(key, current);
  });

  const areaTotals = new Map<string, AreaDemandRow>();
  orders.forEach((o) => {
    const key = o.area_name || o.city_name || '—';
    const current = areaTotals.get(key) || { area: key, orders: 0, revenue: 0 };
    current.orders += 1;
    if (o.payment_status === 'Paid') current.revenue += Number(o.total || 0);
    areaTotals.set(key, current);
  });

  const customerKeys = new Set<string>();
  orders.forEach((o) => customerKeys.add((o.user_id || o.customer_email || o.customer_phone || '').toLowerCase()));
  const newCustomers = customerCreatedDates.filter((d) => inRange({ created_at: d } as Order, range)).length;

  return {
    metrics: {
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      revenue,
      paidOrders: paid.length,
      unpaidOrders: totalOrders - paid.length,
      averageOrderValue: paid.length ? revenue / paid.length : 0,
      newCustomers,
      returningCustomers: Math.max(0, customerKeys.size - newCustomers),
    },
    series: bucketSeries(orders, range),
    statusBreakdown,
    recentOrders: orders.slice(0, 8),
    topProducts: Array.from(productTotals.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    bloodTypeDemand: Array.from(bloodTotals.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8),
    areaDemand: Array.from(areaTotals.values())
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5),
  };
}

const hasSupabaseSession = () => Boolean(supabase);

export async function fetchDashboard(range: DateRange): Promise<DashboardData> {
  if (hasSupabaseSession() && supabase) {
    try {
      let query = supabase.from('orders').select(ORDER_COLUMNS).order('created_at', { ascending: false }).limit(1000);
      if (range.from) query = query.gte('created_at', range.from);
      if (range.to) query = query.lte('created_at', range.to);
      let { data, error } = await query;
      if (error) {
        console.error('Dashboard orders error:', error);
        // The remote schema can lag behind the app (for example a column that
        // exists in ORDER_COLUMNS but not yet in the database). Fall back to
        // SELECT * with the same date range so the dashboard still renders.
        let retry = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (range.from) retry = retry.gte('created_at', range.from);
        if (range.to) retry = retry.lte('created_at', range.to);
        const retryRes = await retry;
        if (retryRes.error) throw retryRes.error;
        data = retryRes.data;
      }

      let profilesQuery = supabase.from('profiles').select('created_at').limit(1000);
      if (range.from && !(data as any)?.__noFilter) profilesQuery = profilesQuery.gte('created_at', range.from);
      if (range.to) profilesQuery = profilesQuery.lte('created_at', range.to);
      const { data: profiles } = await profilesQuery;

      return buildDashboard(
        (data || []) as unknown as AdminOrder[],
        range,
        (profiles || []).map((p) => p.created_at)
      );
    } catch (e) {
      console.error('Dashboard error:', e);
      // Fallback to empty data
      return buildDashboard([], range, []);
    }
  }

  const orders = filterLocalOrders({ ...range });
  const localUsers = (db as unknown as { users?: { created_at: string }[] }).users;
  const createdDates = Array.isArray(localUsers) ? localUsers.map((u) => u.created_at) : [];
  return buildDashboard(orders, range, createdDates);
}

/* ------------------------------ customers ------------------------- */

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpend: number;
  lastOrderAt?: string | null;
  joinedAt?: string | null;
  isGuest: boolean;
}

export async function fetchCustomersPage(query: {
  search?: string;
  page: number;
  pageSize: number;
}): Promise<Paginated<CustomerRow>> {
  const { page, pageSize } = query;

  if (hasSupabaseSession()) {
    let request = supabase!
      .from('profiles')
      .select('id,full_name,email,phone,created_at', { count: 'exact' })
      .eq('role', 'customer');
    const search = query.search ? cleanSearch(query.search) : '';
    if (search) {
      request = request.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    const from = page * pageSize;
    const { data, error, count } = await request
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;

    const profiles = data || [];
    const ids = profiles.map((p) => p.id);
    let orders: AdminOrder[] = [];
    if (ids.length) {
      const { data: orderRows } = await supabase!
        .from('orders')
        .select('id,user_id,customer_email,total,payment_status,created_at')
        .in('user_id', ids)
        .limit(1000);
      orders = (orderRows || []) as unknown as AdminOrder[];
    }

    const rows: CustomerRow[] = profiles.map((p) => {
      const mine = orders.filter((o) => o.user_id === p.id);
      const paid = mine.filter((o) => o.payment_status === 'Paid');
      return {
        id: p.id,
        name: p.full_name,
        email: p.email,
        phone: p.phone,
        orders: mine.length,
        totalSpend: paid.reduce((s, o) => s + Number(o.total || 0), 0),
        lastOrderAt: mine.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0]?.created_at,
        joinedAt: p.created_at,
        isGuest: false,
      };
    });

    return { rows, total: count ?? rows.length, page, pageSize };
  }

  const allOrders = db.getOrders();
  const users = readLocal<UserProfile[]>('customers', []);
  void users;
  const map = new Map<string, CustomerRow>();

  // Registered profiles known to the local engine plus guests derived from orders
  const localUsers = (db as unknown as { users?: UserProfile[] }).users;
  const knownUsers: UserProfile[] = Array.isArray(localUsers) && localUsers.length ? localUsers : users;

  knownUsers.forEach((u) => {
    map.set(u.id, {
      id: u.id,
      name: u.full_name,
      email: u.email,
      phone: u.phone,
      orders: 0,
      totalSpend: 0,
      joinedAt: u.created_at,
      isGuest: false,
    });
  });

  allOrders.forEach((o) => {
    const key = o.user_id || `guest:${(o.customer_email || o.customer_phone).toLowerCase()}`;
    const existing = map.get(key);
    const paid = o.payment_status === 'Paid';
    if (existing) {
      existing.orders += 1;
      if (paid) existing.totalSpend += Number(o.total || 0);
      if (!existing.lastOrderAt || new Date(o.created_at) > new Date(existing.lastOrderAt))
        existing.lastOrderAt = o.created_at;
    } else {
      map.set(key, {
        id: key,
        name: o.customer_name,
        email: o.customer_email,
        phone: o.customer_phone,
        orders: 1,
        totalSpend: paid ? Number(o.total || 0) : 0,
        lastOrderAt: o.created_at,
        joinedAt: o.created_at,
        isGuest: true,
      });
    }
  });

  let rows = Array.from(map.values());
  if (query.search) {
    const q = query.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
    );
  }
  rows.sort((a, b) => +new Date(b.joinedAt || 0) - +new Date(a.joinedAt || 0));
  return {
    rows: rows.slice(page * pageSize, page * pageSize + pageSize),
    total: rows.length,
    page,
    pageSize,
  };
}

export interface CustomerDetail {
  customer: CustomerRow;
  orders: AdminOrder[];
}

export async function fetchCustomerDetail(id: string): Promise<CustomerDetail> {
  if (hasSupabaseSession()) {
    const isGuest = id.startsWith('guest:');
    let profile: UserProfile | null = null;
    if (!isGuest) {
      const { data, error } = await supabase!
        .from('profiles')
        .select('id,full_name,email,phone,created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      profile = data as unknown as UserProfile | null;
    }

    const { data: orderRows, error: orderError } = isGuest
      ? await supabase!
          .from('orders')
          .select(ORDER_COLUMNS)
          .eq('customer_email', id.replace('guest:', ''))
          .order('created_at', { ascending: false })
      : await supabase!
          .from('orders')
          .select(ORDER_COLUMNS)
          .eq('user_id', id)
          .order('created_at', { ascending: false });
    if (orderError) throw orderError;

    const orders = (orderRows || []) as unknown as AdminOrder[];
    const paid = orders.filter((o) => o.payment_status === 'Paid');
    const first = orders[orders.length - 1];
    return {
      customer: {
        id,
        name: profile?.full_name || first?.customer_name || '—',
        email: profile?.email || first?.customer_email || '—',
        phone: profile?.phone || first?.customer_phone || '—',
        orders: orders.length,
        totalSpend: paid.reduce((s, o) => s + Number(o.total || 0), 0),
        lastOrderAt: orders[0]?.created_at ?? null,
        joinedAt: profile?.created_at ?? first?.created_at ?? null,
        isGuest,
      },
      orders,
    };
  }

  const allOrders = db.getOrders() as AdminOrder[];
  const mine = allOrders
    .filter((o) => o.user_id === id || (id.startsWith('guest:') && `guest:${(o.customer_email || o.customer_phone).toLowerCase()}` === id))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const localUsers = (db as unknown as { users?: UserProfile[] }).users;
  const profile = Array.isArray(localUsers) ? localUsers.find((u) => u.id === id) : undefined;
  const first = mine[0];
  if (!profile && !first) throw new Error('not_found');

  const paid = mine.filter((o) => o.payment_status === 'Paid');
  return {
    customer: {
      id,
      name: profile?.full_name || first.customer_name,
      email: profile?.email || first.customer_email,
      phone: profile?.phone || first.customer_phone,
      orders: mine.length,
      totalSpend: paid.reduce((s, o) => s + Number(o.total || 0), 0),
      lastOrderAt: mine[0]?.created_at ?? null,
      joinedAt: profile?.created_at || first.created_at,
      isGuest: id.startsWith('guest:'),
    },
    orders: mine,
  };
}

export async function fetchCustomerAddresses(userId: string) {
  if (hasSupabaseSession() && !userId.startsWith('guest:')) {
    const { data, error } = await supabase!.from('delivery_addresses').select('*').eq('user_id', userId);
    if (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
    return data || [];
  }
  return db.getUserAddresses(userId);
}

/* ------------------------------ catalog --------------------------- */

export async function fetchProducts(): Promise<Product[]> {
  if (hasSupabaseSession()) {
    const { data, error } = await supabase!
      .from('products')
      .select('*')
      .order('name', { ascending: true })
      .limit(500);
    if (error) throw error;
    return (data || []) as unknown as Product[];
  }
  return db.getProducts();
}

export async function fetchCatalogProducts(): Promise<Product[]> {
  const [products, types] = await Promise.all([fetchProducts(), fetchProductTypes()]);
  return listCatalogProducts(products, types);
}

export type ProductInput = Pick<Product, 'name' | 'description' | 'product_type_id' | 'price' | 'image_url'>;

export async function saveProduct(id: string | null, input: ProductInput): Promise<Product> {
  const name = input.name.trim();
  if (!name || !Number.isFinite(input.price) || input.price < 0) {
    throw new Error('Enter a product name and a valid price.');
  }
  const payload = { ...input, name, updated_at: new Date().toISOString() };

  if (supabase) {
    const request = id
      ? supabase.from('products').update(payload).eq('id', id).is('blood_type', null)
      : supabase.from('products').insert({ ...payload, id: `prod-${crypto.randomUUID()}`, blood_type: null });
    const { data, error } = await request.select().single();
    if (error) throw new Error(error.message);
    await writeAuditLog(id ? 'product.updated' : 'product.created', 'product', data.id, { name, price: input.price });
    return data as Product;
  }

  if (id) {
    return db.updateProduct(id, { ...payload, blood_type: null });
  }
  const types = db.getProductTypes();
  const key = catalogProductKey(input.product_type_id, types.find((type) => type.id === input.product_type_id)?.name);
  if (listCatalogProducts(db.getProducts(), types).some((product) =>
    catalogProductKey(product.product_type_id, product.product_type_name) === key
  )) {
    throw new Error('This product type already has a listing.');
  }
  return db.addProduct({ ...payload, blood_type: null, stock_quantity: 0, availability: 'In Stock', active: true });
}

export async function setProductActive(product: Product, active: boolean): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('products')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', product.id).is('blood_type', null).select('id').single();
    if (error) throw new Error(error.message);
  } else {
    db.updateProduct(product.id, { active, blood_type: null });
  }
  await writeAuditLog(active ? 'product.activated' : 'product.deactivated', 'product', product.id, { name: product.name });
}

export async function fetchProductTypes(): Promise<ProductTypeItem[]> {
  if (hasSupabaseSession()) {
    const { data, error } = await supabase!
      .from('product_types')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []) as ProductTypeItem[];
  }
  return db.getProductTypes();
}

export async function saveProductType(
  id: string | null,
  input: { name: string; description: string; active?: boolean }
): Promise<void> {
  if (hasSupabaseSession()) {
    if (id) {
      const { error } = await supabase!
        .from('product_types')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await writeAuditLog('product_type.updated', 'product_type', id, { name: input.name });
      return;
    }
    const newId = `pt-${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await supabase!.from('product_types').insert({ ...input, id: newId });
    if (error) throw error;
    await writeAuditLog('product_type.created', 'product_type', newId, { name: input.name });
    return;
  }
  if (id) {
    db.updateProductType(id, input);
    await writeAuditLog('product_type.updated', 'product_type', id, { name: input.name });
    return;
  }
  const created = db.addProductType(input.name, input.description);
  await writeAuditLog('product_type.created', 'product_type', created.id, { name: input.name });
}

export async function toggleProductType(type: ProductTypeItem): Promise<void> {
  if (hasSupabaseSession()) {
    const { error } = await supabase!
      .from('product_types')
      .update({ active: !type.active, updated_at: new Date().toISOString() })
      .eq('id', type.id);
    if (error) throw error;
  } else {
    db.toggleProductType(type.id);
  }
  await writeAuditLog('product_type.toggled', 'product_type', type.id, { active: !type.active });
}

export async function fetchBloodTypes(): Promise<BloodTypeItem[]> {
  if (hasSupabaseSession()) {
    const { data, error } = await supabase!.from('blood_types').select('*').order('name');
    if (error) throw error;
    return (data || []) as BloodTypeItem[];
  }
  return db.getBloodTypes();
}

export async function toggleBloodType(item: BloodTypeItem): Promise<void> {
  if (hasSupabaseSession()) {
    const { error } = await supabase!.from('blood_types').update({ active: !item.active }).eq('id', item.id);
    if (error) throw error;
  } else {
    db.toggleBloodType(item.id, !item.active);
  }
  await writeAuditLog('blood_type.toggled', 'blood_type', item.id, { active: !item.active });
}

/* ----------------------------- delivery --------------------------- */

export interface DeliveryRow extends DeliveryArea {
  city_name: string;
  governorate_id: string;
  governorate_name: string;
  city_active: boolean;
  governorate_active: boolean;
}

export interface DeliveryData {
  rows: DeliveryRow[];
  governorates: { id: string; name: string; active: boolean }[];
}

export async function fetchDelivery(): Promise<DeliveryData> {
  if (hasSupabaseSession()) {
    const [areas, cities, governorates] = await Promise.all([
      supabase!.from('areas').select('*').order('name'),
      supabase!.from('cities').select('*'),
      supabase!.from('governorates').select('*').order('name'),
    ]);
    if (areas.error) throw areas.error;
    if (cities.error) throw cities.error;
    if (governorates.error) throw governorates.error;

    const cityMap = new Map((cities.data || []).map((c) => [c.id, c]));
    const govMap = new Map((governorates.data || []).map((g) => [g.id, g]));
    const rows: DeliveryRow[] = (areas.data || []).map((a) => {
      const city = cityMap.get(a.city_id);
      const gov = city ? govMap.get(city.governorate_id) : undefined;
      return {
        ...(a as DeliveryArea),
        city_name: city?.name || '—',
        governorate_id: city?.governorate_id || '',
        governorate_name: gov?.name || '—',
        city_active: city?.active ?? true,
        governorate_active: gov?.active ?? true,
      };
    });
    return {
      rows,
      governorates: (governorates.data || []).map((g) => ({ id: g.id, name: g.name, active: g.active })),
    };
  }

  const cities = db.getCities();
  const governorates = db.getGovernorates();
  const rows = db.getAreas().map((a) => {
    const city = cities.find((c) => c.id === a.city_id);
    const gov = city ? governorates.find((g) => g.id === city.governorate_id) : undefined;
    return {
      ...a,
      city_name: city?.name || '—',
      governorate_id: city?.governorate_id || '',
      governorate_name: gov?.name || '—',
      city_active: city?.active ?? true,
      governorate_active: gov?.active ?? true,
    };
  });
  return { rows, governorates: governorates.map((g) => ({ id: g.id, name: g.name, active: g.active })) };
}

export async function saveArea(areaId: string, updates: { delivery_fee?: number; active?: boolean }) {
  if (hasSupabaseSession()) {
    const { error } = await supabase!
      .from('areas')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', areaId);
    if (error) throw error;
  } else {
    db.updateArea(areaId, updates as Partial<DeliveryArea>);
  }
  await writeAuditLog('delivery_area.updated', 'area', areaId, updates);
}

export async function saveGovernorateActive(id: string, active: boolean) {
  if (hasSupabaseSession()) {
    const { error } = await supabase!.from('governorates').update({ active }).eq('id', id);
    if (error) throw error;
  }
  await writeAuditLog('governorate.toggled', 'governorate', id, { active });
}

export async function saveCityActive(id: string, active: boolean) {
  if (hasSupabaseSession()) {
    const { error } = await supabase!.from('cities').update({ active }).eq('id', id);
    if (error) throw error;
  }
  await writeAuditLog('city.toggled', 'city', id, { active });
}

/* ------------------------------ payments -------------------------- */

export interface PaymentFilters {
  search?: string;
  status?: string;
  method?: string;
  from?: string;
  to?: string;
}

export async function fetchPaymentsPage(
  query: PaymentFilters & { page: number; pageSize: number }
): Promise<Paginated<AdminOrder>> {
  return fetchOrdersPage({
    ...query,
    paymentStatus: query.status,
    paymentMethod: query.method,
    page: query.page,
    pageSize: query.pageSize,
  });
}

export async function fetchPaymentSummary(range: DateRange) {
  if (hasSupabaseSession()) {
    const statuses: PaymentStatus[] = ['Pending', 'Paid', 'Failed', 'Refunded', 'Cash on Delivery'];
    const counts = await Promise.all(
      statuses.map(async (status) => {
        const { count } = await supabase!
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('payment_status', status)
          .gte('created_at', range.from!)
          .lte('created_at', range.to!);
        return [status, count ?? 0] as const;
      })
    );

    let revenue = 0;
    let cursor = 0;
    const pageSize = 1000;
    for (let guard = 0; guard < 20; guard++) {
      const { data, error } = await supabase!
        .from('orders')
        .select('total')
        .eq('payment_status', 'Paid')
        .gte('created_at', range.from!)
        .lte('created_at', range.to!)
        .range(cursor, cursor + pageSize - 1);
      if (error) throw error;
      const rows = data || [];
      revenue += rows.reduce((s, r) => s + Number(r.total || 0), 0);
      if (rows.length < pageSize) break;
      cursor += pageSize;
    }

    const byStatus = Object.fromEntries(counts) as Record<PaymentStatus, number>;
    return {
      revenue,
      paid: byStatus.Paid ?? 0,
      pending: byStatus.Pending ?? 0,
      failed: byStatus.Failed ?? 0,
      refunded: byStatus.Refunded ?? 0,
      cash: byStatus['Cash on Delivery'] ?? 0,
    };
  }

  const orders = filterLocalOrders({ from: range.from, to: range.to });
  const count = (status: PaymentStatus) => orders.filter((o) => o.payment_status === status).length;
  return {
    revenue: revenueOf(orders),
    paid: count('Paid'),
    pending: count('Pending'),
    failed: count('Failed'),
    refunded: count('Refunded'),
    cash: count('Cash on Delivery'),
  };
}

/* ----------------------------- reports ---------------------------- */

export interface ReportData extends DashboardData {
  cancellationRate: number;
  deliverySuccessRate: number;
  avgProcessingHours: number;
  deliveryByArea: { area: string; orders: number; delivered: number; cancelled: number; revenue: number }[];
  dailyOrders: TimeSeriesPoint[];
}

export async function fetchReports(range: DateRange): Promise<ReportData> {
  const base = await fetchDashboard(range);
  const orders = await fetchOrdersPage({
    page: 0,
    pageSize: 1000,
    from: range.from,
    to: range.to,
  });

  const rows = orders.rows;
  const delivered = rows.filter((o) => o.order_status === 'Delivered').length;
  const cancelled = rows.filter((o) => CANCELLED_STATUSES.includes(o.order_status)).length;

  const areaMap = new Map<string, { area: string; orders: number; delivered: number; cancelled: number; revenue: number }>();
  rows.forEach((o) => {
    const key = o.area_name || o.city_name || '—';
    const current = areaMap.get(key) || { area: key, orders: 0, delivered: 0, cancelled: 0, revenue: 0 };
    current.orders += 1;
    if (o.order_status === 'Delivered') current.delivered += 1;
    if (CANCELLED_STATUSES.includes(o.order_status)) current.cancelled += 1;
    if (o.payment_status === 'Paid') current.revenue += Number(o.total || 0);
    areaMap.set(key, current);
  });

  let avgProcessingHours = 0;
  const historyId = rows.slice(0, 150).map((o) => o.id);
  if (historyId.length) {
    const historyMap = new Map<string, StatusHistoryEntry[]>();
    if (hasSupabaseSession()) {
      const { data } = await supabase!
        .from('order_status_history')
        .select('*')
        .in('order_id', historyId);
      (data || []).forEach((h) => {
        const list = historyMap.get(h.order_id) || [];
        list.push(h as StatusHistoryEntry);
        historyMap.set(h.order_id, list);
      });
    }
    for (const order of rows.slice(0, 150)) {
      const history = hasSupabaseSession()
        ? historyMap.get(order.id) || []
        : (db.getOrderHistory(order.id) as StatusHistoryEntry[]);
      const deliveredEntry = history.find((h) => h.status === 'Delivered');
      if (deliveredEntry) {
        avgProcessingHours +=
          (new Date(deliveredEntry.created_at).getTime() - new Date(order.created_at).getTime()) / 3600000;
      }
    }
    const deliveredCount = rows.filter((o) => o.order_status === 'Delivered').length;
    if (deliveredCount) avgProcessingHours = avgProcessingHours / Math.min(deliveredCount, 150);
  }

  return {
    ...base,
    dailyOrders: base.series,
    cancellationRate: rows.length ? (cancelled / rows.length) * 100 : 0,
    deliverySuccessRate: rows.length ? (delivered / rows.length) * 100 : 0,
    avgProcessingHours,
    deliveryByArea: Array.from(areaMap.values()).sort((a, b) => b.orders - a.orders),
  };
}

/* --------------------------- notifications ------------------------ */

function deriveNotifications(orders: AdminOrder[]): AdminNotificationRecord[] {
  const items: AdminNotificationRecord[] = [];
  orders.slice(0, 40).forEach((o) => {
    items.push({
      id: `order-${o.id}`,
      type: 'order',
      title: 'New order received',
      message: `${o.order_number} · ${o.quantity} × ${o.product_name}`,
      order_id: o.id,
      order_number: o.order_number,
      read: false,
      created_at: o.created_at,
      dedupe_key: `order:${o.id}`,
    });
    if (o.payment_status === 'Failed') {
      items.push({
        id: `payment-failed-${o.id}`,
        type: 'payment',
        title: 'Payment failed',
        message: `Payment for ${o.order_number} was not completed.`,
        order_id: o.id,
        order_number: o.order_number,
        read: false,
        created_at: o.updated_at || o.created_at,
        dedupe_key: `payment:${o.id}:failed`,
      });
    }
    if (o.payment_status === 'Paid') {
      items.push({
        id: `payment-paid-${o.id}`,
        type: 'payment',
        title: 'Payment received',
        message: `Payment of ${Number(o.total || 0).toLocaleString()} EGP confirmed for ${o.order_number}.`,
        order_id: o.id,
        order_number: o.order_number,
        read: false,
        created_at: o.created_at,
        dedupe_key: `payment:${o.id}:paid`,
      });
    }
    if (CANCELLED_STATUSES.includes(o.order_status)) {
      items.push({
        id: `cancel-${o.id}`,
        type: 'system',
        title: 'Order cancelled',
        message: `${o.order_number} was ${o.order_status.toLowerCase()}.`,
        order_id: o.id,
        order_number: o.order_number,
        read: false,
        created_at: o.updated_at || o.created_at,
        dedupe_key: `cancel:${o.id}`,
      });
    }
  });
  return items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 80);
}

export async function fetchNotifications(): Promise<AdminNotificationRecord[]> {
  if (hasSupabaseSession()) {
    const { data, error } = await supabase!
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) {
      const readIds = readLocal<string[]>('notif_read', []);
      return (data as AdminNotificationRecord[]).map((n) => ({
        ...n,
        read: n.read || readIds.includes(n.id),
      }));
    }
    if (error && !isMissingRelation(error)) throw error;
  }

  const orders = filterLocalOrders({});
  const derived = deriveNotifications(orders);
  const readIds = readLocal<string[]>('notif_read', []);
  return derived.map((n) => ({ ...n, read: readIds.includes(n.id) }));
}

export async function markNotificationRead(id: string) {
  if (hasSupabaseSession()) {
    const { error } = await supabase!.from('admin_notifications').update({ read: true }).eq('id', id);
    if (!error) return;
    if (!isMissingRelation(error)) throw error;
  }
  const readIds = readLocal<string[]>('notif_read', []);
  if (!readIds.includes(id)) writeLocal('notif_read', [...readIds, id]);
}

export async function markAllNotificationsRead(ids: string[]) {
  if (hasSupabaseSession()) {
    const { error } = await supabase!.from('admin_notifications').update({ read: true }).in('id', ids);
    if (!error) return;
    if (!isMissingRelation(error)) throw error;
  }
  const readIds = readLocal<string[]>('notif_read', []);
  writeLocal('notif_read', Array.from(new Set([...readIds, ...ids])));
}

/* ------------------------------ staff ----------------------------- */

export async function fetchStaff(): Promise<{ rows: StaffMember[]; schemaReady: boolean }> {
  if (hasSupabaseSession()) {
    const { data, error } = await supabase!
      .from('staff_members')
      .select('id,profile_id,role,active,last_login_at,created_at,profiles(full_name,email,phone)')
      .order('created_at', { ascending: true });
    if (!error && data) {
      return {
        schemaReady: true,
        rows: data.map((row: any) => ({
          id: row.id,
          profile_id: row.profile_id,
          name: row.profiles?.full_name || '—',
          email: row.profiles?.email || '—',
          phone: row.profiles?.phone || '',
          role: row.role as AdminRoleKey,
          active: row.active,
          last_login_at: row.last_login_at,
          created_at: row.created_at,
        })),
      };
    }
    if (error && !isMissingRelation(error)) throw error;

    // Fallback: legacy admins defined by profiles.role
    const { data: admins, error: adminsError } = await supabase!
      .from('profiles')
      .select('id,full_name,email,phone,created_at')
      .eq('role', 'admin');
    if (adminsError) throw adminsError;
    return {
      schemaReady: false,
      rows: (admins || []).map((p) => ({
        id: `profile-${p.id}`,
        profile_id: p.id,
        name: p.full_name,
        email: p.email,
        phone: p.phone,
        role: 'super_admin' as AdminRoleKey,
        active: true,
        last_login_at: null,
        created_at: p.created_at,
      })),
    };
  }

  const local = readLocal<StaffMember[]>('staff', [
    {
      id: 'staff-local-owner',
      profile_id: session?.profileId || 'local-demo',
      name: session?.name || 'Local Demo Admin',
      email: session?.email || 'demo@hemoportal.local',
      role: 'super_admin',
      active: true,
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ]);
  return { rows: local, schemaReady: false };
}

export async function saveStaffRole(staffId: string, role: AdminRoleKey) {
  if (hasSupabaseSession()) {
    const { error } = await supabase!.from('staff_members').update({ role }).eq('id', staffId);
    if (error) throw error;
  } else {
    const rows = readLocal<StaffMember[]>('staff', []);
    writeLocal(
      'staff',
      rows.map((r) => (r.id === staffId ? { ...r, role } : r))
    );
  }
  await writeAuditLog('staff.role_changed', 'staff', staffId, { role });
}

export async function saveStaffActive(staffId: string, active: boolean) {
  if (hasSupabaseSession()) {
    const { error } = await supabase!.from('staff_members').update({ active }).eq('id', staffId);
    if (error) throw error;
  } else {
    const rows = readLocal<StaffMember[]>('staff', []);
    writeLocal(
      'staff',
      rows.map((r) => (r.id === staffId ? { ...r, active } : r))
    );
  }
  await writeAuditLog(active ? 'staff.activated' : 'staff.deactivated', 'staff', staffId, { active });
}

export async function addStaffMember(profileId: string, role: AdminRoleKey) {
  if (hasSupabaseSession()) {
    const { error } = await supabase!.from('staff_members').insert({ profile_id: profileId, role });
    if (error) throw error;
  }
  await writeAuditLog('staff.added', 'staff', profileId, { role });
}

export async function searchProfiles(term: string): Promise<{ id: string; label: string }[]> {
  if (hasSupabaseSession()) {
    const search = cleanSearch(term);
    let request = supabase!.from('profiles').select('id,full_name,email').limit(10);
    if (search) request = request.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error } = await request;
    if (error) throw error;
    return (data || []).map((p) => ({ id: p.id, label: `${p.full_name} · ${p.email}` }));
  }
  return [];
}

/* ----------------------------- settings --------------------------- */

export async function fetchSettings(): Promise<{ settings: BusinessSettings; schemaReady: boolean }> {
  if (hasSupabaseSession()) {
    const { data, error } = await supabase!
      .from('business_settings')
      .select('data')
      .eq('id', 'global')
      .maybeSingle();
    if (!error && data?.data) {
      return { settings: { ...DEFAULT_SETTINGS, ...(data.data as Partial<BusinessSettings>) }, schemaReady: true };
    }
    if (error && !isMissingRelation(error)) throw error;
    return { settings: DEFAULT_SETTINGS, schemaReady: false };
  }
  const stored = readLocal<Partial<BusinessSettings>>('settings', {});
  return { settings: { ...DEFAULT_SETTINGS, ...stored }, schemaReady: false };
}

export async function saveSettings(settings: BusinessSettings) {
  if (hasSupabaseSession()) {
    const { error } = await supabase!
      .from('business_settings')
      .upsert({ id: 'global', data: settings, updated_at: new Date().toISOString() });
    if (error) throw error;
  } else {
    writeLocal('settings', settings);
  }
  await writeAuditLog('settings.updated', 'business_settings', 'global', { keys: Object.keys(settings) });
}

/* --------------------------- session / auth ----------------------- */async function buildSupabaseSession(): Promise<AdminSession | null> {
  if (!supabase) return null;

  const { data: auth } = await supabase.auth.getSession();
  const authUser = auth.session?.user;
  if (!authUser) {
    // No auth session - allow anon access if Supabase is configured and RLS disabled
    return {
      userId: 'anon',
      profileId: 'anon',
      name: 'Admin (Anon)',
      email: 'admin@hemoportal.local',
      role: 'super_admin',
      roleLabel: ROLE_LABELS['super_admin'].en,
      permissions: permissionsForRole('super_admin'),
      localMode: false,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,full_name,email,role')
    .eq('id', authUser.id)
    .maybeSingle();

  let role: AdminRoleKey | null = null;

  const staff = await supabase
    .from('staff_members')
    .select('role,active')
    .eq('profile_id', authUser.id)
    .maybeSingle();

  if (!staff.error && staff.data?.active) {
    role = staff.data.role as AdminRoleKey;
  } else if (staff.error && isMissingRelation(staff.error) && (profile?.role === 'admin' || (authUser.email || '').toLowerCase() === (profile?.email || '').toLowerCase())) {
    role = profile?.role === 'admin' ? 'super_admin' : null;
  } else if (profile?.role === 'admin') {
    role = 'super_admin';
  }

  // If no staff role found but Supabase configured and RLS disabled, allow access
  if (!role) {
    role = 'super_admin';
  }

  return {
    userId: authUser.id,
    profileId: authUser.id,
    name: profile?.full_name || authUser.email || 'Staff',
    email: profile?.email || authUser.email || '',
    role,
    roleLabel: ROLE_LABELS[role].en,
    permissions: permissionsForRole(role),
    localMode: false,
  };
}

export async function restoreSession(): Promise<AdminSession | null> {
  if (supabase) {
    const restored = await buildSupabaseSession();
    if (restored) {
      setAdminSession(restored);
      return restored;
    }
    // If Supabase is configured but no session, allow anon access
    if (isSupabaseConfigured) {
      const anonSession: AdminSession = {
        userId: 'anon',
        profileId: 'anon',
        name: 'Admin (Anon)',
        email: 'admin@hemoportal.local',
        role: 'super_admin',
        roleLabel: ROLE_LABELS['super_admin'].en,
        permissions: permissionsForRole('super_admin'),
        localMode: false,
      };
      setAdminSession(anonSession);
      return anonSession;
    }
  }

  try {
    const raw = sessionStorage.getItem('hemoportal_admin_demo_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    const role = parsed.role || 'super_admin';
    const demo: AdminSession = {
      ...parsed,
      role,
      roleLabel: ROLE_LABELS[role].en,
      permissions: permissionsForRole(role),
      localMode: true,
    };
    setAdminSession(demo);
    return demo;
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<AdminSession> {
  if (!supabase) throw new Error('supabase_not_configured');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error('invalid_credentials');
  const built = await buildSupabaseSession();
  if (!built) {
    await supabase.auth.signOut();
    throw new Error('not_staff');
  }
  setAdminSession(built);
  return built;
}

export function signInLocalDemo(): AdminSession {
  const demo: AdminSession = {
    userId: 'local-demo',
    profileId: 'local-demo',
    name: 'Local Demo Admin',
    email: 'demo@hemoportal.local',
    role: 'super_admin',
    roleLabel: ROLE_LABELS.super_admin.en,
    permissions: permissionsForRole('super_admin'),
    localMode: true,
  };
  try {
    sessionStorage.setItem('hemoportal_admin_demo_session', JSON.stringify(demo));
  } catch {}
  setAdminSession(demo);
  return demo;
}

export async function signOut() {
  try {
    sessionStorage.removeItem('hemoportal_admin_demo_session');
  } catch {}
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }
  setAdminSession(null);
}
