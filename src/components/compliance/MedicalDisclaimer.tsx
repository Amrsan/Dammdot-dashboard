import React from 'react';
import { ShieldAlert, AlertTriangle, FileCheck, PhoneCall } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface MedicalDisclaimerProps {
  compact?: boolean;
}

export const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({ compact = false }) => {
  const { language, t, isRTL } = useLanguage();

  if (compact) {
    return (
      <div className="bg-amber-50/90 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong className="font-bold">
              {language === 'ar' ? 'إشعار تنظيمي طبي ملزم: ' : 'Regulatory Healthcare Notice: '}
            </strong>
            {language === 'ar'
              ? 'الدم ومشتقاته منتجات طبية منظمة. تتطلب الطلبات التحقق السريري، اعتماد الطبيب المعالج، وتوافر المخزون في بنك الدم قبل الصرف.'
              : 'Blood and blood products are regulated medical products. Requests require clinical verification, physician authorization, and bank availability before fulfillment.'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-red-900/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            {t('disclaimerTitle')}
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {language === 'ar' ? 'منصة طلبات الدم والرعاية الطبية المنظمة' : 'Regulated Healthcare Ordering Platform'}
          </h3>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            {t('disclaimerP1')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'إلزامية التحقق من التوافق المصلي بواسطة الطبيب المعالج'
                  : 'Attending physician cross-match verification mandatory'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'سلسلة تبريد معتمدة (مراقبة حرارية مستمرة 2° إلى 6° مئوية)'
                  : 'Cold-chain logistics (2°C–6°C continuous sensor logging)'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 shrink-0 flex flex-col gap-2 min-w-[220px]">
          <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
            {t('emergencyHotline')}
          </span>
          <a
            href="tel:+201015570651"
            className={`text-lg font-extrabold text-white flex items-center gap-2 hover:text-red-300 transition ${
              isRTL ? 'flex-row-reverse justify-end' : ''
            }`}
          >
            <PhoneCall className="w-5 h-5 text-red-400 animate-pulse" />
            <span dir="ltr">+201015570651</span>
          </a>
          <span className="text-[11px] text-slate-400">
            {language === 'ar' ? 'متاح 24/7 للحالات الجراحية والحرجة' : 'Available 24/7 for urgent clinical transfers'}
          </span>
        </div>
      </div>
    </div>
  );
};
