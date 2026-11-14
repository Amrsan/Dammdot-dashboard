import React, { useState } from 'react';
import {
  Activity,
  HeartPulse,
  Package,
  Search,
  ShieldCheck,
  User,
  Menu,
  X,
  Lock,
  ArrowRight,
  ArrowLeft,
  LogOut,
  ChevronDown,
  Globe,
  PhoneCall,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { DamdotLogo } from './DamdotLogo';
import { useLanguage } from '../../i18n/LanguageContext';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string, params?: any) => void;
  onBack?: () => void;
  currentUser: UserProfile | null;
  onSwitchUser?: (userIdOrRole: string) => void;
  onLogout: () => void;
  onOpenAuth: (
    mode?: 'login' | 'register',
    pending?: { route: string; params?: any },
    reason?: string
  ) => void;
  cartCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  onBack,
  currentUser,
  onLogout,
  onOpenAuth,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { language, toggleLanguage, t, isRTL } = useLanguage();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const navItems = [
    { id: 'home', label: t('navHome'), route: '/' },
    { id: 'about', label: t('navAbout'), route: '/about' },
    { id: 'order', label: t('navOrder'), route: '/select-product' },
  ];

  const handleContactClick = (e: React.MouseEvent) => {
    const el = document.getElementById('footer-hotline');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-red-500/50', 'bg-slate-800');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-red-500/50');
      }, 3000);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Optional Universal Back Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentRoute !== '/' && onBack && (
              <button
                id="header-back-btn"
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-950 text-xs font-bold border border-slate-200/90 transition shadow-2xs cursor-pointer group"
                title={language === 'ar' ? 'الرجوع للصفحة السابقة' : 'Return to previous page'}
                aria-label={language === 'ar' ? 'الرجوع للصفحة السابقة' : 'Return to previous page'}
              >
                <BackIcon className="w-4 h-4 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 transition-transform" />
                <span className="font-bold">{language === 'ar' ? 'رجوع' : 'Back'}</span>
              </button>
            )}

            <button
              id="header-logo-btn"
              onClick={() => {
                onNavigate('/');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 group text-left rtl:text-right"
            >
              <DamdotLogo className="w-10 h-10 group-hover:scale-105 transition-transform" />
              <div>
                <span className="font-black text-2xl tracking-tight text-slate-900">
                  {language === 'ar' ? (
                    <>
                      دم <span className="text-red-600">دوت</span>
                    </>
                  ) : (
                    <>
                      dam<span className="text-red-600">dot</span>
                    </>
                  )}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 rtl:space-x-reverse">
            {navItems.map((item) => {
              const active = currentRoute === item.route;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => {
                    onNavigate(item.route);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? 'text-red-700 bg-red-50/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {/* Contact Us leads directly to the footer number */}
            <a
              id="nav-link-contact-us"
              href="tel:+201015570651"
              onClick={handleContactClick}
              className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-slate-600 hover:text-red-600 hover:bg-red-50/60 flex items-center gap-1.5"
              title={language === 'ar' ? 'اتصل بنا: +201015570651' : 'Contact Us: +201015570651'}
            >
              <PhoneCall className="w-3.5 h-3.5 text-red-600" />
              <span>{t('navContact')}</span>
            </a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Toggle */}
            <button
              id="lang-toggle-btn"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
              title={language === 'en' ? 'التحويل إلى اللغة العربية' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-red-600" />
              <span>{language === 'en' ? 'عربي' : 'English'}</span>
            </button>

            {/* Quick Order CTA */}
            <button
              id="header-order-now-btn"
              onClick={() => onNavigate('/select-product')}
              className="hidden sm:inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg shadow-sm shadow-red-600/20 transition-colors cursor-pointer"
            >
              <span>{t('orderNow')}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>

            {/* User Account */}
            <div className="relative">
              {currentUser ? (
                <div className="relative">
                  <button
                    id="user-profile-menu-btn"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                  >
                    <div className="w-6 h-6 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs">
                      {currentUser.full_name.charAt(0)}
                    </div>
                    <div className="hidden sm:block text-left rtl:text-right max-w-[120px]">
                      <div className="truncate font-semibold text-slate-800">
                        {currentUser.full_name.split(' ')[0]}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {currentUser.email}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {userMenuOpen && (
                    <div
                      className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <div className="px-4 py-2.5 border-b border-slate-100 text-left rtl:text-right">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.full_name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      </div>

                      <button
                        id="menu-btn-account"
                        onClick={() => onNavigate('/account')}
                        className="w-full text-left rtl:text-right px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{t('navAccount')}</span>
                      </button>

                      <button
                        id="menu-btn-my-orders"
                        onClick={() => onNavigate('/account/orders')}
                        className="w-full text-left rtl:text-right px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>{t('navMyOrders')}</span>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        id="menu-btn-logout"
                        onClick={onLogout}
                        className="w-full text-left rtl:text-right px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('navSignOut')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    id="sign-in-btn"
                    onClick={() => onOpenAuth('login')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{t('navSignIn')}</span>
                  </button>
                  <button
                    id="sign-up-btn"
                    onClick={() => onOpenAuth('register')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <span>{language === 'ar' ? 'حساب جديد' : 'Sign Up'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.route);
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left rtl:text-right px-3 py-2 rounded-md text-sm font-semibold ${
                currentRoute === item.route
                  ? 'text-red-700 bg-red-50'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Mobile Contact Us link leading directly to footer phone number */}
          <a
            id="mobile-nav-contact-us"
            href="tel:+201015570651"
            onClick={() => {
              setMobileMenuOpen(false);
              const el = document.getElementById('footer-hotline');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-4', 'ring-red-500/50', 'bg-slate-800');
                setTimeout(() => {
                  el.classList.remove('ring-4', 'ring-red-500/50');
                }, 3000);
              }
            }}
            className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <span className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-red-600" />
              <span>{t('navContact')}</span>
            </span>
            <span className="text-xs font-mono font-bold text-red-600" dir="ltr">
              +201015570651
            </span>
          </a>

          <div className="pt-2 flex flex-col gap-2">
            {!currentUser && (
              <div className="grid grid-cols-2 gap-2 pb-1 border-b border-slate-100">
                <button
                  id="mobile-nav-signin"
                  onClick={() => {
                    onOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{t('navSignIn')}</span>
                </button>
                <button
                  id="mobile-nav-register"
                  onClick={() => {
                    onOpenAuth('register');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-xs shadow-red-600/20"
                >
                  <span>{language === 'ar' ? 'إنشاء حساب جديد' : 'Sign Up'}</span>
                </button>
              </div>
            )}

            <button
              onClick={toggleLanguage}
              className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-700 font-bold py-2 rounded-lg text-xs"
            >
              <Globe className="w-4 h-4 text-red-600" />
              <span>{language === 'en' ? 'التحويل للغة العربية (Arabic)' : 'Switch to English'}</span>
            </button>

            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth(
                    'login',
                    { route: '/select-product' },
                    language === 'ar'
                      ? 'يرجى تسجيل الدخول أولاً للبدء بطلب أكياس الدم وتأمين التوصيل.'
                      : 'Please sign in first to place your blood request and track cold-chain delivery.'
                  );
                  setMobileMenuOpen(false);
                  return;
                }
                onNavigate('/select-product');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-2.5 rounded-lg shadow-sm text-sm"
            >
              <span>{t('orderNow')}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
