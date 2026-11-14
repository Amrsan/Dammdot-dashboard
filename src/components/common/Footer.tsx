import React from 'react';
import { HeartPulse, PhoneCall, ShieldCheck, Clock, MapPin, Mail, Award, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { DamdotLogo } from './DamdotLogo';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { language, t, isRTL } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-14 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-slate-800 text-left rtl:text-right">
          {/* Col 1 & 2: Brand & Emergency Hotline */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <DamdotLogo className="w-9 h-9" />
              <span className="font-extrabold text-xl tracking-tight text-white">
                {language === 'ar' ? 'دم دوت' : 'damdot'}
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              {t('footerDesc')}
            </p>
            <div id="footer-hotline" className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 max-w-sm scroll-mt-24 transition-all duration-300">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Clock className="w-4 h-4" />
                <span>{t('emergencyHotline')}</span>
              </div>
              <a
                id="footer-hotline-tel-link"
                href="tel:+201015570651"
                className={`text-xl font-bold text-white hover:text-red-400 flex items-center gap-2 transition ${
                  isRTL ? 'flex-row-reverse justify-end' : ''
                }`}
              >
                <PhoneCall className="w-4 h-4 text-red-500" />
                <span dir="ltr">+201015570651</span>
              </a>
              
            </div>
          </div>

          {/* Col 3: Navigation */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">
              {language === 'ar' ? 'روابط المنصة' : 'Platform Links'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('/')}
                  className="hover:text-white transition text-slate-400"
                >
                  {t('navHome')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/about')}
                  className="hover:text-white transition text-slate-400"
                >
                  {t('navAbout')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/order')}
                  className="hover:text-white transition text-slate-400"
                >
                  {t('navOrder')}
                </button>
              </li>
              <li>
                <a
                  href="tel:+201015570651"
                  onClick={() => {
                    const el = document.getElementById('footer-hotline');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="hover:text-white transition text-slate-400 flex items-center gap-1.5"
                >
                  <span>{t('navContact')}</span>
                  <span className="text-[11px] text-red-400 font-mono" dir="ltr">(+201015570651)</span>
                </a>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/account')}
                  className="hover:text-white transition text-slate-400"
                >
                  {t('navAccount')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/account/orders')}
                  className="hover:text-white transition text-slate-400"
                >
                  {t('navMyOrders')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Accreditations */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">
              {language === 'ar' ? 'الجودة والمعايير' : 'Quality & Standards'}
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'ar'
                    ? 'سلسلة تبريد دقيقة بين 2° مئوية إلى 6° مئوية.'
                    : 'Cold-chain compliance strictly maintained at 2°C – 6°C.'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'ar'
                    ? 'فحص شامل مطابق لمعايير منظمة الصحة ووزارة الصحة.'
                    : 'Screened per WHO & National Blood Bank safety standards.'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'ar'
                    ? 'تغطية شاملة: القاهرة، الجيزة، الإسكندرية ومراكز الأقاليم.'
                    : 'Serving Cairo, Giza, Alexandria & regional healthcare centers.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom medical disclaimer notice */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 space-y-2 text-left rtl:text-right">
          <div className="flex items-center gap-2 text-amber-500 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {language === 'ar'
                ? 'إقرار تنظيمي وإخلاء مسؤولية طبية ملزم:'
                : 'CRITICAL REGULATORY COMPLIANCE MANDATE:'}
            </span>
          </div>
          <p className="leading-relaxed">
            {t('disclaimerP2')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-slate-500 gap-2">
            <span>
              © {new Date().getFullYear()} {language === 'ar' ? 'منصة دم دوت للحلول الطبية ونقل الدم. جميع الحقوق محفوظة.' : 'damdot Healthcare Technologies. All rights reserved.'}
            </span>
            <div className="flex items-center gap-4">
              <span className="hover:text-slate-400 cursor-pointer">
                {language === 'ar' ? 'الخصوصية' : 'Clinical Privacy'}
              </span>
              <span className="hover:text-slate-400 cursor-pointer">
                {language === 'ar' ? 'الشروط التنظيمية' : 'Regulatory Terms'}
              </span>
              <span className="hover:text-slate-400 cursor-pointer">
                {language === 'ar' ? 'بروتوكولات بنك الدم' : 'Blood Bank Protocols'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
