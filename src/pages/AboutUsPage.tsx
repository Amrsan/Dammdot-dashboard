import React from 'react';
import {
  ShieldCheck,
  HeartPulse,
  Clock,
  PhoneCall,
  Award,
  ThermometerSnowflake,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Users,
  Building2,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { DamdotLogo } from '../components/common/DamdotLogo';

interface AboutUsPageProps {
  onOrderNow: () => void;
  onBackHome?: () => void;
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({ onOrderNow, onBackHome }) => {
  const { language, isRTL } = useLanguage();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const BackChevron = isRTL ? ChevronRight : ChevronLeft;

  const pillars = [
    {
      icon: Clock,
      titleEn: 'Rapid Active Sourcing',
      titleAr: 'بحث وتوفير فوري على مدار 24 ساعة',
      descEn:
        'When a patient needs blood, every second matters. Our specialized coordinators actively scan certified blood banks across Cairo, Giza, and all Egyptian governorates to locate compatible, cross-matched units without delay.',
      descAr:
        'عندما يحتاج المريض إلى أكياس دم، كل دقيقة تصنع فارقاً. يقوم منسقونا الطبيون بالمسح والبحث الفوري في شبكة بنوك الدم المعتمدة بالقاهرة والجيزة والمحافظات لتوفير الفصائل المطابقة وتجهيزها فوراً.',
      badgeEn: '24/7 Active',
      badgeAr: 'نشط 24/7',
    },
    {
      icon: ShieldCheck,
      titleEn: 'Strict Safety & Screening',
      titleAr: 'أمان بيولوجي وفحص مخبري شامل',
      descEn:
        'We collaborate exclusively with licensed blood banks operating under Egyptian Ministry of Health and WHO standards. Every bag is rigorously tested for infectious markers and ABO/Rh compatibility before release.',
      descAr:
        'نتعامل حصرياً مع بنوك الدم المرخصة والخاضعة لمعايير وزارة الصحة ومنظمة الصحة العالمية. تخضع كل وحدة لفحوصات مصلية دقيقة وتحاليل الأمان البيولوجي واختبارات التوافق التام قبل الصرف.',
      badgeEn: '100% Tested',
      badgeAr: 'فحص مصلّي معتمد',
    },
    {
      icon: ThermometerSnowflake,
      titleEn: 'Certified Cold-Chain Transport',
      titleAr: 'سلسلة تبريد دقيقة (2° إلى 6° مئوية)',
      descEn:
        'Blood components are delicate living biologics. Our logistics preserve strict cold-chain parameters (2°C–6°C for packed RBCs, -18°C for FFP) inside calibrated medical transit boxes to ensure cellular viability at bedside.',
      descAr:
        'مكونات الدم منتجات حيوية حساسة. نضمن الحفاظ على سلسلة التبريد المعتمدة (2° إلى 6° مئوية لكرات الدم الحمراء، و-18° مئوية للبلازما) داخل حاويات نقل حرارية معتمدة لضمان سلامتها حتى.',
      badgeEn: 'Calibrated Logistics',
      badgeAr: 'توصيل مبرد معتمد',
    },
    {
      icon: Users,
      titleEn: 'Compassionate Patient Advocacy',
      titleAr: 'دعم إنساني وطبي متواصل للأسر والمرضى',
      descEn:
        'Families facing surgical emergencies or chronic hematology treatments should never have to search blindly. We stand with doctors and families, providing immediate phone updates the moment matching units are secured.',
      descAr:
        'لا ينبغي لأي عائلة تواجه ظرفاً جراحياً طارئاً أو علاجاً لأمراض الدم أن تخوض رحلة البحث بمفردها. نقف بجانب الأطباء وذوي المرضى ونتواصل معهم هاتفياً فور تأكيد توفر الفصيلة المطلوبة.',
      badgeEn: 'Patient-First',
      badgeAr: 'أولوية المريض',
    },
  ];

  const stats = [
    {
      num: '24/7',
      labelEn: 'Emergency Coordination',
      labelAr: 'تنسيق طوارئ متواصل',
    },
    {
      num: '2°C–6°C',
      labelEn: 'Cold-Chain Integrity',
      labelAr: 'سلسلة تبريد حيوية',
    },
    {
      num: '100%',
      labelEn: 'Accredited Bank Partners',
      labelAr: 'بنوك دم مرخصة ومعتمدة',
    },
    {
      num: '30+',
      labelEn: 'Major Healthcare Centers',
      labelAr: 'مركز ومستشفى مستفيد',
    },
  ];

  return (
    <div className="bg-slate-50 min-h-[85vh] py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            id="about-back-home-btn"
            type="button"
            onClick={() => {
              if (onBackHome) {
                onBackHome();
              } else if (window.history.length > 1) {
                window.history.back();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl transition shadow-2xs cursor-pointer"
          >
            <BackChevron className="w-4 h-4" />
            <span>{language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </button>
        </div>

        {/* Breadcrumb / Category header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold mb-4">
            <DamdotLogo className="w-4 h-4" />
            <span>{language === 'ar' ? 'عن منصة دم دوت' : 'About damdot'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {language === 'ar' ? (
              <>
                نربط بين حاجة المريض وبنوك الدم المعتمدة{' '}
                <span className="text-red-600">بسرعة وأمان تام</span>
              </>
            ) : (
              <>
                Bridging Critical Patient Needs with{' '}
                <span className="text-red-600">Accredited Blood Banks</span>
              </>
            )}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            {language === 'ar'
              ? 'دم دوت (damdot) هي المنصة الطبية المكرسة لمساعدة المستشفيات والكوادر الطبية والمرضى في العثور على أكياس الدم ومشتقاته البيولوجية وتأمينها بسرعة وأمان، مع الالتزام بأعلى معايير الجودة وسلسلة التبريد المعتمدة.'
              : 'damdot is a dedicated medical requisition network built to help healthcare teams, physicians, and families locate and secure compatible blood bags and biologic products swiftly, adhering to strict clinical standards and unbroken cold-chain logistics.'}
          </p>
        </div>

        {/* Impact Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs text-center hover:border-red-200 transition-colors"
            >
              <div className="text-2xl sm:text-3xl font-black text-red-600 mb-1">
                {stat.num}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700">
                {language === 'ar' ? stat.labelAr : stat.labelEn}
              </div>
            </div>
          ))}
        </div>

        {/* Narrative Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5 text-left rtl:text-right">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-red-600" />
              <span>{language === 'ar' ? 'رسالتنا الطبية' : 'Our Clinical Mission'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {language === 'ar'
                ? 'القضاء على صعوبة وتأخر العثور على أكياس الدم في الحالات الحرجة'
                : 'Eliminating the Agonizing Search for Blood During Critical Hours'}
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              {language === 'ar'
                ? 'في حالات الطوارئ الجراحية، النزيف الحاد، جراحات القلب المفتوح، أو علاج أمراض الدم الوراثية كالثلاسيميا، يمثل توفير فصيلة الدم المناسبة في الوقت المناسب فارقاً حاسماً للحياة. في السابق، كانت الأسر والأطباء يضطرون لإجراء عشرات الاتصالات الهاتفية والبحث العشوائي بين بنوك الدم المختلفة.'
                : 'During urgent surgeries, acute hemorrhages, cardiac procedures, or continuous therapy for hematological conditions like thalassemia, securing compatible blood units promptly is vital. In traditional workflows, frantic phone calls and uncoordinated trips between facilities often consumed irreplaceable time.'}
            </p>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              {language === 'ar'
                ? 'صُممت منصة دم دوت لتكون نقطة الاتصال المركزية والموثوقة: بمجرد تقديم طلب الاحتياج، يتحرك فريقنا الطبي الميداني فوراً للبحث في بنوك الدم المعتمدة، مطابقة الشروط والتحاليل المخبرية، والتنسيق المباشر معكم لتوصيل الكيس فور جاهزيته.'
                : 'damdot functions as the coordinated central hub: the moment a clinical requisition is submitted, our medical team actively engages with certified blood banks, verifies serological compatibility, and coordinates rapid, temperature-regulated dispatch directly to the medical team.'}
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>{language === 'ar' ? 'فحص وموافقة بنك الدم' : 'Laboratory Screened'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg">
                <Award className="w-4 h-4 text-red-600" />
                <span>{language === 'ar' ? 'معايير وزارة الصحة' : 'MOH Compliant'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg">
                <ThermometerSnowflake className="w-4 h-4 text-blue-600" />
                <span>{language === 'ar' ? 'نقل مبرد معزول' : 'Cold-Chain Certified'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {language === 'ar' ? 'معايير السلامة البيولوجية' : 'Biological Safety Mandate'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'ar' ? 'التزام غير قابل للتفاوض' : 'Non-negotiable compliance'}
                </p>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'ar'
                    ? 'فحص شامل للأمراض المنقولة بالدم (HIV, HCV, HBV, Syphilis).'
                    : 'Comprehensive infectious disease screening (HIV, HCV, HBV, Syphilis).'}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'ar'
                    ? 'مطابقة فصائل الدم وتوافق الأجسام المضادة (Cross-match) قبل التسليم.'
                    : 'Strict cross-matching and antibody screening before unit release.'}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'ar'
                    ? 'حفظ وتبريد مراقب حرارياً وفق البروتوكول الطبي الدولي.'
                    : 'Real-time thermal monitoring according to international biologic protocols.'}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'ar'
                    ? 'صرف حصري للمنشآت والممارسين الطبيين المرخصين.'
                    : 'Dispensed exclusively upon clinical physician authorization.'}
                </span>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-700">
              <button
                id="btn-about-order-cta"
                onClick={onOrderNow}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
              >
                <span>{language === 'ar' ? 'بدء طلب كيس دم لمريض' : 'Request Blood Bag Now'}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {language === 'ar' ? 'ركائز العمل والخدمة في دم دوت' : 'Our Service Standards & Pillars'}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              {language === 'ar'
                ? 'كيف نضمن سرعة الاستجابة وسلامة المنتج البيولوجي في كل طلب'
                : 'How we guarantee speed, biological integrity, and peace of mind with every order'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pillars.map((p, idx) => {
              const IconComp = p.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs hover:shadow-md transition-shadow text-left rtl:text-right flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {language === 'ar' ? p.badgeAr : p.badgeEn}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {language === 'ar' ? p.titleAr : p.titleEn}
                    </h3>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      {language === 'ar' ? p.descAr : p.descEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Us Direct Section (Leads directly to the number in the footer) */}
        <div
          id="contact-section"
          className="bg-gradient-to-r from-red-600 via-red-700 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden"
        >
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 text-red-100">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تواصل معنا مباشرة' : 'Contact Us Directly'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {language === 'ar'
                ? 'هل تحتاج استفساراً عاجلاً أو مساعدة في توفير كيس دم؟'
                : 'Need Immediate Assistance or Urgent Blood Sourcing Support?'}
            </h2>

            <p className="mt-3 text-sm sm:text-base text-red-100 leading-relaxed max-w-2xl">
              {language === 'ar'
                ? 'فريق التنسيق الطبي الميداني متاح على مدار الساعة عبر خط الطوارئ للرد على الأطباء، أقسام العمليات، وأسر المرضى لترتيب توفير الدم ونقله فوراً.'
                : 'Our clinical coordination dispatch team is on call 24 hours a day to answer hospital directors, surgeons, and families to locate matching units and coordinate rapid transport.'}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* Leads to the number in the footer */}
              <a
                id="btn-about-call-hotline"
                href="tel:+201015570651"
                className="bg-white hover:bg-slate-100 text-red-700 font-extrabold px-6 py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-3 text-base sm:text-lg group"
              >
                <PhoneCall className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                <span dir="ltr">+20 101 557 0651</span>
              </a>

              <button
                id="btn-about-request-blood"
                onClick={onOrderNow}
                className="bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold px-6 py-4 rounded-xl transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span>{language === 'ar' ? 'تقديم طلب كيس دم' : 'Submit Blood Request'}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-4 text-xs text-red-200">
              {language === 'ar'
                ? 'الرقم مخصص للاتصال الهاتفي المباشر لخدمة كافة المحافظات والمراكز الجراحية.'
                : 'Direct emergency telephone line serving all healthcare centers and governorates.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
