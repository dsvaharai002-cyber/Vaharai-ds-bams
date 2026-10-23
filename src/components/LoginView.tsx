import React, { useState } from 'react';
import { User } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';

interface LoginViewProps {
  users: User[];
  lang: Language;
  setLang: (lang: Language) => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  lang,
  setLang,
  onLoginSuccess,
}) => {
  const t = translations[lang];

  const [userIdInput, setUserIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedId = userIdInput.trim();
    const trimmedPw = passwordInput.trim();

    const matched = users.find(
      (u) => u.id === trimmedId && u.password === trimmedPw
    );

    if (matched) {
      if (matched.status === 'INACTIVE') {
        setErrorMsg(lang === 'ta' ? 'உங்கள் கணக்கு முடக்கப்பட்டுள்ளது. தலைமை நிர்வாகியை அணுகவும்.' : 'Your account is deactivated. Contact Super Administrator.');
        return;
      }
      onLoginSuccess(matched);
    } else {
      setErrorMsg(t.invalidCredentials);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

      {/* Language Switcher Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white text-xs border border-slate-700 transition-colors shadow-sm"
        >
          <span>🌐</span>
          <span>{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Official Header Strip with Vaharai Logo */}
        <div className="bg-emerald-950 p-6 text-white text-center border-b border-emerald-900">
          <div className="w-16 h-16 mx-auto rounded-full bg-white p-1 border-2 border-amber-400 flex items-center justify-center shadow-lg mb-3">
            <VaharaiLogo size={56} className="w-14 h-14" />
          </div>
          <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
            {t.republicSriLanka}
          </div>
          <h1 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
            {t.appTitle}
          </h1>
          <p className="text-xs text-emerald-200 mt-1 font-medium">
            {t.batticaloaDistrict} · {t.portalShort}
          </p>
        </div>

        {/* Login Form */}
        <div className="p-5 sm:p-6">
          <div className="text-center mb-5">
            <h2 className="text-base font-bold text-slate-900">{t.loginTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.loginSubtitle}</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.userId}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 789, 456, 457, 999, 123"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.password} (பாஸ்வேட்)
              </label>
              <input
                type="password"
                required
                placeholder="••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              {t.login}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
