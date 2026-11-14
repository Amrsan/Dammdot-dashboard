import React from 'react';
import {
  HeartPulse,
  ShieldCheck,
  Truck,
  FileCheck2,
  Clock,
  Thermometer,
  Award,
  ArrowRight,
  ArrowLeft,
  Package,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lock,
  Phone,
} from 'lucide-react';
import { Product } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface HomePageProps {
  onOrderNow: () => void;
  onViewProducts?: () => void;
  onSelectProduct?: (product: Product) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onOrderNow,
}) => {
  const { language, t, isRTL } = useLanguage();

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-16 pb-16 text-left rtl:text-right">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white pt-14 pb-20 border-b border-slate-800">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-red-600/15 via-rose-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/80 border border-red-800/80 text-red-300 text-xs font-bold uppercase tracking-wider">
                <HeartPulse className="w-4 h-4 text-red-400" />
                <span>{t('heroBadge')}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.2] text-white">
                {t('heroTitle')}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                {t('heroSubtitle')}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  id="hero-order-now-btn"
                  onClick={onOrderNow}
                  className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-8 py-4 rounded-xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition flex items-center justify-center gap-3 text-base group"
                >
                  <HeartPulse className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>{t('heroOrderCta')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Emergency Hotline Strip */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-400 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-semibold text-slate-200">{t('emergencyHotline')}:</span>
                  <a
                    href="tel:+201015570651"
                    className="text-red-400 font-bold hover:underline"
                    dir="ltr"
                  >
                    +20 101 557 0651
                  </a>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{t('verifiedBanks')}</span>
                </div>
              </div>
            </div>

            {/* Right Hero Card: Blood Sourcing & Patient Coordination Flow */}
            <div className="lg:col-span-5">
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-slate-700 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-red-400" />
                    <span className="font-bold text-sm text-white">{t('telemetryTitle')}</span>
                  </div>
                  <span className="text-xs bg-red-950/80 text-red-300 font-mono px-2.5 py-0.5 rounded border border-red-800/80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    {t('telemetryLive')}
                  </span>
                </div>

                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-red-950/80 text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-800/50">
                      <HeartPulse className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white block font-semibold">
                        {t('telemetryRegulatedTitle')}
                      </strong>
                      {t('telemetryRegulatedDesc')}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950/80 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-800/50">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white block font-semibold">
                        {t('telemetryAdherenceTitle')}
                      </strong>
                      {t('telemetryAdherenceDesc')}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-950/80 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-800/50">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white block font-semibold">
                        {t('telemetryTransitTitle')}
                      </strong>
                      {t('telemetryTransitDesc')}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onOrderNow}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition"
                  >
                    <span>{t('heroExploreTypes')}</span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-red-700 font-extrabold uppercase text-xs tracking-wider">
            {t('howItWorksBadge')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('howItWorksTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">{t('howItWorksSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {[
            {
              step: '01',
              title: t('step1Title'),
              desc: t('step1Desc'),
              icon: HeartPulse,
            },
            {
              step: '02',
              title: t('step2Title'),
              desc: t('step2Desc'),
              icon: FileCheck2,
            },
            {
              step: '03',
              title: t('step3Title'),
              desc: t('step3Desc'),
              icon: Truck,
            },
            {
              step: '04',
              title: t('step4Title'),
              desc: t('step4Desc'),
              icon: ShieldCheck,
            },
            {
              step: '05',
              title: t('step5Title'),
              desc: t('step5Desc'),
              icon: Thermometer,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs relative flex flex-col justify-between hover:border-red-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-red-600/30">{item.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* REGULATORY MANDATE CALLOUT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-900 via-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-widest">
              <AlertCircle className="w-5 h-5" />
              <span>
                {language === 'ar'
                  ? 'بروتوكولات نقل الدم واللوائح الطبية'
                  : 'Medical Regulatory & Transfusion Protocols'}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              {language === 'ar'
                ? 'ضمان أعلى معايير سلامة المريض ومطابقة نقل الدم المخبرية'
                : 'Ensuring the Highest Standards of Patient Safety & Blood Compliance'}
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {language === 'ar'
                ? 'يتم التاكد من كل كيس دم يمر عبر منصة دم دوت (damdot)،'
                : 'Every blood bag processed through the Damdot platform.'}
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <button
                onClick={onOrderNow}
                className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold px-6 py-3 rounded-xl shadow-lg transition text-xs sm:text-sm"
              >
                {language === 'ar' ? 'بدء طلب جديد' : 'Initiate a new Request'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
