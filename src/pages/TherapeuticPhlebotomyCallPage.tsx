import React from 'react';
import {
  PhoneCall,
  Phone,
  MessageCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Activity,
  HeartPulse,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Building2,
  Stethoscope,
  Info,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface TherapeuticPhlebotomyCallPageProps {
  onBackToProducts: () => void;
  onBackToHome: () => void;
}

export const TherapeuticPhlebotomyCallPage: React.FC<TherapeuticPhlebotomyCallPageProps> = ({
  onBackToProducts,
  onBackToHome,
}) => {
  const { language, isRTL } = useLanguage();
  const ArrowBackIcon = isRTL ? ArrowRight : ArrowLeft;

  const HOTLINE_NUMBER = '+201015570651';
  const DISPLAY_HOTLINE = '+20 101 557 0651';
  const DISPLAY_HOTLINE_LOCAL = '01015570651';

  const WHATSAPP_URL = `https://wa.me/201015570651?text=${encodeURIComponent(
    language === 'ar'
      ? 'مرحباً، أود الاستفسار والتنسيق لحجز جلسة فصد علاجي (Therapeutic Phlebotomy) لمريض.'
      : 'Hello, I would like to coordinate and book a Therapeutic Phlebotomy clinical session for a patient.'
  )}`;

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Navigation & Header Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <button
            id="phlebotomy-back-btn"
            onClick={onBackToProducts}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-red-700 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <ArrowBackIcon className="w-4 h-4" />
            <span>
              {language === 'ar' ? 'الرجوع لاختيار المنتجات' : 'Back to Products'}
            </span>
          </button>

          <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
            {language === 'ar' ? 'حجز هاتفي وسريري فقط' : 'Phone Booking Only'}
          </span>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50 via-red-50 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none -mr-20 -mt-20" />

          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-lg shadow-xs">
                {language === 'ar' ? 'إجراء طبي وتداخلي' : 'Clinical Medical Procedure'}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {language === 'ar' ? 'الخط الطبي متاح 24/7' : 'Clinical Desk 24/7 Active'}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {language === 'ar'
                  ? 'حجز جلسات الفصد العلاجي (Therapeutic Phlebotomy)'
                  : 'Therapeutic Phlebotomy Clinical Coordination'}
              </h1>
              <p className="text-slate-600 text-sm sm:text-base mt-2.5 leading-relaxed max-w-2xl">
                {language === 'ar'
                  ? 'نظراً لأن الفصد العلاجي هو إجراء طبي تداخلي يتم تحت إشراف طبي متخصص ولا يخضع لنظام التوصيل الإلكتروني، يتم التنسيق وحجز المواعيد حصرياً عبر الاتصال المباشر بفريقنا الطبي السريري.'
                  : 'Because Therapeutic Phlebotomy is a supervised interventional medical procedure requiring doctor protocol review and vital sign monitoring, booking is handled exclusively via direct phone consultation.'}
              </p>
            </div>

            {/* Calling Hero Box */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-wider">
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>
                      {language === 'ar'
                        ? 'الخط الساخن المباشر لحجز مواعيد الفصد'
                        : 'Direct Phlebotomy Scheduling Hotline'}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                    <span dir="ltr">{DISPLAY_HOTLINE}</span>
                    <span className="text-xs sm:text-sm font-normal text-slate-400">
                      ({DISPLAY_HOTLINE_LOCAL})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {language === 'ar'
                      ? 'متاح على مدار الساعة للإجابة على الاستفسارات وتحديد الموعد والمكان المناسب.'
                      : 'Available 24 hours / 7 days for clinical triage, inquiries, and schedule slots.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                  <a
                    id="phlebotomy-direct-call-hero-btn"
                    href={`tel:${HOTLINE_NUMBER}`}
                    className="inline-flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black text-sm sm:text-base px-6 py-4 rounded-xl shadow-lg shadow-red-900/40 transition hover:shadow-xl"
                  >
                    <PhoneCall className="w-5 h-5" />
                    <span>{language === 'ar' ? 'اتصل بنا الآن مباشرة' : 'Call Clinical Desk Now'}</span>
                  </a>

                  <a
                    id="phlebotomy-whatsapp-btn"
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md transition hover:scale-[1.01]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {language === 'ar' ? 'تنسيق عبر واتساب (مرفقات التحاليل)' : 'WhatsApp Coordination'}
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* Why Call Us Note */}
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-950 space-y-1">
                <strong className="font-extrabold block">
                  {language === 'ar'
                    ? 'لماذا لا يمكن إتمام طلب الفصد العلاجي إلكترونياً كأكياس الدم؟'
                    : 'Why can Therapeutic Phlebotomy only be arranged via phone?'}
                </strong>
                <p className="text-amber-900/90 leading-relaxed text-xs">
                  {language === 'ar'
                    ? 'الفصد العلاجي ليس منتجاً يُسلّم، بل هو خدمة سحب سريرية لعلاج حالات مثل كثرة كريات الدم الحمراء (Polycythemia) أو ترسب الحديد (Hemochromatosis). تتطلب سلامة المريض مراجعة الطبيب لنسبة الهيماتوكريت (Hematocrit) وضغط الدم وتقدير كمية السحب (350 إلى 500 مل) وتأمين تعويض المحاليل الملحية الوريدية.'
                    : 'Unlike blood units, Therapeutic Phlebotomy is an in-person clinical procedure. Patient safety requires reviewing hematocrit/ferritin values, assessing blood pressure, confirming required draw volume (350-500ml), and preparing concurrent I.V. normal saline resuscitation.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What to prepare before calling */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {language === 'ar'
                  ? 'المستندات المطلوبة لتحضيرها قبل الاتصال'
                  : 'Clinical Prerequisites to Prepare Before Calling'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? 'لتسريع تحديد الموعد والموافقة الطبية الفورية'
                  : 'To expedite clinical evaluation and slot allocation'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {language === 'ar' ? '1. تقرير أو روشتة الطبيب المعالج' : '1. Physician Prescription / Protocol'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'طلب معتمد يوضح تشخيص الحالة، الكمية المحددة للسحب (عادة 450 مل ± 10%) ونسبة الهيماتوكريت أو الفيريتين المستهدفة.'
                  : 'Prescription detailing diagnosis, target hematocrit or ferritin level, and prescribed blood evacuation volume (usually 450ml).'}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {language === 'ar' ? '2. صورة دم كاملة حديثة (CBC)' : '2. Recent Complete Blood Count (CBC)'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'تحليل دم كامل حديث (لا يتعدى 48–72 ساعة) يوضح مستوى الهيموجلوبين (Hb) والهيماتوكريت (HCT) الحاليين.'
                  : 'Recent laboratory CBC (within 48-72 hours) displaying current baseline Hemoglobin (Hb) and Hematocrit (HCT) percentages.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {language === 'ar' ? '3. قياس العلامات الحيوية' : '3. Patient Vital Signs & History'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'معلومات عن ضغط الدم ومستوى النبض، وأي تاريخ مرضي للقلب أو الأوعية الدموية أو نوبات إغماء سابقة أثناء سحب الدم.'
                  : 'Information regarding patient blood pressure, pulse, history of cardiovascular conditions or vasovagal reactions.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {language === 'ar' ? '4. تحديد المكان المفضل للجلسة' : '4. In-Clinic or Mobile Execution'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'إمكانية تنفيذ الجلسة في عيادات ومراكز الدم المعتمدة لدينا أو طلب فريق تمريض سريري مجهز للمنزل.'
                  : 'Sessions can be arranged at certified hematology blood facilities or coordinated for specialized home clinical nursing visits.'}
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Indications & Protocols */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {language === 'ar'
                  ? 'دواعي إجراء الفصد العلاجي المعتمدة'
                  : 'Recognized Clinical Indications for Therapeutic Phlebotomy'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? 'تطبق البروتوكولات وفقاً للمعايير الطبية لسلامة نقل وسحب الدم'
                  : 'Managed under strict clinical hematology protocols'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h3 className="font-extrabold text-sm text-slate-900 mb-1">
                {language === 'ar' ? 'داء كثرة الحمر الحقيقية' : 'Polycythemia Vera'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'تخفيض نسبة الهيماتوكريت إلى أقل من 45% للوقاية من التخثر والجلطات الدماغية والقلبية.'
                  : 'Maintaining target HCT < 45% to prevent thrombosis, stroke, and cardiovascular hyperviscosity events.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h3 className="font-extrabold text-sm text-slate-900 mb-1">
                {language === 'ar' ? 'داء ترسب الحديد' : 'Hemochromatosis'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'استنزاف مخزون الحديد الزائد بالجسم ومنع تراكمه التدميري في الكبد والقلب والبنكرياس.'
                  : 'Serial iron depletion protocols to lower toxic serum ferritin levels and protect organs.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h3 className="font-extrabold text-sm text-slate-900 mb-1">
                {language === 'ar' ? 'كثرة الحمر الثانوية' : 'Secondary Erythrocytosis'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'المرضى الذين يعانون من فرط لزوجة الدم المصاحبة لأمراض الرئة المزمنة أو نقص الأكسجة.'
                  : 'Alleviating hyperviscosity and cerebral sluggishness in patients with high RBC mass.'}
              </p>
            </div>
          </div>
        </div>

        {/* Safety & Protocol Assurances */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {language === 'ar' ? 'معايير الأمان والرعاية الطبية' : 'Patient Safety Standards'}
              </h2>
              <p className="text-xs text-slate-300">
                {language === 'ar'
                  ? 'جلسات سحب آمنة بأيدي طواقم تمريض سريرية معتمدة'
                  : 'Administered solely by certified hematology clinical nurses'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
              <span className="font-bold text-white block">
                {language === 'ar' ? 'حقائب سحب معقمة' : 'Single-Use Sterile Kits'}
              </span>
              <span className="text-slate-400">
                {language === 'ar'
                  ? 'أدوات وحقائب معقمة وحيدة الاستخدام ذات جودة طبية فائقة'
                  : 'Certified pyrogen-free blood bags and collection sets'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
              <span className="font-bold text-white block">
                {language === 'ar' ? 'تعويض المحاليل الملحية' : 'I.V. Fluid Replacement'}
              </span>
              <span className="text-slate-400">
                {language === 'ar'
                  ? 'محلول ملحي وريدي 0.9% لمنع انخفاض الضغط الحاد والهبوط'
                  : 'Normal saline fluid resuscitation to ensure hemodynamic stability'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
              <span className="font-bold text-white block">
                {language === 'ar' ? 'مراقبة العلامات الحيوية' : 'Continuous Vital Monitoring'}
              </span>
              <span className="text-slate-400">
                {language === 'ar'
                  ? 'فحص الضغط والنبض قبل وأثناء وبعد انتهاء الجلسة'
                  : 'Pre, intra, and post-session vital signs tracking'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
              <span className="font-bold text-white block">
                {language === 'ar' ? 'التخلص الطبي الآمن' : 'Safe Biohazard Disposal'}
              </span>
              <span className="text-slate-400">
                {language === 'ar'
                  ? 'إعدام طبي معتمد وفقاً لاشتراطات وزارة الصحة'
                  : 'Strict biohazard disposal in accordance with MOH regulations'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom CTA & Return Options */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md text-center space-y-6">
          <h3 className="text-xl font-black text-slate-900">
            {language === 'ar'
              ? 'هل أنت مستعد للتنسيق أو حجز موعد؟'
              : 'Ready to Coordinate or Schedule a Phlebotomy Session?'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            {language === 'ar'
              ? 'اتصل بالخط الساخن المباشر وسيقوم فريق العمليات السريرية بترتيب كل التفاصيل والإجابة على أي استفسارات تخص المريض.'
              : 'Call our hotline directly and our clinical coordination team will arrange all scheduling and answer any patient questions.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              id="phlebotomy-bottom-call-btn"
              href={`tel:${HOTLINE_NUMBER}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black text-base px-8 py-4 rounded-xl shadow-lg shadow-red-900/40 transition"
            >
              <PhoneCall className="w-5 h-5" />
              <span>{language === 'ar' ? 'اتصل الآن: ' : 'Call Now: '}</span>
              <span dir="ltr">{DISPLAY_HOTLINE}</span>
            </a>

            <button
              id="phlebotomy-return-catalog-btn"
              onClick={onBackToProducts}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm px-6 py-4 rounded-xl transition cursor-pointer"
            >
              <ArrowBackIcon className="w-4 h-4" />
              <span>
                {language === 'ar' ? 'الرجوع لاختيار فصائل وأكياس الدم' : 'Back to Blood Products'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
