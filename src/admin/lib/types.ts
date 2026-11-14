import type { Order, PaymentStatus, OrderStatus } from '../../types';

export type AdminRoleKey =
  | 'super_admin'
  | 'operations_manager'
  | 'order_manager'
  | 'product_manager'
  | 'finance'
  | 'viewer';

export type Permission =
  | 'orders.read'
  | 'orders.write'
  | 'orders.cancel'
  | 'customers.read'
  | 'customers.write'
  | 'products.read'
  | 'products.write'
  | 'catalog.read'
  | 'catalog.write'
  | 'delivery.read'
  | 'delivery.write'
  | 'payments.read'
  | 'payments.refund'
  | 'reports.read'
  | 'notifications.read'
  | 'staff.read'
  | 'staff.write'
  | 'settings.read'
  | 'settings.write'
  | 'audit.read';

export interface AdminSession {
  userId: string;
  profileId: string;
  name: string;
  email: string;
  role: AdminRoleKey;
  roleLabel: string;
  permissions: Permission[];
  /** true when running against the seeded local dataset instead of Supabase */
  localMode: boolean;
}

export interface AdminOrder extends Order {
  paymob_transaction_id?: string | null;
  paymob_order_id?: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export type RangePreset = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';

export interface DashboardMetrics {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  revenue: number;
  paidOrders: number;
  unpaidOrders: number;
  averageOrderValue: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface TimeSeriesPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface StatusBreakdownItem {
  status: OrderStatus;
  count: number;
}

export interface TopProductRow {
  name: string;
  quantity: number;
  orders: number;
  revenue: number;
}

export interface BloodTypeDemandRow {
  bloodType: string;
  orders: number;
  quantity: number;
}

export interface AreaDemandRow {
  area: string;
  orders: number;
  revenue: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  series: TimeSeriesPoint[];
  statusBreakdown: StatusBreakdownItem[];
  recentOrders: AdminOrder[];
  topProducts: TopProductRow[];
  bloodTypeDemand: BloodTypeDemandRow[];
  areaDemand: AreaDemandRow[];
}

export interface AdminNotificationRecord {
  id: string;
  type: 'order' | 'payment' | 'system' | 'inventory';
  title: string;
  message: string;
  order_id?: string | null;
  order_number?: string | null;
  read: boolean;
  created_at: string;
  dedupe_key?: string | null;
}

export interface StaffMember {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminRoleKey;
  active: boolean;
  last_login_at?: string | null;
  created_at: string;
}

export interface BusinessSettings {
  business_name: string;
  support_phone: string;
  support_email: string;
  address: string;
  order_prefix: string;
  min_order_quantity: number;
  max_order_quantity: number;
  default_delivery_fee: number;
  free_delivery_threshold: number;
  require_verification: boolean;
  notification_new_order: boolean;
  notification_payment_failed: boolean;
  notification_low_stock: boolean;
  low_stock_threshold: number;
  currency: string;
}

export interface AuditLogEntry {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export type OrderWithPayment = AdminOrder & { payment_status: PaymentStatus };

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'Order Received',
  'Pending Verification',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
];
