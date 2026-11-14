import React from 'react';
import {
  Droplet,
  FlaskConical,
  Activity,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  PhoneCall,
  CheckCircle2,
  Info,
  ChevronRight,
  ChevronLeft,
  HeartPulse,
  Layers,
  Boxes,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ProductCategoryKey } from '../types';

interface SelectProductPageProps {
  onSelectCategory: (category: ProductCategoryKey) => void;
  onBackHome: () => void;
}

interface ProductCardDef {
  key: ProductCategoryKey;
  titleAr: string;
  titleEn: string;
  badgeAr: string;
  badgeEn: string;
  descAr: string;
  descEn: string;
  typesAr: string[];
  typesEn: string[];
  tempAr: string;
  tempEn: string;
  dispatchAr: string;
  dispatchEn: string;
  themeColor: 'red' | 'amber' | 'blue' | 'purple';
}

export const SelectProductPage: React.FC<SelectProductPageProps> = ({
  onSelectCategory,
  onBackHome,
}) => {
  const { language, isRTL } = useLanguage();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const BackChevron = isRTL ? ChevronRight : ChevronLeft;

  const PRODUCT_CARDS: ProductCardDef[] = [
    {
      key: 'blood-bag',
      titleAr: 'كيس دم',
      titleEn: 'Blood Bag',
      badgeAr: 'كرات دم حمراء مركزة • فصائل ABO/Rh',
      badgeEn: 'Concentrated Erythrocytes • ABO/Rh Matched',
      descAr:
        'وحدات كرات الدم الحمراء المركزة (PRBC)، دم مفلتر، ودم مشعع لتعويض النزيف الحاد في العمليات الجراحية، الحوادث، وحالات الأنيميا الحرجة.',
      descEn:
        'Concentrated red blood cell units (PRBC), Filtered Blood, and Irradiated Blood for acute blood loss, surgery, trauma, and severe anemia.',
      typesAr: ['دم مكدس (Packed RBC)', 'دم مفلتر', 'دم مشع (Irradiated)'],
      typesEn: ['Packed RBC', 'Filtered Blood', 'Irradiated Blood'],
      tempAr: 'حفظ مبرد (2°–6° مئوية)',
      tempEn: 'Cold-chain storage (2°C–6°C)',
      dispatchAr: 'بحث وتنسيق فوري مدار 24 ساعة',
      dispatchEn: '24/7 Rapid Search & Dispatch',
      themeColor: 'red',
    },
    {
      key: 'plasma',
      titleAr: 'بلازما مجمدة',
      titleEn: 'Plasma',
      badgeAr: 'بلازما مجمدة • فصائل  (A, B, AB, O)',
      badgeEn: 'Fresh Frozen Plasma •  Groups (A, B, AB, O)',
      descAr:
        'وحدات بلازما مجمدة (FFP) غنية بجميع عوامل التجلط والفيبرينوجين والألبومين لعلاج نزيف أمراض الكبد ونقص التخثر والنزيف الحاد.',
      descEn:
        'Fresh Frozen Plasma (FFP) units rich in all coagulation factors, fibrinogen, and albumin for clotting deficiencies, trauma hemorrhage, and liver disease.',
      typesAr: [
        'بلازما مجمدة حديثة (FFP)',
      ],
      typesEn: ['Frozen Plasma (FP)'],
      tempAr: 'محفوظ في درجة حرارة -18 مئوية',
      tempEn: 'Stored at -18°C',
      dispatchAr: 'إذابة طبية سريعة بحمام مائي معتمد',
      dispatchEn: 'Rapid clinical waterbath thawing',
      themeColor: 'amber',
    },
    {
      key: 'platelets',
      titleAr: 'صفائح دموية',
      titleEn: 'Blood Platelets',
      badgeAr: 'صفائح دم • فصائل  (A, B, AB, O)',
      badgeEn: 'Platelets (Thrombocytes) • Groups (A, B, AB, O)',
      descAr:
        'وحدات صفائح دموية أحادية المتبرع بالأفيريسيس (SDP) وعادية مجمعة (RDP) لعلاج نقص الصفائح الحرج ودعم مرضى الأورام وجراحات القلب.',
      descEn:
        'Single-Donor Apheresis Platelets (SDP) and Random Donor Platelet Concentrates (RDP) for critical thrombocytopenia, oncology chemotherapy support, and surgical hemostasis.',
      typesAr: [
        'صفائح دم (Single-Donor SDP)',
        'صفائح دم عادية (Random Donor RDP)',
      ],
      typesEn: ['Single-Donor (SDP)', 'Random Donor (RDP)'],
      tempAr: 'حفظ مستمر بالحضانة والرجاج (20°–24° مئوية)',
      tempEn: 'Continuous agitation storage (20°C–24°C)',
      dispatchAr: 'تنسيق طارئ نظراً لصلاحية 5 أيام فقط',
      dispatchEn: 'Priority dispatch (5-day viability shelf-life)',
      themeColor: 'purple',
    },
    {
      key: 'other-products',
      titleAr: 'منتجات أخرى',
      titleEn: 'Other Products',
      badgeAr: 'مشتقات حيوية • Cryo & IVIG',
      badgeEn: 'Specialized Biologics • Cryo & IVIG',
      descAr:
        'مشتقات دم ومستحضرات حيوية متخصصة تشمل الراسب القري Cryoprecipitate (cryo) والغلوبولين المناعي الوريدي Intravenous immunoglobulin (IVIG).',
      descEn:
        'Specialized blood derivatives and biologics including Cryoprecipitate (cryo) and Intravenous immunoglobulin (IVIG).',
      typesAr: [
        'راسب قري Cryoprecipitate (cryo)',
        'غلوبولين مناعي وريدي (IVIG)',
      ],
      typesEn: [
        'Cryoprecipitate (cryo)',
        'Intravenous immunoglobulin (IVIG)',
      ],
      tempAr: 'حفظ وتخزين سريري معتمد',
      tempEn: 'Certified clinical storage',
      dispatchAr: 'صرف وتوريد فوري معتمد',
      dispatchEn: 'Accredited clinical dispatch',
      themeColor: 'blue',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            id="back-to-home-btn"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl transition shadow-2xs"
          >
            <BackChevron className="w-4 h-4" />
            <span>{language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
            <HeartPulse className="w-3.5 h-3.5 text-red-600" />
            <span>{language === 'ar' ? 'بوابة الطلبات الطبية المعتمدة' : 'Clinical Requisition Gateway'}</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {language === 'ar'
              ? 'اختر نوع الخدمة أو المنتج الطبي المطلوب'
              : 'Select Required Medical Service or Product'}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {language === 'ar'
              ? 'حدد نوع المنتج  للمتابعة.'
              : 'Choose the medical product to continue.'}
          </p>
        </div>

        {/* Main Product Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {PRODUCT_CARDS.map((card) => {
            const isRed = card.themeColor === 'red';
            const isAmber = card.themeColor === 'amber';
            const isBlue = card.themeColor === 'blue';
            const isPurple = card.themeColor === 'purple';

            const cardBorder = isRed
              ? 'border-red-200 hover:border-red-400 hover:shadow-red-500/10'
              : isAmber
              ? 'border-amber-200 hover:border-amber-400 hover:shadow-amber-500/10'
              : isBlue
              ? 'border-blue-200 hover:border-blue-400 hover:shadow-blue-500/10'
              : 'border-purple-200 hover:border-purple-400 hover:shadow-purple-500/15 hover:ring-2 hover:ring-purple-400/20';

            const iconBg = isRed
              ? 'bg-red-50 text-red-600 border-red-200'
              : isAmber
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : isBlue
              ? 'bg-blue-50 text-blue-600 border-blue-200'
              : 'bg-purple-50 text-purple-700 border-purple-200';

            const badgeBg = isRed
              ? 'bg-red-50 text-red-700 border-red-200'
              : isAmber
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : isBlue
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-purple-50 text-purple-800 border-purple-200';

            const buttonStyle = isRed
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
              : isAmber
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
              : isBlue
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30 hover:shadow-purple-600/50';

            const IconComponent =
              card.key === 'blood-bag'
                ? Droplet
                : card.key === 'plasma'
                ? FlaskConical
                : card.key === 'platelets'
                ? Layers
                : card.key === 'other-products'
                ? Boxes
                : Activity;

            return (
              <div
                key={card.key}
                id={`product-card-${card.key}`}
                className={`bg-white rounded-2xl border-2 p-6 sm:p-7 transition-all duration-200 shadow-sm hover:shadow-lg flex flex-col justify-between ${cardBorder}`}
              >
                <div>
                  {/* Top Header & Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${iconBg}`}
                      >
                        <IconComponent className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900">
                          {language === 'ar' ? card.titleAr : card.titleEn}
                        </h2>
                        <span
                          className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border mt-1 ${badgeBg}`}
                        >
                          {language === 'ar' ? card.badgeAr : card.badgeEn}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-products / types pills */}
                  {card.typesAr && card.typesAr.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {language === 'ar' ? 'المنتجات المشمولة:' : 'Includes:'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(language === 'ar' ? card.typesAr : card.typesEn).map((typeName, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/90 text-slate-700"
                          >
                            {typeName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Button */}
                <div className="pt-6 mt-4 border-t border-slate-100">
                  <button
                    id={`select-product-btn-${card.key}`}
                    onClick={() => onSelectCategory(card.key)}
                    className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${buttonStyle}`}
                  >
                    <span>
                      {language === 'ar'
                        ? card.key === 'phlebotomy'
                          ? 'الاتصال لحجز فصد علاجي'
                          : `متابعة طلب ${card.titleAr}`
                        : card.key === 'phlebotomy'
                        ? 'Call Us to Book Phlebotomy'
                        : `Continue Requisition: ${card.titleEn}`}
                    </span>
                    {card.key === 'phlebotomy' ? (
                      <PhoneCall className="w-4 h-4" />
                    ) : (
                      <ArrowIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Emergency Assistance Strip */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <strong className="text-white text-base sm:text-lg font-black">
                {language === 'ar'
                  ? 'هل تحتاج استشارة طبية عاجلة لتحديد نوع المنتج المناسب للمريض؟'
                  : 'Need immediate medical guidance to choose the right product?'}
              </strong>
            </div>
            <p className="text-xs text-slate-300">
              {language === 'ar'
                ? ' متواجد على مدار 24 ساعة لمساعدتك في مطابقة فصيلة الدم والصفائح والبلازما والتنسيق الفوري مع بنوك الدم.'
                : 'Our clinical operations team is available 24/7 to guide blood matching, FFP, platelets, and emergency hospital dispatch.'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <a
              id="select-product-emergency-call-btn"
              href="tel:+201015570651"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-xl shadow-lg shadow-red-900/40 transition whitespace-nowrap"
            >
              <PhoneCall className="w-4 h-4" />
              <span dir="ltr">+20 101 557 0651</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
