import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  PhoneCall,
  MapPin,
  Calendar,
  AlertCircle,
  XCircle,
  PauseCircle,
  ArrowRight,
} from 'lucide-react';
import { db } from '../services/db';
import { Order, OrderStatus, OrderStatusHistoryItem } from '../types';
import { OrderStatusBadge } from '../components/common/OrderStatusBadge';
import { useLanguage } from '../i18n/LanguageContext';

interface OrderTrackingPageProps {
  initialOrderNumber?: string;
  onNavigateOrder?: () => void;
}

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({
  initialOrderNumber = '',
  onNavigateOrder,
}) => {
  const { language, t, isRTL } = useLanguage();
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderStatusHistoryItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Timeline standard stages
  const standardStages: { key: OrderStatus; labelEn: string; labelAr: string }[] = [
    { key: 'Order Received', labelEn: 'Order Received', labelAr: 'استلام الطلب' },
    { key: 'Verification', labelEn: 'Verification', labelAr: 'التحقق الطبي' },
    { key: 'Confirmed', labelEn: 'Confirmed', labelAr: 'الاعتماد' },
    { key: 'Preparing', labelEn: 'Preparing', labelAr: 'تجهيز الدم' },
    { key: 'Out for Delivery', labelEn: 'Out for Delivery', labelAr: 'النقل المبرد' },
    { key: 'Delivered', labelEn: 'Delivered', labelAr: 'تم التسليم' },
  ];

  useEffect(() => {
    if (initialOrderNumber) {
      setOrderNumber(initialOrderNumber);
      // Auto-fetch if exact match exists
      const found = db.getOrderById(initialOrderNumber);
      if (found) {
        setOrder(found);
        setPhone(found.delivery_phone || found.customer_phone);
        setHistory(db.getOrderHistory(found.id));
        setSearched(true);
      }
    }
  }, [initialOrderNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearched(true);

    if (!orderNumber.trim()) {
      setSearchError(
        language === 'ar'
          ? 'يرجى إدخال الرقم المرجعي للطلب.'
          : 'Please enter your Order Reference Number.'
      );
      setOrder(null);
      return;
    }

    if (!phone.trim()) {
      const foundById = db.getOrderById(orderNumber.trim());
      if (foundById) {
        setOrder(foundById);
        setHistory(db.getOrderHistory(foundById.id));
        return;
      }
      setSearchError(
        language === 'ar'
          ? 'يرجى إدخال رقم الهاتف المرتبط بالطلب.'
          : 'Please enter the contact telephone number associated with this order.'
      );
      setOrder(null);
      return;
    }

    const found = db.getOrderByNumberAndPhone(orderNumber.trim(), phone.trim());
    if (found) {
      setOrder(found);
      setHistory(db.getOrderHistory(found.id));
    } else {
      setOrder(null);
      setSearchError(
        language === 'ar'
          ? 'لم يتم العثور على طلب مطابق للرقم المرجعي ورقم الهاتف المدخلين.'
          : 'No matching blood product order found with the provided reference number and phone.'
      );
    }
  };

  const getStageIndex = (status: OrderStatus) => {
    return standardStages.findIndex((s) => s.key === status);
  };

  const currentStageIndex = order ? getStageIndex(order.order_status) : -1;
  const isSpecialStatus =
    order &&
    ['Pending Verification', 'On Hold', 'Cancelled', 'Rejected'].includes(order.order_status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-left rtl:text-right">
      {/* Title & Lookup Box */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold uppercase tracking-wider">
          <Truck className="w-3.5 h-3.5" />
          <span>
            {language === 'ar' ? 'التتبع الحي للنقل المبرد' : 'Real-Time Cold-Chain Tracking'}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('trackingTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          {t('trackingSubtitle')}
        </p>
      </div>

      {/* Tracking Search Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('lookupOrderNumber')} <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Package
                className={`w-4 h-4 text-slate-400 absolute top-3 ${
                  isRTL ? 'right-3.5' : 'left-3.5'
                }`}
              />
              <input
                id="track-order-number-input"
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. BB-20260910-0012"
                className={`w-full py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600/30 font-mono uppercase ${
                  isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'
                }`}
                dir="ltr"
              />
            </div>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('lookupPhone')} <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <PhoneCall
                className={`w-4 h-4 text-slate-400 absolute top-3 ${
                  isRTL ? 'right-3.5' : 'left-3.5'
                }`}
              />
              <input
                id="track-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 112 345 6789"
                className={`w-full py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600/30 ${
                  isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'
                }`}
                dir="ltr"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              id="track-submit-btn"
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-sm"
            >
              <Search className="w-4 h-4" />
              <span>{t('trackBtn')}</span>
            </button>
          </div>
        </form>

        {/* Quick helper for testers */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold">
            {language === 'ar' ? 'طلبات تجريبية سريعة:' : 'Quick Sample Orders:'}
          </span>
          <button
            type="button"
            onClick={() => {
              setOrderNumber('BB-20260910-0012');
              setPhone('+20 112 345 6789');
            }}
            className="text-red-600 hover:underline font-mono"
            dir="ltr"
          >
            BB-20260910-0012
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setOrderNumber('BB-20260911-0003');
              setPhone('+20 112 345 6789');
            }}
            className="text-red-600 hover:underline font-mono"
            dir="ltr"
          >
            BB-20260911-0003
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setOrderNumber('BB-20260911-0008');
              setPhone('+20 112 345 6789');
            }}
            className="text-red-600 hover:underline font-mono"
            dir="ltr"
          >
            BB-20260911-0008
          </button>
        </div>
      </div>

      {searchError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* TRACKING RESULTS */}
      {order && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 animate-in fade-in">
          {/* Header Banner */}
          <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xl font-black font-mono tracking-tight text-white"
                  dir="ltr"
                >
                  #{order.order_number}
                </span>
                <span
                  className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded"
                  dir="ltr"
                >
                  {order.blood_type}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {language === 'ar'
                  ? `${order.quantity} أكياس من ${order.product_name}`
                  : `${order.quantity} Bag(s) of ${order.product_name} • ${order.product_type_name}`}
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {t('orderStatusLabel')}
              </span>
              <OrderStatusBadge status={order.order_status} size="lg" />
            </div>
          </div>

          {/* Cold-chain Telemetry Box */}
          <div className="p-4 bg-cyan-50/50 border-b border-cyan-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-cyan-950">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-100 text-cyan-700 shrink-0">
                <Thermometer className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="font-extrabold block text-sm">
                  {language === 'ar'
                    ? 'مراقبة سلسلة التبريد: 3.4° مئوية (نطاق آمن ومثالي)'
                    : 'Cold-Chain Monitor: 3.4°C (Optimal Safe Zone)'}
                </span>
                <span className="text-[11px] text-cyan-800">
                  {language === 'ar'
                    ? 'أجهزة استشعار بلوتوث وGSM مستمرة معايرة لنطاق 2° - 6° مئوية.'
                    : 'Continuous Bluetooth & GSM data logger calibrated to 2°C – 6°C range.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold bg-white/80 px-3 py-1.5 rounded-lg border border-cyan-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {language === 'ar' ? 'معتمد وفق معايير منظمة الصحة العالمية' : 'WHO Standards Certified'}
              </span>
            </div>
          </div>

          {/* STANDARD 6-STEP TIMELINE */}
          <div className="p-6 sm:p-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
              {language === 'ar' ? 'الجدول الزمني للتحقق والنقل' : 'Dispatch & Fulfillment Timeline'}
            </h3>

            {/* Special status callout if on hold, cancelled, or rejected */}
            {isSpecialStatus && (
              <div
                className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${
                  order.order_status === 'On Hold'
                    ? 'bg-orange-50 border-orange-200 text-orange-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {order.order_status === 'On Hold' ? (
                  <PauseCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold">
                    {language === 'ar' ? `إشعار سريري خاص: ${order.order_status}` : `Special Clinical Notice: ${order.order_status}`}
                  </h4>
                  <p className="mt-0.5 leading-relaxed">
                    {order.order_status === 'On Hold'
                      ? language === 'ar'
                        ? 'هذا الطلب يتطلب موافقة طبية إضافية أو تدقيق إضافي للأجسام المضادة قبل الإفراج عنه.'
                        : 'This order requires additional clinical authorization or laboratory antibody clarification before release.'
                      : language === 'ar'
                      ? 'تم إنهاء هذا الطلب أو رفضه التزاماً ببروتوكولات سلامة بنك الدم.'
                      : 'This order request has been terminated or rejected in accordance with blood-bank safety protocols.'}
                  </p>
                </div>
              </div>
            )}

            {/* Visual timeline steps */}
            <div className="relative">
              {/* Desktop Stepper */}
              <div className="hidden sm:grid grid-cols-6 gap-2 text-center relative z-10">
                {standardStages.map((stage, idx) => {
                  const isDone = currentStageIndex >= idx;
                  const isCurrent = currentStageIndex === idx;

                  return (
                    <div key={stage.key} className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                          isDone
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[11px] font-bold leading-tight ${
                          isCurrent
                            ? 'text-red-700'
                            : isDone
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {language === 'ar' ? stage.labelAr : stage.labelEn}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Connecting line */}
              <div className="hidden sm:block absolute top-4.5 left-8 right-8 h-0.5 bg-slate-200 -z-0" />
              {currentStageIndex >= 0 && (
                <div
                  className={`hidden sm:block absolute top-4.5 h-0.5 bg-red-600 -z-0 transition-all duration-300 ${
                    isRTL ? 'right-8' : 'left-8'
                  }`}
                  style={{
                    width: `${Math.min(100, (currentStageIndex / (standardStages.length - 1)) * 100)}%`,
                  }}
                />
              )}

              {/* Mobile Timeline Vertical */}
              <div className="sm:hidden space-y-4">
                {standardStages.map((stage, idx) => {
                  const isDone = currentStageIndex >= idx;
                  const isCurrent = currentStageIndex === idx;

                  return (
                    <div key={stage.key} className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isDone ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-xs font-bold ${
                            isCurrent ? 'text-red-700' : isDone ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {language === 'ar' ? stage.labelAr : stage.labelEn}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Audit History Logs */}
          <div className="p-6 bg-slate-50/70 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {language === 'ar' ? 'سجل التدقيق والمتابعة الطبية' : 'Detailed Audit & Verification Log'}
            </h3>
            <div className="space-y-2 text-xs">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={h.status} size="sm" />
                      <span className="text-[11px] text-slate-400 font-medium">
                        {language === 'ar'
                          ? `بواسطة ${h.created_by || 'النظام المركزي'}`
                          : `by ${h.created_by || 'System'}`}
                      </span>
                    </div>
                    {h.notes && <p className="text-slate-700 pt-1">{h.notes}</p>}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono" dir="ltr">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Requester Summary */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                {language === 'ar' ? 'موقع التسليم' : 'Delivery Location'}
              </span>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-600" />
                <span>
                  {order.area_name}, {order.city_name}
                </span>
              </div>
              {(order.hospital_name || order.department) && (
                <p className="text-xs font-semibold text-slate-800 mt-0.5">
                  {order.hospital_name} {order.department && `• ${order.department}`}
                </p>
              )}
              {order.patient_name && (
                <p className="text-xs text-slate-600">
                  {language === 'ar' ? 'المريض: ' : 'Patient: '}
                  <strong>{order.patient_name}</strong> ({order.patient_age} {language === 'ar' ? 'سنة' : 'yrs'})
                </p>
              )}
              <p className="text-slate-600 mt-1">
                {order.delivery_address} {order.delivery_building && `• ${order.delivery_building}`}
              </p>
              <p className="text-slate-500 mt-0.5">
                {language === 'ar' ? 'هاتف التواصل: ' : 'Contact: '}
                <span dir="ltr">{order.delivery_phone}</span>
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                {language === 'ar' ? 'بيانات مقدم الطلب والدفع' : 'Requester & Payment'}
              </span>
              <div className="font-bold text-slate-900 text-sm">
                {order.customer_name} (<span dir="ltr">{order.customer_phone}</span>)
              </div>
              <p className="text-slate-600 mt-1">
                {language === 'ar' ? 'طريقة الدفع: ' : 'Payment: '}
                <strong>
                  {order.payment_method === 'Cash on Delivery'
                    ? language === 'ar'
                      ? 'الدفع عند الاستلام'
                      : 'Cash on Delivery'
                    : language === 'ar'
                    ? 'دفع إلكتروني'
                    : 'Online Payment'}
                </strong>{' '}
                ({order.payment_status})
              </p>
              <p className="text-slate-900 font-extrabold text-sm mt-1">
                {language === 'ar' ? 'إجمالي الفاتورة: ' : 'Total Invoice: '}
                <span className="text-red-700">
                  {language === 'ar'
                    ? `${order.total.toLocaleString()} ج.م`
                    : `EGP ${order.total.toLocaleString()}`}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
