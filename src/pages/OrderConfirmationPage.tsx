import React from 'react';
import { Order } from '../types';
import {
  CheckCircle,
  FileCheck,
  MapPin,
  Calendar,
  User,
  HeartPulse,
  CreditCard,
  Printer,
  ArrowRight,
  Package,
  ShieldCheck,
  PhoneCall,
  Home,
} from 'lucide-react';
import { OrderStatusBadge } from '../components/common/OrderStatusBadge';
import { useLanguage } from '../i18n/LanguageContext';

interface OrderConfirmationPageProps {
  order: Order;
  onTrackOrder?: (orderNumber: string) => void;
  onViewAccountOrders: () => void;
  onReturnHome: () => void;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  order,
  onViewAccountOrders,
  onReturnHome,
}) => {
  const { language, t, isRTL } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-left rtl:text-right">
      {/* Success banner */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <CheckCircle className="w-9 h-9 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('confirmationTitle')}
        </h1>
        <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
          {t('confirmationSubtitle')}
        </p>
      </div>

      {/* Order Reference Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 print:shadow-none print:border">
        {/* Card Header with Status */}
        <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'ar' ? 'المرجع الطبي المعتمد للطلب' : 'Official Medical Order Reference'}
            </span>
            <div className="text-2xl font-mono font-black text-white mt-0.5" dir="ltr">
              {order.order_number}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {t('orderStatusLabel')}
            </span>
            <OrderStatusBadge status={order.order_status} size="lg" />
          </div>
        </div>

        {/* Clinical Product & Patient Section */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {language === 'ar' ? ' بيانات المريض' : 'patient\'s information'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 block mb-0.5">
                {language === 'ar' ? 'فصيلة الدم' : 'Blood Type'}
              </span>
              <span className="text-base font-black text-red-700" dir="ltr">
                {order.blood_type}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 block mb-0.5">
                {language === 'ar' ? 'نوع المنتج / الخدمة' : 'Product / Category'}
              </span>
              <span className="text-sm font-bold text-slate-800">
                {order.product_category === 'plasma'
                  ? language === 'ar' ? 'بلازما (Plasma)' : 'Plasma'
                  : order.product_category === 'phlebotomy'
                  ? language === 'ar' ? 'فصد علاجي' : 'Phlebotomy'
                  : order.product_category === 'platelets'
                  ? language === 'ar' ? 'صفائح دموية' : 'Platelets'
                  : order.product_category === 'other-products'
                  ? language === 'ar' ? 'منتجات أخرى' : 'Other Products'
                  : language === 'ar' && order.product_type_name === 'Stack Blood'
                  ? 'أكياس دم مكدسة'
                  : language === 'ar' && order.product_type_name === 'Radiant'
                  ? 'وحدات دم مشععة'
                  : order.product_type_name}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 block mb-0.5">
                {language === 'ar' ? 'عمر المريض' : 'Patient Age'}
              </span>
              <span className="text-sm font-bold text-slate-800">
                {language === 'ar' ? `${order.patient_age} سنة` : `${order.patient_age} Years`}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 block mb-0.5">
                {language === 'ar' ? 'الكمية' : 'Quantity'}
              </span>
              <span className="text-sm font-bold text-slate-800">
                {order.quantity}{' '}
                {order.product_category === 'phlebotomy'
                  ? language === 'ar' ? 'جلسة' : 'Session(s)'
                  : order.product_category === 'blood-bag'
                  ? language === 'ar' ? 'أكياس' : 'Bag(s)'
                  : language === 'ar' ? 'وحدات' : 'Unit(s)'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-slate-500 text-xs block">
              {language === 'ar' ? 'منتج الدم المحدد:' : 'Blood Product Item:'}
            </span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{order.product_name}</div>
            {(order.patient_name || order.hospital_name || order.department) && (
              <div className="flex flex-wrap gap-2 text-xs text-slate-700 bg-slate-100 p-2.5 rounded-lg border border-slate-200 mt-2">
                {order.patient_name && (
                  <span>
                    <strong>{language === 'ar' ? 'المريض:' : 'Patient:'}</strong> {order.patient_name}
                  </span>
                )}
                {order.hospital_name && (
                  <span>
                    <strong>{language === 'ar' ? 'المستشفى:' : 'Hospital:'}</strong> {order.hospital_name}
                  </span>
                )}
                {order.department && (
                  <span>
                    <strong>{language === 'ar' ? 'القسم:' : 'Dept:'}</strong> {order.department}
                  </span>
                )}
              </div>
            )}
            {order.notes && (
              <p className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60 mt-2">
                <strong>{language === 'ar' ? 'ملاحظات:' : 'Notes:'}</strong> {order.notes}
              </p>
            )}
          </div>
        </div>

        {/* Delivery Location Section */}
        <div className="p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {language === 'ar' ? 'موقع التسليم ومسار التبريد' : 'Delivery Location & Cold-Chain Route'}
          </h3>
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900">
                {order.area_name}, {order.city_name} ({order.governorate_name})
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {order.delivery_address}
                {order.delivery_building && ` • ${order.delivery_building}`}
                {order.delivery_apartment && ` • ${order.delivery_apartment}`}
                {order.delivery_floor && ` • ${order.delivery_floor}`}
              </div>
              {order.delivery_landmark && (
                <div className="text-xs text-slate-500 mt-0.5">
                  {language === 'ar' ? 'علامة مميزة:' : 'Landmark:'} {order.delivery_landmark}
                </div>
              )}
              <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1">
                <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {language === 'ar' ? 'هاتف الاستلام:' : 'Contact Phone:'}{' '}
                  <span dir="ltr">{order.delivery_phone}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Invoice Breakdown */}
        <div className="p-6 space-y-3 bg-slate-50/60">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{language === 'ar' ? 'طريقة الدفع:' : 'Payment Method:'}</span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              {order.payment_method === 'Cash on Delivery'
                ? language === 'ar'
                  ? 'الدفع عند الاستلام'
                  : 'Cash on Delivery'
                : language === 'ar'
                ? 'دفع إلكتروني'
                : 'Online Payment'}{' '}
              ({order.payment_status})
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              {language === 'ar'
                ? `المجموع الفرعي (${order.quantity} وحدات @ ${order.unit_price} ج.م):`
                : `Subtotal (${order.quantity} units @ EGP ${order.unit_price}):`}
            </span>
            <span className="font-semibold text-slate-900">
              {language === 'ar' ? `${order.subtotal.toLocaleString()} ج.م` : `EGP ${order.subtotal.toLocaleString()}`}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              {language === 'ar'
                ? `رسوم النقل المبرد (${order.area_name}):`
                : `Cold-Chain Delivery Fee (${order.area_name}):`}
            </span>
            <span className="font-semibold text-slate-900">
              {language === 'ar' ? `${order.delivery_fee} ج.م` : `EGP ${order.delivery_fee}`}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between font-extrabold text-slate-900 text-lg">
            <span>{language === 'ar' ? 'الإجمالي النهائي:' : 'Total:'}</span>
            <span className="text-red-700 font-black">
              {language === 'ar' ? `${order.total.toLocaleString()} ج.م` : `EGP ${order.total.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
        <button
          id="btn-view-order-conf"
          onClick={onViewAccountOrders}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
        >
          <User className="w-4 h-4" />
          <span>{t('myAccountOrders')}</span>
        </button>

        <button
          onClick={handlePrint}
          className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm"
          title="Print official requisition slip"
        >
          <Printer className="w-4 h-4" />
          <span>{language === 'ar' ? 'طباعة الإيصال' : 'Print Slip'}</span>
        </button>

        <button
          onClick={onReturnHome}
          className="w-full sm:w-auto text-slate-500 hover:text-slate-800 font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-1.5 text-sm"
        >
          <Home className="w-4 h-4" />
          <span>{t('backToHome')}</span>
        </button>
      </div>
    </div>
  );
};
