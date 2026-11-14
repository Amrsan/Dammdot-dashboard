import React, { useState } from 'react';
import { Droplets, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useAdminI18n } from '../lib/i18n';
import { backendMode, signIn, signInLocalDemo } from '../data/adminApi';
import type { AdminSession } from '../lib/types';
import { InlineNotice } from '../components/ui';

export const LoginPage: React.FC<{ onAuthenticated: (session: AdminSession) => void }> = ({ onAuthenticated }) => {
  const { t, lang, setLang, dir } = useAdminI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const session = await signIn(email, password);
      onAuthenticated(session);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'invalid_credentials';
      if (code === 'not_staff') setError(t('login.denied'));
      else if (code === 'supabase_not_configured') setError(t('error.supabase'));
      else setError(t('login.invalid'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir={dir}
      className="flex min-h-screen items-center justify-center bg-[#0b1220] px-4 py-10"
      style={{
        backgroundImage:
          'radial-gradient(60% 60% at 15% 10%, rgba(200,16,46,0.18) 0%, rgba(11,18,32,0) 60%), radial-gradient(50% 50% at 85% 90%, rgba(14,165,233,0.10) 0%, rgba(11,18,32,0) 60%)',
      }}
    >
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#c8102e] shadow-[0_2px_10px_rgba(200,16,46,0.4)]">
              <Droplets className="h-[18px] w-[18px] text-white" />
            </span>
            <div>
              <p className="text-[14px] font-bold tracking-tight text-white">HemoPortal</p>
              <p className="text-[9.5px] font-medium uppercase tracking-[0.18em] text-slate-400">
                {t('app.section')}
              </p>
            </div>
          </div>
          <div className="flex rounded-md border border-white/15 p-0.5">
            {(['en', 'ar'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={
                  lang === code
                    ? 'rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-bold text-white'
                    : 'rounded px-1.5 py-0.5 text-[10.5px] font-bold text-slate-400'
                }
              >
                {code === 'en' ? 'EN' : 'ع'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">
          <h1 className="text-[17px] font-semibold tracking-tight text-slate-900">{t('login.title')}</h1>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{t('login.subtitle')}</p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                {t('login.email')}
              </span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 focus:border-[#c8102e]/40 focus:outline-none focus:ring-2 focus:ring-[#c8102e]/10"
                placeholder="name@hemoportal.com"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                {t('login.password')}
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 focus:border-[#c8102e]/40 focus:outline-none focus:ring-2 focus:ring-[#c8102e]/10"
                placeholder="••••••••"
              />
            </label>

            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#c8102e] text-[13px] font-semibold text-white transition-colors hover:bg-[#a90d26] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              {submitting ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          {backendMode === 'local' ? (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <InlineNotice tone="warning">{t('login.localBanner')}</InlineNotice>
              <button
                type="button"
                onClick={() => onAuthenticated(signInLocalDemo())}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('login.demo')}
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-500">
          <ShieldCheck className="h-3 w-3" />
          {t('common.poweredBy')}
        </p>
      </div>
    </div>
  );
};
