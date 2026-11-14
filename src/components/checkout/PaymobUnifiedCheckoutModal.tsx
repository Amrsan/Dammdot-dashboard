import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  CreditCard,
  Smartphone,
  Store,
  ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { paymentService, PaymobIntentionResponse } from '../../services/payment';

interface PaymobUnifiedCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentResult: {
    transactionId: string;
    method: string;
    amount: number;
    referenceNumber: string;
    timestamp: string;
  }) => void;
  orderData: {
    orderNumber: string;
    bloodType: string;
    productName: string;
    quantity: number;
    patientName: string;
    hospitalName?: string;
    governorateName: string;
    cityName: string;
    totalAmount: number;
    subtotal: number;
    deliveryFee: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    streetAddress: string;
    building?: string;
    floor?: string;
  };
}

export const PaymobUnifiedCheckoutModal: React.FC<PaymobUnifiedCheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderData,
}) => {
  const { language, isRTL } = useLanguage();
  const [isLoadingIntention, setIsLoadingIntention] = useState(true);
  const [intention, setIntention] = useState<PaymobIntentionResponse | null>(null);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize live Paymob intention
  const initializeLiveCheckout = async () => {
    setIsLoadingIntention(true);
    setErrorMessage('');
    setIsIframeLoaded(false);

    try {
      const nameParts = (orderData.customerName || '').trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || 'Medical';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Requester';
      const safePhone = (orderData.customerPhone || '+201000000000').trim();
      const safeEmail = (orderData.customerEmail || 'requisition@damdot.eg').trim();

      const res = await paymentService.createPaymobIntention({
        amount: orderData.totalAmount,
        currency: 'EGP',
        orderNumber: orderData.orderNumber,
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: safeEmail,
          phone_number: safePhone,
        },
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          email: safeEmail,
          phone_number: safePhone,
          street: (orderData.streetAddress || 'Medical Facility Road').trim(),
          building: (orderData.building || '1').trim(),
          floor: (orderData.floor || '1').trim(),
          city: (orderData.cityName || 'Cairo').trim(),
          state: (orderData.governorateName || 'Cairo').trim(),
          country: 'EG',
        },
        items: [
          {
            name: `${orderData.productName} (${orderData.bloodType}) - Requisition`,
            amount: orderData.totalAmount,
            quantity: 1,
            description: `Clinical Requisition for ${orderData.patientName} (${orderData.quantity} Units)`,
          },
        ],
      });

      setIntention(res);
    } catch (err: any) {
      console.error('[Paymob Modal] Failed to initialize live checkout:', err);
      setErrorMessage(
        err.message ||
          (language === 'ar'
            ? 'تعذر الاتصال ببوابة Paymob المعتمدة. يرجى التحقق من الاتصال وإعادة المحاولة.'
            : 'Could not connect to Paymob production gateway. Please retry.')
      );
    } finally {
      setIsLoadingIntention(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      initializeLiveCheckout();
    }
  }, [isOpen, orderData.orderNumber, orderData.totalAmount]);

  // Listen for Paymob PostMessage events
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        if (!event.origin.includes('paymob.com')) return;

        const data = event.data;
        if (
          data?.type === 'TRANSACTION_SUCCESS' ||
          data?.status === 'success' ||
          data?.success === true ||
          data?.data?.success === true
        ) {
          const txId = data?.data?.id || data?.id || `PAYMOB-LIVE-${Date.now()}`;
          onSuccess({
            transactionId: String(txId),
            method: 'Paymob Card Payment (Visa / Mastercard)',
            amount: orderData.totalAmount,
            referenceNumber: intention?.intentionId || `REF-${Date.now()}`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('[Paymob PostMessage Error]:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, intention, onSuccess, orderData.totalAmount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-fadeIn">
      <div
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-scaleUp"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between relative overflow-hidden border-b border-slate-800">
          <div className="absolute -end-10 -bottom-10 w-44 h-44 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            {/* Paymob Official Badge */}
            <div className="bg-white rounded-xl p-1.5 px-3 flex items-center gap-2 shadow-xs">
              <span className="font-black text-blue-900 text-base tracking-tight">paymob</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                Unified
              </span>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'بوابة الدفع الإلكتروني المباشرة' : 'Live Production Checkout'}</span>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>3DS Secure</span>
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                {language === 'ar'
                  ? 'الدفع الإلكتروني المعتمد لطلبات الدم عبر بوابة Paymob الموحدة'
                  : 'Certified clinical blood requisition settlement via Paymob Unified Checkout'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              id="paymob-modal-close-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ORDER REQUISITION SUMMARY STRIP */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md">
              {orderData.orderNumber}
            </span>
            <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded-md text-xs">
              {orderData.bloodType}
            </span>
            <span className="text-slate-600 truncate max-w-[160px] sm:max-w-xs font-medium">
              {orderData.patientName} • {orderData.quantity} {language === 'ar' ? 'أكياس' : 'Bags'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-black text-slate-900 text-sm sm:text-base ms-auto">
            <span className="text-xs text-slate-500 font-normal">
              {language === 'ar' ? 'المبلغ الإجمالي:' : 'Total Amount:'}
            </span>
            <span className="text-red-700 text-base sm:text-lg font-black">
              {orderData.totalAmount} EGP
            </span>
          </div>
        </div>

        {/* SECURE CHECKOUT TRUST STRIP (REPLACED AS REQUESTED) */}
        <div className="bg-slate-50/90 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-900">
              {language === 'ar'
                ? 'جلسة دفع مشفرة وآمنة بالكامل'
                : 'Secure Encrypted Payment Session'}
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-slate-500 hidden sm:inline font-medium">
              {language === 'ar'
                ? 'معتمدة ومؤمنة بالكامل لبطاقات Visa و Mastercard'
                : 'Certified 3D-Secure protection for Visa & Mastercard'}
            </span>
          </div>

          {intention?.unifiedCheckoutUrl && (
            <a
              id="paymob-open-external-tab-btn"
              href={intention.unifiedCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 shadow-2xs transition shrink-0"
            >
              <span>{language === 'ar' ? 'فتح في صفحة مستقلة' : 'Open in Full Window'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
            </a>
          )}
        </div>

        {/* MAIN CHECKOUT BODY: EMBEDDED LIVE PAYMOB CHECKOUT */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 flex flex-col min-h-[500px] sm:min-h-[640px] bg-slate-100/50">
          {/* ERROR ALERT */}
          {errorMessage && (
            <div className="p-4 mb-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={initializeLiveCheckout}
                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{language === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
              </button>
            </div>
          )}

          {/* LOADING STATE */}
          {isLoadingIntention && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {language === 'ar'
                    ? 'جاري الاتصال الآمن ببوابة Paymob المعتمدة...'
                    : 'Connecting to Paymob Live Production Gateway...'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {language === 'ar'
                    ? 'يتم تجهيز جلسة الدفع المشفرة بنظام الحماية البنكي 3D-Secure.'
                    : 'Preparing your encrypted checkout session with bank-grade 3DS security.'}
                </p>
              </div>
            </div>
          )}

          {/* LIVE IFRAME CHECKOUT */}
          {!isLoadingIntention && intention?.unifiedCheckoutUrl && (
            <div className="flex-1 flex flex-col relative w-full h-full">
              {/* Proactive Direct Open Banner for Banks with Strict 3DS Iframe Policies */}
              <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-950 mb-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold">
                    {language === 'ar'
                      ? 'يمكنك كتابة بيانات البطاقة أدناه أو فتح صفحة السداد في نافذة مستقلة لسرعة معالجة كود الأمان (OTP):'
                      : 'Enter your card below or open in a full window for fast OTP bank authorization:'}
                  </span>
                </div>
                <a
                  id="paymob-direct-tab-cta-btn"
                  href={intention.unifiedCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-lg shadow-2xs transition shrink-0 cursor-pointer"
                >
                  <span>{language === 'ar' ? 'فتح صفحة السداد المعتمدة' : 'Open Official Checkout Tab'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {!isIframeLoaded && (
                <div className="absolute inset-0 top-14 bg-white/95 backdrop-blur-2xs flex flex-col items-center justify-center z-10 rounded-2xl border border-slate-200 p-6 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                  <span className="text-sm font-bold text-slate-800">
                    {language === 'ar'
                      ? 'جاري تحميل نموذج الدفع المعتمد من Paymob...'
                      : 'Loading official Paymob payment interface...'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    {language === 'ar'
                      ? 'إذا تأخر التحميل بسبب إعدادات المتصفح، اضغط على زر فتح صفحة السداد بالأعلى'
                      : 'If loading takes longer due to browser restrictions, click "Open Official Checkout Tab" above.'}
                  </p>
                </div>
              )}

              <iframe
                id="paymob-live-checkout-iframe"
                src={intention.unifiedCheckoutUrl}
                onLoad={() => setIsIframeLoaded(true)}
                className="w-full flex-1 min-h-[520px] sm:min-h-[640px] rounded-2xl border border-slate-300 bg-white shadow-xs"
                title="Paymob Live Production Checkout"
                allow="payment *; clipboard-write *; fullscreen *"
              />
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>PCI-DSS Level 1 Compliant</span>
            </span>
            <span className="text-slate-300">•</span>
            <span>256-bit TLS Encrypted</span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="hidden sm:inline">Central Bank of Egypt Compliant</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
          >
            {language === 'ar' ? 'إلغاء والعودة' : 'Cancel & Return'}
          </button>
        </div>
      </div>
    </div>
  );
};
