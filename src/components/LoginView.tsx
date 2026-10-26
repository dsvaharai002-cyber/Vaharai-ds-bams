import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { DEFAULT_GN_DIVISIONS } from '../services/storage';
import { UserPlus, LogIn, ShieldCheck, Lock, User as UserIcon, Building2 } from 'lucide-react';

interface LoginViewProps {
  users: User[];
  lang: Language;
  setLang: (lang: Language) => void;
  onLoginSuccess: (user: User) => void;
  onRegisterUser?: (newUser: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  lang,
  setLang,
  onLoginSuccess,
  onRegisterUser,
}) => {
  const t = translations[lang];

  // If no users registered yet, prompt first-time administrator setup automatically
  const isFirstTimeSetup = users.length === 0;
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(isFirstTimeSetup);

  // Login Form State
  const [userIdInput, setUserIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Register Form State
  const [regId, setRegId] = useState(isFirstTimeSetup ? '789' : '');
  const [regName, setRegName] = useState(isFirstTimeSetup ? 'பிரதேச செயலாளர் (Divisional Secretary)' : '');
  const [regRole, setRegRole] = useState<UserRole>(isFirstTimeSetup ? 'SUPERADMIN' : 'ADMIN 1');
  const [regDivision, setRegDivision] = useState<string>('211');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedId = userIdInput.trim();
    const trimmedPw = passwordInput.trim();

    const matched = users.find((u) => u.id === trimmedId && u.password === trimmedPw);

    if (matched) {
      if (matched.status === 'INACTIVE') {
        setErrorMsg(
          lang === 'ta'
            ? 'உங்கள் கணக்கு முடக்கப்பட்டுள்ளது. தலைமை நிர்வாகியை அணுகவும்.'
            : 'Your account is deactivated. Contact Super Administrator.'
        );
        return;
      }
      onLoginSuccess(matched);
    } else {
      setErrorMsg(
        lang === 'ta'
          ? 'தவறான பயனர் இலக்கம் அல்லது கடவுச்சொல்! சரியான விபரங்களை உள்ளிடவும்.'
          : 'Invalid User ID or Password! Please verify your official credentials.'
      );
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const id = regId.trim();
    const name = regName.trim();
    const password = regPassword.trim();

    if (!id || !name || !password) {
      setErrorMsg(lang === 'ta' ? 'அனைத்து விபரங்களும் கட்டாயம் தேவை!' : 'All fields are required!');
      return;
    }

    if (password.length < 3) {
      setErrorMsg(
        lang === 'ta'
          ? 'கடவுச்சொல் குறைந்தது 3 எழுத்துக்களை கொண்டிருக்க வேண்டும்!'
          : 'Password must be at least 3 characters long!'
      );
      return;
    }

    if (password !== regConfirmPassword.trim()) {
      setErrorMsg(
        lang === 'ta'
          ? 'கடவுச்சொல் உறுதிப்படுத்தல் பொருந்தவில்லை!'
          : 'Password confirmation does not match!'
      );
      return;
    }

    // Check duplicate ID
    if (users.some((u) => u.id === id)) {
      setErrorMsg(
        lang === 'ta'
          ? `பயனர் இலக்கம் "${id}" ஏற்கனவே பயன்பாட்டில் உள்ளது! வேறு இலக்கத்தைத் தேர்வுசெய்யவும்.`
          : `User ID "${id}" is already registered! Please choose a different ID.`
      );
      return;
    }

    const newUser: User = {
      id,
      name,
      password,
      role: isFirstTimeSetup ? 'SUPERADMIN' : regRole,
      division: regRole === 'GRAMANIILATHARI' ? regDivision : 'ALL',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    if (onRegisterUser) {
      onRegisterUser(newUser);
    } else {
      onLoginSuccess(newUser);
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

        {/* Form Container */}
        <div className="p-5 sm:p-6">
          {/* Mode Header & Toggle Tabs */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isRegisterMode
                  ? isFirstTimeSetup
                    ? (lang === 'ta' ? 'முதன்முறை தலைமை நிர்வாகி பதிவு' : 'Initial Super Admin Setup')
                    : (lang === 'ta' ? 'புதிய அலுவலர் பதிவு' : 'New Staff Registration')
                  : t.loginTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRegisterMode
                  ? (lang === 'ta' ? 'உத்தியோகபூர்வ கணக்கை உருவாக்கி உள்நுழையவும்' : 'Create official account and get started')
                  : t.loginSubtitle}
              </p>
            </div>

            {!isFirstTimeSetup && (
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
              >
                {isRegisterMode ? (
                  <>
                    <LogIn className="w-3 h-3" />
                    <span>{lang === 'ta' ? 'உள்நுழைக' : 'Sign In'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" />
                    <span>{lang === 'ta' ? 'புதிய பதிவு' : 'Register'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold animate-in fade-in">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold animate-in fade-in">
              ✓ {successMsg}
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {!isRegisterMode && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.userId}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 789, 456, 101..."
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.password}</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.login}</span>
              </button>
            </form>
          )}

          {/* 2. REGISTRATION FORM (Fresh Official Setup without mock defaults) */}
          {isRegisterMode && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {isFirstTimeSetup && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950 font-medium space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>{lang === 'ta' ? 'புதிய தொடக்கம் (Clean Initial State):' : 'Initial Fresh Launch:'}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {lang === 'ta'
                      ? 'அனைத்து மாதிரி தரவுகள் மற்றும் முன்னிருப்பு கடவுச்சொற்கள் நீக்கப்பட்டுள்ளன. தயவுசெய்து எமது பிரதேச செயலகத்தின் பிரதான தலைமை நிர்வாகி கணக்கை முதலில் உருவாக்கவும்.'
                      : 'All sample mock data and default passwords have been cleared. Please create the initial Super Administrator account for your Divisional Secretariat.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'அலுவலர் இலக்கம் (Staff ID):' : 'Staff ID:'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 789"
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'பதவி (Official Role):' : 'Official Role:'} *
                  </label>
                  <select
                    disabled={isFirstTimeSetup}
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-semibold"
                  >
                    <option value="SUPERADMIN">பிரதேச செயலாளர் (Super Admin)</option>
                    <option value="ADMIN 1">அட்மின் 01 (Admin 1)</option>
                    <option value="ADMIN 2">அட்மின் 02 (Admin 2)</option>
                    <option value="GRAMANIILATHARI">கிராம அலுவலர் (Grama Niladhari)</option>
                    <option value="DISABILITY_OFFICER">மாற்றுத்திறனாளிகள் பதிவாளர் (Disability Officer)</option>
                    <option value="ECDO">கர்ப்பிணித் தாய் பதிவாளர் (ECDO Officer)</option>
                    <option value="WHH_OFFICER">பெண் தலைமைத்துவ அலுவலர் (WHH Officer)</option>
                    <option value="SAMURDHI_OFFICER">சமூர்த்தி / அஸ்வெசும அலுவலர்</option>
                    <option value="Reception Registrar">வரவேற்பக உத்தியோகத்தர் (Reception)</option>
                    <option value="DATAENRY OFFCER">தரவு உள்ளீட்டு அலுவலர் (Data Entry)</option>
                    <option value="NORMAL">நேரலை காட்சி திரை (Live TV Counter Mode)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ta' ? 'அலுவலர் பெயர் (Official Name):' : 'Official Full Name:'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. க. சிறிதரன் (Divisional Secretary)"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {regRole === 'GRAMANIILATHARI' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'ஒதுக்கப்பட்ட கிராம அலுவலர் பிரிவு:' : 'Assigned GN Division:'}
                  </label>
                  <select
                    value={regDivision}
                    onChange={(e) => setRegDivision(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {DEFAULT_GN_DIVISIONS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nameTa} ({d.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'கடவுச்சொல் (Password):' : 'Password:'} *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'உறுதிப்படுத்தல்:' : 'Confirm:'} *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 mt-2"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>
                  {isFirstTimeSetup
                    ? (lang === 'ta' ? 'தலைமை நிர்வாகியாக பதிவு செய்து ஆரம்பிக்க' : 'Register as Super Admin & Launch')
                    : (lang === 'ta' ? 'கணக்கை பதிவு செய்க' : 'Register Account')}
                </span>
              </button>
            </form>
          )}

          {/* Secure System Footer Note */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5 font-mono">
            <Building2 className="w-3 h-3 text-emerald-800" />
            <span>கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகம் · அதிகாரபூர்வ தளம்</span>
          </div>
        </div>
      </div>
    </div>
  );
};
