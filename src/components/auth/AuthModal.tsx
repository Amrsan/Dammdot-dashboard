import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  Phone,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Building2,
  Compass,
  CheckCircle,
  KeyRound,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Send,
  Copy,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../services/db';
import { supabase } from '../../services/supabase';
import { useLanguage } from '../../i18n/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'updatePassword';
  initialEmail?: string;
  initialCode?: string;
  reason?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  initialEmail = '',
  initialCode = '',
  reason,
}) => {
  const { language, isRTL } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'updatePassword'>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState(initialCode);
  const [enteredCode, setEnteredCode] = useState(initialCode);
  const [codeCopied, setCodeCopied] = useState(false);
  const [resetAccountEmail, setResetAccountEmail] = useState(initialEmail);
  const [directResetUrl, setDirectResetUrl] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [isDirectReset, setIsDirectReset] = useState(false);
  const [pastedLink, setPastedLink] = useState('');
  const [pastingError, setPastingError] = useState('');
  const [showUrlPaster, setShowUrlPaster] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setMode(initialMode);
      }
      if (initialEmail) {
        setResetAccountEmail(initialEmail);
        setEmail(initialEmail);
      }
      if (initialCode) {
        setRecoveryCode(initialCode);
        setEnteredCode(initialCode);
      }
      setError('');
      setMessage('');
      if (initialMode !== 'forgot') {
        setEmailSent(false);
      }
    }
  }, [isOpen, initialMode, initialEmail, initialCode]);

  // Synchronize recovery URL parameters and Supabase auth session
  useEffect(() => {
    if (!isOpen) return;
    try {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const raw = hash.startsWith('#')
        ? hash.substring(1)
        : search.startsWith('?')
        ? search.substring(1)
        : '';
      if (raw) {
        const params = new URLSearchParams(raw);
        const urlEmail = params.get('email');
        const urlCode = params.get('code') || params.get('token');
        if (urlEmail && !resetAccountEmail) {
          const clean = decodeURIComponent(urlEmail);
          setResetAccountEmail(clean);
          setEmail(clean);
        }
        if (urlCode && !enteredCode) {
          const cleanCode = decodeURIComponent(urlCode);
          setRecoveryCode(cleanCode);
          setEnteredCode(cleanCode);
        }
      }
    } catch {}

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setResetAccountEmail((prev) => prev || session.user.email!);
          setEmail((prev) => prev || session.user.email!);
        }
      });
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleClose = () => {
    setError('');
    setMessage('');
    onClose();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim() || !password.trim()) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'
          : 'Please enter both your email address and password.'
      );
      return;
    }

    setLoading(true);
    try {
      db.login(email.trim(), password);
      setLoading(false);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setLoading(false);
      setError(
        err.message ||
          (language === 'ar'
            ? 'فشل تسجيل الدخول. يرجى التحقق من البيانات.'
            : 'Login failed. Please verify your credentials.')
      );
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !phone.trim() ||
      !deliveryAddress.trim()
    ) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال جميع البيانات المطلوبة (الاسم، البريد الإلكتروني، كلمة المرور، رقم الهاتف، عنوان التوصيل).'
          : 'Please fill in all required fields (Name, Email, Password, Phone number, Delivery address).'
      );
      return;
    }

    if (password.length < 6) {
      setError(
        language === 'ar'
          ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    setLoading(true);
    try {
      await db.register(fullName.trim(), email.trim(), password, phone.trim(), {
        default_address: deliveryAddress.trim(),
        governorate_name: 'القاهرة',
        city_name: 'القاهرة / الجيزة',
        area_name: 'عنوان التسليم',
      });
      setLoading(false);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setLoading(false);
      setError(
        err.message ||
          (language === 'ar'
            ? 'فشل إنشاء الحساب. قد يكون البريد مسجلاً مسبقاً.'
            : 'Registration failed. This email may already be in use.')
      );
    }
  };

  const handleForgot = async (e?: React.FormEvent, direct: boolean = false) => {
    if (e) e.preventDefault();
    setError('');
    setMessage('');
    const targetEmail = (email || resetAccountEmail).trim();
    if (!targetEmail) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال البريد الإلكتروني لإرسال رابط الاستعادة أو التحقق الفوري.'
          : 'Please enter your registered email address.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await db.sendPasswordResetEmail(targetEmail);
      setLoading(false);
      if (!res.success) {
        setError(
          res.message ||
            (language === 'ar'
              ? 'تعذر العثور على حساب مسجل بهذا البريد الإلكتروني. يرجى التأكد من كتابة البريد بشكل صحيح.'
              : 'No registered account found with this email address.')
        );
      } else {
        setResetAccountEmail(targetEmail);
        setRecoveryCode(res.recoveryCode || '');
        const computedResetUrl =
          res.resetUrl ||
          (typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname}#type=recovery&email=${encodeURIComponent(targetEmail)}&code=${res.recoveryCode || ''}`
            : '');
        setDirectResetUrl(computedResetUrl);

        if (direct) {
          setEnteredCode(res.recoveryCode || '');
          setIsDirectReset(true);
          setMode('updatePassword');
          setMessage(
            language === 'ar'
              ? 'تم التحقق من الحساب بنجاح! يمكنك الآن إدخال كلمة المرور الجديدة مباشرة.'
              : 'Account verified! You can now set your new password directly.'
          );
        } else {
          setEmailSent(true);
          setMessage(
            language === 'ar'
              ? `تم توليد كود الأمان الفوري (${res.recoveryCode}). يمكنك استخدامه فوراً لتعيين كلمة المرور دون انتظار وصول رسالة البريد الإلكتروني.`
              : `Recovery code generated (${res.recoveryCode}). You can use it now to reset your password without waiting for email delivery.`
          );
        }
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'An unexpected error occurred.');
    }
  };

  const handlePasteRecoveryUrl = async (rawUrl: string) => {
    setPastingError('');
    if (!rawUrl || !rawUrl.trim()) return;
    const clean = rawUrl.trim();
    try {
      let hash = '';
      let search = '';
      if (clean.includes('#')) {
        hash = clean.split('#')[1] || '';
      }
      if (clean.includes('?')) {
        const withoutHash = clean.split('#')[0];
        search = withoutHash.split('?')[1] || '';
      }

      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(search);

      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token') || '';
      const emailParam = hashParams.get('email') || searchParams.get('email');
      const codeParam = hashParams.get('code') || searchParams.get('code') || hashParams.get('token');

      if (emailParam) {
        const decodedEmail = decodeURIComponent(emailParam);
        setResetAccountEmail(decodedEmail);
        setEmail(decodedEmail);
      }
      if (codeParam) {
        const decodedCode = decodeURIComponent(codeParam);
        setEnteredCode(decodedCode);
        setRecoveryCode(decodedCode);
      }

      if (accessToken && supabase) {
        setLoading(true);
        try {
          const { data } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (data?.user?.email) {
            setResetAccountEmail(data.user.email);
            setEmail(data.user.email);
          }
        } catch (e) {
          console.warn('[handlePasteRecoveryUrl setSession notice]:', e);
        } finally {
          setLoading(false);
        }
      }

      setMode('updatePassword');
      setMessage(
        language === 'ar'
          ? 'تم التحقق من رابط الاستعادة بنجاح! أدخل كلمة المرور الجديدة لحسابك الآن.'
          : 'Recovery link verified successfully! Enter your new password now.'
      );
    } catch (err: any) {
      setPastingError(
        language === 'ar'
          ? 'تعذر قراءة الرابط. يرجى التأكد من نسخه بالكامل من شريط عنوان المتصفح.'
          : 'Could not parse link. Ensure the full browser URL is copied.'
      );
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError(
        language === 'ar'
          ? 'كلمة المرور يجب أن تتكون من 6 خانات على الأقل.'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        language === 'ar'
          ? 'كلمتا المرور غير متطابقتين.'
          : 'Passwords do not match.'
      );
      return;
    }

    const targetEmail = (resetAccountEmail || email).trim();

    setLoading(true);
    try {
      let res;
      if (targetEmail) {
        res = await db.resetPasswordForUser(targetEmail, password, enteredCode || recoveryCode);
      } else {
        res = await db.updateUserPassword(password);
      }
      setLoading(false);

      if (!res.success) {
        setError(res.message || 'Failed to update password.');
      } else {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}

        setMessage(
          language === 'ar'
            ? '🎉 تم تحديث كلمة المرور بنجاح وتم تسجيل دخولك إلى حسابك! جاري التحويل...'
            : '🎉 Password updated successfully and your session is active! Redirecting...'
        );
        setTimeout(() => {
          handleClose();
          if (onSuccess) onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'An unexpected error occurred.');
    }
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className={`bg-white rounded-2xl ${
          mode === 'register' ? 'max-w-lg' : 'max-w-md'
        } w-full shadow-2xl border border-slate-200 overflow-hidden text-left rtl:text-right max-h-[92vh] flex flex-col`}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-slate-900 text-white p-6 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-wider uppercase text-red-200">
              {language === 'ar' ? 'دم دوت' : 'damdot'}
            </span>
          </div>

          <h3 className="text-xl font-black text-white">
            {mode === 'login' && (language === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
            {mode === 'register' && (language === 'ar' ? 'إنشاء حساب جديد' : 'Create an Account')}
            {mode === 'forgot' && (language === 'ar' ? 'استعادة كلمة المرور' : 'Reset Password')}
            {mode === 'updatePassword' && (language === 'ar' ? 'تعيين كلمة المرور الجديدة' : 'Set New Password')}
          </h3>

          <p className="text-xs text-red-100 mt-1 leading-relaxed">
            {mode === 'login' &&
              (language === 'ar'
                ? 'سجل دخولك إلى حسابك، أو أنشئ حساباً جديداً للبدء بطلب وتتبع أكياس الدم.'
                : 'Sign in to your account, or create a new account to request and track blood units.')}
            {mode === 'register' &&
              (language === 'ar'
                ? 'أنشئ حسابك الجديد مجاناً لتسجيل وتتبع طلبات أكياس الدم وتأمين التسليم المبرد.'
                : 'Create your new account for free to order blood units and track cold-chain delivery.')}
            {mode === 'forgot' &&
              (language === 'ar'
                ? 'أدخل بريدك المسجل لإرسال رابط إعادة تعيين كلمة المرور.'
                : 'Enter your registered email to receive a recovery link.')}
            {mode === 'updatePassword' &&
              (language === 'ar'
                ? 'أدخل كلمة المرور الجديدة لتأمين حسابك.'
                : 'Enter your new secure account password.')}
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {reason && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-900 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold leading-relaxed">{reason}</span>
            </div>
          )}

          {/* Segmented Switcher for Login / Signup */}
          {(mode === 'login' || mode === 'register') && (
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5 border border-slate-200/80">
              <button
                type="button"
                id="tab-auth-login"
                onClick={() => {
                  setError('');
                  setMessage('');
                  setMode('login');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Lock className={`w-3.5 h-3.5 ${mode === 'login' ? 'text-red-600' : 'text-slate-400'}`} />
                <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
              </button>
              <button
                type="button"
                id="tab-auth-register"
                onClick={() => {
                  setError('');
                  setMessage('');
                  setMode('register');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <User className={`w-3.5 h-3.5 ${mode === 'register' ? 'text-red-600' : 'text-slate-400'}`} />
                <span>{language === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}</span>
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
              {message}
            </div>
          )}

          {/* NORMAL SIGN IN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail
                    className={`w-4 h-4 text-slate-400 absolute top-3 ${
                      isRTL ? 'right-3' : 'left-3'
                    }`}
                  />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === 'ar' ? 'name@example.com' : 'name@example.com'}
                    className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 text-slate-900 ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {language === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setMessage('');
                      setMode('forgot');
                    }}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline"
                  >
                    {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className={`w-4 h-4 text-slate-400 absolute top-3 ${
                      isRTL ? 'right-3' : 'left-3'
                    }`}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 text-slate-900 ${
                      isRTL ? 'pr-9 pl-10' : 'pl-9 pr-10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-2.5 text-slate-400 hover:text-slate-600 p-1 ${
                      isRTL ? 'left-2' : 'right-2'
                    }`}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span>{language === 'ar' ? 'تذكرني على هذا الجهاز' : 'Remember me'}</span>
                </label>
              </div>

              {/* Submit */}
              <button
                id="btn-submit-login"
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 rounded-xl shadow-md shadow-red-600/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                <span>
                  {loading
                    ? language === 'ar'
                      ? 'جارٍ تسجيل الدخول...'
                      : 'Signing in...'
                    : language === 'ar'
                    ? 'تسجيل الدخول'
                    : 'Sign In'}
                </span>
                {!loading && <ArrowIcon className="w-4 h-4" />}
              </button>

              {/* Toggle to Register */}
              <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100 space-y-2">
                <div>
                  <span>
                    {language === 'ar' ? 'ليس لديك حساب بعد؟' : "Don't have an account?"}{' '}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setMessage('');
                      setMode('register');
                    }}
                    className="font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    {language === 'ar' ? 'إنشاء حساب جديد' : 'Sign up'}
                  </button>
                </div>

                <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                  <span>{language === 'ar' ? 'للتجربة السريعة:' : 'Quick Demo:'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('amribrahim924@gmail.com');
                      setPassword('password123');
                    }}
                    className="text-slate-700 hover:text-red-600 font-semibold underline cursor-pointer"
                  >
                    {language === 'ar' ? 'تعبئة بيانات تجريبية (عمرو إبراهيم)' : 'Fill demo account (Amr Ibrahim)'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Form Guidance Notice */}
              <div className="p-3 bg-red-50/70 rounded-xl border border-red-200/80 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800">
                  {language === 'ar'
                    ? 'البيانات المطلوبة لإنشاء الحساب (الاسم، البريد، كلمة المرور، الهاتف، عنوان التوصيل)'
                    : 'Required registration data (Name, Email, Password, Phone, Delivery address)'}
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-white bg-red-600 px-2.5 py-1 rounded-lg text-[11px] shrink-0 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>{language === 'ar' ? 'مطلوب لإتمام الطلب' : 'Required to Order'}</span>
                </span>
              </div>

              {/* 1. Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {language === 'ar' ? 'الاسم بالكامل' : 'Full Name'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User
                    className={`w-4 h-4 text-slate-400 absolute top-2.5 ${
                      isRTL ? 'right-3' : 'left-3'
                    }`}
                  />
                  <input
                    id="register-fullname-input"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب اسمك بالكامل' : 'Enter your full name'}
                    className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 transition ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              {/* 2. Email */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail
                    className={`w-4 h-4 text-slate-400 absolute top-2.5 ${
                      isRTL ? 'right-3' : 'left-3'
                    }`}
                  />
                  <input
                    id="register-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 transition ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              {/* 3. Password & 4. Phone Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 3. Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {language === 'ar' ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      className={`w-4 h-4 text-slate-400 absolute top-2.5 ${
                        isRTL ? 'right-3' : 'left-3'
                      }`}
                    />
                    <input
                      id="register-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 transition ${
                        isRTL ? 'pr-9 pl-9' : 'pl-9 pr-9'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ${
                        isRTL ? 'left-2.5' : 'right-2.5'
                      }`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 4. Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone
                      className={`w-4 h-4 text-slate-400 absolute top-2.5 ${
                        isRTL ? 'right-3' : 'left-3'
                      }`}
                    />
                    <input
                      id="register-phone-input"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={language === 'ar' ? '01xxxxxxxxx' : '+20 100 123 4567'}
                      className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 transition ${
                        isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Delivery Address */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin
                    className={`w-4 h-4 text-slate-400 absolute top-3 ${
                      isRTL ? 'right-3' : 'left-3'
                    }`}
                  />
                  <textarea
                    id="register-delivery-address-input"
                    rows={2}
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={
                      language === 'ar'
                        ? 'اكتب عنوان التوصيل بالتفصيل (المحافظة، المنطقة، الشارع، المبنى أو الشقة...)'
                        : 'Enter full delivery address (Governorate, area, street, building or apartment...)'
                    }
                    className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 transition resize-none ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                id="btn-submit-register"
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm mt-3 disabled:opacity-60 cursor-pointer"
              >
                <span>
                  {loading
                    ? language === 'ar'
                      ? 'جارٍ إنشاء الحساب...'
                      : 'Creating account...'
                    : language === 'ar'
                    ? 'إنشاء الحساب'
                    : 'Create Account'}
                </span>
                {!loading && <ArrowIcon className="w-4 h-4" />}
              </button>

              {/* Toggle to Login */}
              <div className="text-center pt-2 text-xs text-slate-600 border-t border-slate-100">
                <span>{language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}</span>
                <button
                  id="btn-switch-to-login"
                  type="button"
                  onClick={() => {
                    setError('');
                    setMessage('');
                    setMode('login');
                  }}
                  className="font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  {language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {emailSent ? (
                <div className="text-center py-1 space-y-3.5">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl mx-auto flex items-center justify-center border border-emerald-100 text-emerald-600 shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-1">
                      {language === 'ar' ? 'تم إنشاء كود الأمان الفوري للاستعادة' : 'Instant Recovery Code Generated'}
                    </h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                      {language === 'ar'
                        ? `طلب استعادة كلمة المرور للحساب: `
                        : `Password recovery prepared for: `}
                      <span className="font-bold text-slate-900 dir-ltr inline-block">
                        {resetAccountEmail || email}
                      </span>
                    </p>
                  </div>

                  {/* Gmail/Junk Explanation Alert */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left rtl:text-right text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold">
                        {language === 'ar'
                          ? 'تنبيه هام لمستخدمي البريد (Gmail / Outlook): '
                          : 'Notice for Gmail / Outlook users: '}
                      </span>
                      {language === 'ar'
                        ? 'إذا انتظرت البريد ولم يصلك شيء في الوارد أو الـ Junk (بسبب فلاتر مزود البريد)، لا داعي للانتظار! لقد أنشأنا لك رمز أمان فوري أدناه يمكنك استخدامه لتعيين كلمة المرور فوراً وبأمان.'
                        : 'If you waited and received no email in Inbox or Junk (due to strict mail provider spam filters), you do not need to wait! We generated an instant security code below so you can reset your password immediately.'}
                    </div>
                  </div>

                  {/* Direct Reset Link and Code Display */}
                  <div className="space-y-2.5">
                    {/* Instant Security Code Display Card */}
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-xl pointer-events-none" />
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'ar' ? 'رمز الأمان الفوري لحسابك' : 'Your Instant Recovery Code'}</span>
                      </div>

                      <div className="my-2.5 flex items-center justify-center gap-2">
                        <div className="px-5 py-2.5 bg-slate-800/90 rounded-xl border border-slate-700 font-mono text-2xl sm:text-3xl font-black tracking-widest text-emerald-400 select-all">
                          {recoveryCode || '849201'}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (recoveryCode) {
                              navigator.clipboard.writeText(recoveryCode);
                              setCodeCopied(true);
                              setTimeout(() => setCodeCopied(false), 2000);
                            }
                          }}
                          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer"
                          title={language === 'ar' ? 'نسخ الرمز' : 'Copy Code'}
                        >
                          {codeCopied ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {codeCopied
                          ? (language === 'ar' ? '✓ تم نسخ الرمز إلى الحافظة' : '✓ Code copied to clipboard')
                          : (language === 'ar' ? 'الرمز صالح للاستخدام الفوري لتعيين كلمة مرور جديدة' : 'Code valid for immediate password reset')}
                      </p>
                    </div>

                    {/* Direct Recovery Link Card */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-red-600" />
                          {language === 'ar' ? 'رابط الاستعادة المباشر (جاهز فوراً):' : 'Direct Reset Link (Ready):'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const url = directResetUrl || (typeof window !== 'undefined'
                              ? `${window.location.origin}${window.location.pathname}#type=recovery&email=${encodeURIComponent(resetAccountEmail || email)}&code=${recoveryCode}`
                              : '');
                            if (url) {
                              navigator.clipboard.writeText(url);
                              setUrlCopied(true);
                              setTimeout(() => setUrlCopied(false), 2000);
                            }
                          }}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                        >
                          {urlCopied ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">{language === 'ar' ? 'تم نسخ الرابط!' : 'Link Copied!'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{language === 'ar' ? 'نسخ رابط الاستعادة' : 'Copy Reset Link'}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        {language === 'ar'
                          ? 'يمكنك نسخ هذا الرابط أو الضغط أدناه مباشرة لفتح شاشة تعيين كلمة المرور فوراً دون الحاجة لانتظار بريد قد يتأخر أو يُحجب.'
                          : 'You can copy this link or click below to open password reset immediately without waiting for blocked emails.'}
                      </p>
                    </div>

                    {/* Help card for localhost:3000 / Site Can't Be Reached */}
                    <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-950 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          {language === 'ar'
                            ? 'ظهرت لك صفحة «لا يمكن الوصول للموقع» (localhost) عند فتح رابط الإيميل؟'
                            : 'Encountered "This site can\'t be reached" (localhost) on email link?'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 leading-relaxed">
                        {language === 'ar'
                          ? 'هذا يحدث لأن رابط البريد يوجهك افتراضياً إلى localhost:3000. يمكنك إلصاق ذلك الرابط بالكامل هنا لتخطي المشكلة فوراً:'
                          : 'This occurs because the email redirects to localhost:3000. Paste that full browser URL here to bypass instantly:'}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pastedLink}
                          onChange={(e) => {
                            setPastedLink(e.target.value);
                            setPastingError('');
                          }}
                          placeholder={
                            language === 'ar'
                              ? 'ألصق الرابط هنا (http://localhost:3000/#access_token=...)'
                              : 'Paste URL here (http://localhost:3000/#access_token=...)'
                          }
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          disabled={!pastedLink.trim() || loading}
                          onClick={() => handlePasteRecoveryUrl(pastedLink)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition shrink-0 cursor-pointer"
                        >
                          {language === 'ar' ? 'تطبيق الرابط' : 'Apply'}
                        </button>
                      </div>
                      {pastingError && (
                        <p className="text-[11px] text-red-600 font-medium">{pastingError}</p>
                      )}
                    </div>
                  </div>

                  {/* Primary Direct Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredCode(recoveryCode);
                      setMode('updatePassword');
                      setMessage(
                        language === 'ar'
                          ? 'أدخل كلمة المرور الجديدة لحسابك الآن.'
                          : 'Please enter your new password now.'
                      );
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-red-600/20 cursor-pointer"
                  >
                    <ArrowIcon className="w-4 h-4" />
                    <span>
                      {language === 'ar'
                        ? 'تعيين كلمة المرور الجديدة الآن (مباشرة وبدون انتظار)'
                        : 'Set New Password Now (Instant & Direct)'}
                    </span>
                  </button>

                  <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEmailSent(false)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 py-1"
                    >
                      {language === 'ar' ? 'إدخال بريد إلكتروني آخر' : 'Enter different email address'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setMessage('');
                        setMode('login');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => handleForgot(e, false)} className="space-y-4">
                  {/* Explanation for why email might not arrive */}
                  <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl text-xs text-red-950 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold">
                        {language === 'ar'
                          ? 'هل انتظرت رسالة البريد ولم تصلك في الوارد أو الـ Junk؟ '
                          : 'Waited for reset email and nothing arrived in Inbox or Junk? '}
                      </span>
                      {language === 'ar'
                        ? 'نظراً لقيود تصفية الرسائل في مزودي البريد مثل Gmail، وفرنا لك خيار إعادة التعيين الفوري المباشر وكود أمان يظهر لك فوراً على الشاشة بدون أي انتظار.'
                        : 'Due to strict spam filters on Gmail/Outlook, we provide an Instant Direct Reset and immediate on-screen security code.'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {language === 'ar' ? 'البريد الإلكتروني المسجل' : 'Registered Email Address'}
                    </label>
                    <div className="relative">
                      <Mail
                        className={`w-4 h-4 text-slate-400 absolute top-3 ${
                          isRTL ? 'right-3' : 'left-3'
                        }`}
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 text-slate-900 ${
                          isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* Primary Button: Direct Instant Reset */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={(e) => handleForgot(e, true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{language === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>
                            {language === 'ar'
                              ? 'إعادة التعيين الفوري المباشر (بدون انتظار الإيميل)'
                              : 'Instant Direct Reset (Skip Email Wait)'}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Secondary Button: Standard Send & Show Code */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>
                            {language === 'ar'
                              ? 'إرسال وإظهار رمز الأمان الفوري'
                              : 'Send & Display Instant Security Code'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Helper for users returning with a localhost:3000 link */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowUrlPaster(!showUrlPaster)}
                      className="w-full text-center text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center justify-center gap-1.5 cursor-pointer py-1"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {language === 'ar'
                          ? 'وصلتك رسالة وتظهر لك صفحة «لا يمكن الوصول للموقع» (localhost)؟'
                          : 'Received email and got "Site can\'t be reached" (localhost)?'}
                      </span>
                    </button>

                    {showUrlPaster && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                        <p className="text-[11px] text-amber-900 leading-relaxed">
                          {language === 'ar'
                            ? 'انسخ الرابط من شريط عنوان الصفحة التي تعذر فتحها (http://localhost:3000/#access_token=...) وألصقه هنا لتطبيق الاستعادة فوراً:'
                            : 'Copy the URL from the unreachable tab (http://localhost:3000/#access_token=...) and paste it here:'}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={pastedLink}
                            onChange={(e) => {
                              setPastedLink(e.target.value);
                              setPastingError('');
                            }}
                            placeholder={
                              language === 'ar'
                                ? 'ألصق رابط المتصفح هنا...'
                                : 'Paste browser URL here...'
                            }
                            className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            disabled={!pastedLink.trim() || loading}
                            onClick={() => handlePasteRecoveryUrl(pastedLink)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition shrink-0 cursor-pointer"
                          >
                            {language === 'ar' ? 'تطبيق' : 'Apply'}
                          </button>
                        </div>
                        {pastingError && (
                          <p className="text-[11px] text-red-600 font-medium">{pastingError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setMessage('');
                        setMode('login');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* UPDATE NEW PASSWORD FORM */}
          {mode === 'updatePassword' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">
                    {language === 'ar' ? 'استعادة الحساب وتعيين كلمة المرور: ' : 'Account Recovery & Password Reset: '}
                  </span>
                  <span className="text-emerald-900">
                    {language === 'ar'
                      ? 'أدخل كلمة المرور الجديدة لحسابك لتحديثها وتسجيل الدخول فوراً.'
                      : 'Enter your new password to update your account and sign in immediately.'}
                  </span>
                </div>
              </div>

              {/* Account Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'ar' ? 'البريد الإلكتروني للحساب' : 'Account Email'} *
                </label>
                <div className="relative">
                  <Mail
                    className={`w-4 h-4 text-slate-400 absolute top-3 ${
                      isRTL ? 'right-3' : 'left-3'
                    }`}
                  />
                  <input
                    type="email"
                    required
                    value={resetAccountEmail || email}
                    onChange={(e) => {
                      setResetAccountEmail(e.target.value);
                      setEmail(e.target.value);
                    }}
                    placeholder="name@example.com"
                    className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 text-slate-900 ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              {/* Security / Verification Code */}
              {(recoveryCode || enteredCode) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {language === 'ar' ? 'رمز الأمان / التحقق' : 'Security / Verification Code'}
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      {language === 'ar' ? '✓ تم التحقق' : '✓ Verified'}
                    </span>
                  </div>
                  <div className="relative">
                    <KeyRound
                      className={`w-4 h-4 text-slate-400 absolute top-3 ${
                        isRTL ? 'right-3' : 'left-3'
                      }`}
                    />
                    <input
                      type="text"
                      value={enteredCode || recoveryCode}
                      onChange={(e) => setEnteredCode(e.target.value)}
                      placeholder="123456"
                      className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-mono font-bold text-slate-900 ${
                        isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <div className="relative">
                  <Lock
                    className={`w-4 h-4 text-slate-400 absolute top-3 ${
                      isRTL ? 'right-3' : 'left-3'
                    }`}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 text-slate-900 ${
                      isRTL ? 'pr-9 pl-9' : 'pl-9 pr-9'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-2.5 text-slate-400 hover:text-slate-600 p-1 ${
                      isRTL ? 'left-2' : 'right-2'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <KeyRound
                    className={`w-4 h-4 text-slate-400 absolute top-3 ${
                      isRTL ? 'right-3' : 'left-3'
                    }`}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600/30 focus:border-red-600 text-slate-900 ${
                      isRTL ? 'pr-9 pl-9' : 'pl-9 pr-9'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-red-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'ar' ? 'جاري حفظ كلمة المرور...' : 'Saving password...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {language === 'ar'
                        ? 'حفظ كلمة المرور وتسجيل الدخول فوراً'
                        : 'Save Password & Sign In Instantly'}
                    </span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMessage('');
                    setMode('login');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  {language === 'ar' ? 'إلغاء والعودة لتسجيل الدخول' : 'Cancel and Back to Sign In'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
