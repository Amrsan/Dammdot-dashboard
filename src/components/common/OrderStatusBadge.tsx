import React from 'react';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  Package,
  Truck,
  AlertTriangle,
  XCircle,
  PauseCircle,
  FileSearch,
} from 'lucide-react';
import { OrderStatus } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusArabicMap: Record<string, string> = {
  'Order Received': 'تم استلام الطلب',
  'Verification': 'قيد التحقق الطبي',
  'Pending Verification': 'في انتظار التحقق',
  'Confirmed': 'تم الاعتماد',
  'Preparing': 'تجهيز وفحص الدم',
  'Out for Delivery': 'جاري النقل المبرد',
  'Delivered': 'تم التسليم بنجاح',
  'On Hold': 'معلّق للفحص الإضافي',
  'Cancelled': 'ملغي',
  'Rejected': 'مرفوض طبياً',
};

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, size = 'md' }) => {
  const { language } = useLanguage();

  const getStyle = () => {
    switch (status) {
      case 'Order Received':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Clock,
          dot: 'bg-blue-500',
        };
      case 'Verification':
      case 'Pending Verification':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: FileSearch,
          dot: 'bg-amber-500',
        };
      case 'Confirmed':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
          dot: 'bg-emerald-500',
        };
      case 'Preparing':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          icon: Package,
          dot: 'bg-indigo-500',
        };
      case 'Out for Delivery':
        return {
          bg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          icon: Truck,
          dot: 'bg-cyan-500 animate-pulse',
        };
      case 'Delivered':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          icon: ShieldCheck,
          dot: 'bg-teal-500',
        };
      case 'On Hold':
        return {
          bg: 'bg-orange-50 text-orange-800 border-orange-200',
          icon: PauseCircle,
          dot: 'bg-orange-500',
        };
      case 'Cancelled':
      case 'Rejected':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: XCircle,
          dot: 'bg-rose-500',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-800 border-slate-200',
          icon: AlertTriangle,
          dot: 'bg-slate-500',
        };
    }
  };

  const { bg, icon: Icon, dot } = getStyle();

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const label = language === 'ar' && statusArabicMap[status] ? statusArabicMap[status] : status;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${bg} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      <Icon className={`${iconSizes[size]} shrink-0`} />
      <span>{label}</span>
    </span>
  );
};
