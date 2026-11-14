import type { AdminRoleKey, Permission } from './types';

/**
 * Role -> permission matrix. This is the single source of truth used by the UI,
 * and it mirrors the SQL function public.has_staff_permission() in
 * migrations/002_admin_dashboard.sql. The database remains authoritative:
 * every write is checked again by RLS.
 */
export const ROLE_PERMISSIONS: Record<AdminRoleKey, Permission[] | ['*']> = {
  super_admin: ['*'],
  operations_manager: [
    'orders.read',
    'orders.write',
    'orders.cancel',
    'customers.read',
    'customers.write',
    'delivery.read',
    'delivery.write',
    'reports.read',
    'notifications.read',
    'audit.read',
  ],
  order_manager: [
    'orders.read',
    'orders.write',
    'customers.read',
    'delivery.read',
    'notifications.read',
  ],
  product_manager: [
    'products.read',
    'products.write',
    'catalog.read',
    'catalog.write',
    'delivery.read',
    'notifications.read',
  ],
  finance: ['orders.read', 'payments.read', 'payments.refund', 'reports.read', 'notifications.read'],
  viewer: [
    'orders.read',
    'customers.read',
    'products.read',
    'catalog.read',
    'delivery.read',
    'payments.read',
    'reports.read',
    'notifications.read',
  ],
};

export const ROLE_LABELS: Record<AdminRoleKey, { en: string; ar: string }> = {
  super_admin: { en: 'Super Admin', ar: 'مسؤول عام' },
  operations_manager: { en: 'Operations Manager', ar: 'مدير عمليات' },
  order_manager: { en: 'Order Manager', ar: 'مدير طلبات' },
  product_manager: { en: 'Product Manager', ar: 'مدير منتجات' },
  finance: { en: 'Finance', ar: 'الشؤون المالية' },
  viewer: { en: 'Viewer', ar: 'مشاهدة فقط' },
};

export const ROLE_DESCRIPTIONS: Record<AdminRoleKey, { en: string; ar: string }> = {
  super_admin: {
    en: 'Full access to every module, staff and settings.',
    ar: 'صلاحية كاملة على كل الوحدات والموظفين والإعدادات.',
  },
  operations_manager: {
    en: 'Orders, customers, delivery configuration and reports.',
    ar: 'الطلبات والعملاء وإعدادات التوصيل والتقارير.',
  },
  order_manager: {
    en: 'Process and update orders, read customer records.',
    ar: 'معالجة وتحديث الطلبات وقراءة بيانات العملاء.',
  },
  product_manager: {
    en: 'Catalog, product types, blood types and stock levels.',
    ar: 'الكتالوج وأنواع المنتجات وفصائل الدم والمخزون.',
  },
  finance: {
    en: 'Payments, refunds and financial reports.',
    ar: 'المدفوعات والاسترداد والتقارير المالية.',
  },
  viewer: { en: 'Read-only access for auditors.', ar: 'وصول للقراءة فقط للمراجعين.' },
};

export function permissionsForRole(role: AdminRoleKey): Permission[] {
  const granted = ROLE_PERMISSIONS[role] ?? [];
  if (granted[0] === '*') {
    return [
      'orders.read',
      'orders.write',
      'orders.cancel',
      'customers.read',
      'customers.write',
      'products.read',
      'products.write',
      'catalog.read',
      'catalog.write',
      'delivery.read',
      'delivery.write',
      'payments.read',
      'payments.refund',
      'reports.read',
      'notifications.read',
      'staff.read',
      'staff.write',
      'settings.read',
      'settings.write',
      'audit.read',
    ];
  }
  return granted as Permission[];
}

export function roleCan(role: AdminRoleKey, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
