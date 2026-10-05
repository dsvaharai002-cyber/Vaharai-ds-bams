import React, { useState } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import { Lock, User as UserIcon, Eye, EyeOff, AlertCircle, Languages, Building, UserCheck } from 'lucide-react';
import { AppLogo } from './AppLogo';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  currentLang: Language;
  onToggleLang: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  currentLang,
  onToggleLang
}) => {
  const t = TRANSLATIONS[currentLang];
  const isTa = currentLang === 'ta';
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setTimeout(() => {
      const res = StorageService.login(userId, password);
      setLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || t.invalidCredentials);
      }
    }, 200);
  };

  const handleQuickLogin = (uid: string, pass: string) => {
    setUserId(uid);
    setPassword(pass);
    const res = StorageService.login(uid, pass);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />

      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={onToggleLang}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Languages className="w-3.5 h-3.5 text-emerald-400" />
          <span>{currentLang === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center px-4">
        <AppLogo size="xl" className="mx-auto mb-4 ring-2 ring-emerald-500/50 shadow-2xl" />
        <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
          {t.divisionSecretariat} • {t.district}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {t.appTitle}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          {t.subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-800/90 border border-slate-700/80 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-md">
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex gap-2 items-center">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.userId}
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={t.enterUserId}
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.password}
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={t.enterPassword}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors cursor-pointer"
              >
                {loading ? '...' : t.loginButton}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Official Government System • Democratic Socialist Republic of Sri Lanka
        </p>
      </div>
    </div>
  );
};
