import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import { AppLogo } from './AppLogo';
import {
  QrCode,
  User as UserIcon,
  ChevronDown,
  LogOut,
  Building,
  Shield,
  Languages,
  Users,
  HeartHandshake,
  Gift,
  ListTodo,
  FileCheck2,
  History,
  FileSpreadsheet,
  Menu,
  X,
  UserCheck,
  LayoutDashboard,
  Camera,
  FolderClock,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onOpenScanner: () => void;
  currentLang: Language;
  onToggleLang: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  onNavigate,
  onLogout,
  onOpenScanner,
  currentLang,
  onToggleLang
}) => {
  const t = TRANSLATIONS[currentLang];
  const isTa = currentLang === 'ta';
  const isReceptionist = currentUser.Role === 'Receptionist';
  const isSuperAdmin = currentUser.Role === 'Super Admin' || currentUser.Role === 'Super_Admin';
  const isAuditor = currentUser.Role === 'Auditor';

  // Submenu dropdown states
  const [openDropdown, setOpenDropdown] = useState<'registries' | 'services' | 'admin' | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visits = StorageService.getFilteredVisits(currentUser);
  const todayStr = new Date().toISOString().substring(0, 10);
  const waitingCount = visits.filter(v => v.Date === todayStr && v.Status === 'Waiting').length;

  const isRegistriesActive = ['registry', 'elderly', 'disability'].includes(activeTab);
  const isServicesActive = ['assistance', 'needs', 'requests'].includes(activeTab);
  const isAdminActive = ['audit', 'governance', 'sync'].includes(activeTab);

  const handleNavClick = (tab: string) => {
    onNavigate(tab);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs w-full">
      {/* Container carefully padded to prevent horizontal screen overflow on phones */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1 sm:gap-4">
          
          {/* Left: Official Logo + Brand Wordmark (Compact on mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
            <button
              onClick={() => handleNavClick(isReceptionist ? 'reception' : 'dashboard')}
              className="flex items-center gap-1.5 sm:gap-2.5 text-left group cursor-pointer min-w-0"
              title="Divisional Secretariat Vaharai • வாகரை பிரதேச செயலகம்"
            >
              {/* Official Logo (Requirement #4) */}
              <AppLogo size="sm" className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 ring-1 ring-slate-200" />
              
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight block leading-tight truncate">
                    {isTa ? 'கோறளைப்பற்று வடக்கு (வாகரை)' : 'Koralaipattu North (Vaharai)'}
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                    DS Office
                  </span>
                </div>
                <span className="text-[10px] text-emerald-800 font-semibold hidden md:block leading-tight truncate">
                  {isTa ? 'பிரதேச செயலகம் கோறளைப்பற்று வடக்கு வாகரை' : 'Divisional Secretariat Koralaipattu North Vaharai'}
                </span>
              </div>
            </button>
          </div>

          {/* Center Desktop Navigation: Condensed Submenus for laptop/desktop */}
          <nav ref={dropdownRef} className="hidden lg:flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isReceptionist ? (
              <button
                onClick={() => handleNavClick('reception')}
                className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'reception'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>{t.reception}</span>
                {waitingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-mono font-bold animate-pulse">
                    {waitingCount}
                  </span>
                )}
              </button>
            ) : (
              <>
                {/* 1. Dashboard */}
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>{t.dashboard}</span>
                </button>

                {/* 1B. AI Strategic Report (Requirement #05) */}
                <button
                  onClick={() => handleNavClick('ai_report')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'ai_report'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isTa ? 'ஏஐ அறிக்கை (AI Report)' : 'AI Strategic Report'}</span>
                </button>

                {/* 2. Reception Desk */}
                <button
                  onClick={() => handleNavClick('reception')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'reception'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.reception}</span>
                  {waitingCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-mono font-bold">
                      {waitingCount}
                    </span>
                  )}
                </button>

                {/* 3. Registries Submenu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'registries' ? null : 'registries')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                      isRegistriesActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.menuRegistries}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'registries' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'registries' && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in duration-100">
                      <button
                        onClick={() => handleNavClick('registry')}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                          activeTab === 'registry' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <Users className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold">{t.registry}</div>
                          <div className="text-[10px] text-slate-400">{isTa ? 'குடும்பங்கள் & உறுப்பினர்கள்' : 'Household Vulnerability'}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleNavClick('elderly')}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                          activeTab === 'elderly' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="font-semibold">{t.elderly}</div>
                          <div className="text-[10px] text-slate-400">{isTa ? 'முதியோர் கொடுப்பனவு & வயது' : 'Age 60+ & 70+ Allowance'}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleNavClick('disability')}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                          activeTab === 'disability' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <HeartHandshake className="w-4 h-4 text-indigo-600" />
                        <div>
                          <div className="font-semibold">{t.disability}</div>
                          <div className="text-[10px] text-slate-400">{isTa ? 'உபகரணங்கள் & கொடுப்பனவு' : 'Mobility & Welfare Devices'}</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Services & Aid Submenu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'services' ? null : 'services')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                      isServicesActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.menuServices}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'services' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'services' && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in duration-100">
                      {!isAuditor && (
                        <button
                          onClick={() => handleNavClick('assistance')}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                            activeTab === 'assistance' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <Gift className="w-4 h-4 text-emerald-600" />
                          <div>
                            <div className="font-semibold">{t.assistance}</div>
                            <div className="text-[10px] text-slate-400">{isTa ? 'உதவி வழங்கல் & CSV பதிவேற்றம்' : 'Aid Disbursal & CSV Bulk'}</div>
                          </div>
                        </button>
                      )}
                      <button
                        onClick={() => handleNavClick('needs')}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                          activeTab === 'needs' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <ListTodo className="w-4 h-4 text-rose-600" />
                        <div>
                          <div className="font-semibold">{t.needs}</div>
                          <div className="text-[10px] text-slate-400">{isTa ? 'குடும்பங்களின் தேவைகள் பதிவு' : 'Identified Family Needs'}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleNavClick('requests')}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                          activeTab === 'requests' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <FileCheck2 className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-semibold">{t.requests}</div>
                          <div className="text-[10px] text-slate-400">{isTa ? 'அடையாள அட்டை மாற்றுக் கோரிக்கை' : 'NIC / Elder ID Approvals'}</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Admin Submenu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'admin' ? null : 'admin')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                      isAdminActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.menuAdmin}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'admin' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'admin' && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in duration-100">
                      <button
                        onClick={() => handleNavClick('audit')}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                          activeTab === 'audit' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <History className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold">{t.audit}</div>
                          <div className="text-[10px] text-slate-400">{isTa ? 'அனைத்து வரலாற்றுப் பதிவுகள்' : 'System Audit Trail'}</div>
                        </div>
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleNavClick('governance')}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                            activeTab === 'governance' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <Shield className="w-4 h-4 text-purple-600" />
                          <div>
                            <div className="font-semibold">{t.governance}</div>
                            <div className="text-[10px] text-slate-400">{isTa ? 'உத்தியோகத்தர் கணக்குகள் & திட்டங்கள்' : 'Manage Officers & Roles'}</div>
                          </div>
                        </button>
                      )}
                      <button
                        onClick={() => handleNavClick('sync')}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                          activeTab === 'sync' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-semibold">{t.sync}</div>
                          <div className="text-[10px] text-slate-400">{isTa ? 'Google Sheets நேரலை இணைப்பு' : 'Apps Script Cloud Sync'}</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>

          {/* Right Action Icons: Phone responsive layout (Requirement #3) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Language Toggle: Compact on mobile phones */}
            <button
              onClick={onToggleLang}
              title="Toggle English / தமிழ்"
              className="px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">{currentLang === 'en' ? 'தமிழ்' : 'English'}</span>
              <span className="sm:hidden font-mono uppercase font-bold text-[10px]">{currentLang === 'en' ? 'TA' : 'EN'}</span>
            </button>

            {/* Camera QR Scanner button: Available to ALL users including Receptionist (Requirement #2) */}
            <button
              onClick={onOpenScanner}
              title={isTa ? 'கெமரா QR ஸ்கேனர்' : 'Camera QR Scanner'}
              className="p-1.5 sm:p-2 text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer shrink-0"
            >
              <Camera className="w-4 h-4 text-emerald-700" />
            </button>

            {/* User Account Dropdown: Ultra compact circle on phone, extended on desktop */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1 sm:gap-2 p-1 sm:px-2 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-slate-800 cursor-pointer"
                title={`${currentUser.Name} (${currentUser.Role})`}
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0">
                  {currentUser.User_ID.substring(0, 2).toUpperCase()}
                </div>
                <div className="hidden md:block text-left max-w-[100px]">
                  <span className="font-bold text-xs text-slate-900 block leading-tight truncate">
                    {currentUser.Name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-tight font-mono truncate">
                    {currentUser.Role === 'Receptionist' ? (isTa ? 'வரவேற்பாளர்' : 'Receptionist') : currentUser.Division}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 hidden sm:block" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in duration-100">
                  <div className="px-4 py-3 border-b border-slate-100 space-y-1">
                    <p className="text-xs font-bold text-slate-900">{currentUser.Name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ID: {currentUser.User_ID} • {currentUser.Role}
                    </p>
                    <div className="pt-1 flex flex-wrap gap-1">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {isTa ? 'பிரிவு: ' : 'Division: '}
                        {currentUser.Division === 'ALL' ? (isTa ? 'அனைத்து 16 பிரிவுகள்' : 'All 16 GN Divisions') : currentUser.Division}
                      </span>
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {isTa ? 'செயலில் உள்ளது' : 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 py-2 px-3 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.signOut} ({isTa ? 'கணக்கிலிருந்து வெளியேறு' : 'Logout'})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle: Accessible on small phone screens (Requirement #3) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER: Tailored for phone screens (Requirement #3) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-3 py-3 space-y-3 shadow-xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-1 duration-150">
          {/* User profile card inside mobile menu */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <AppLogo size="xs" className="ring-1 ring-slate-300 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-xs text-slate-900 block truncate">{currentUser.Name}</span>
                <span className="text-[10px] text-emerald-800 font-mono block truncate">
                  {currentUser.Role} • {currentUser.Division}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Scanner button inside mobile drawer for quick finger access */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenScanner();
            }}
            className="w-full py-2 px-3 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>{isTa ? 'கெமரா மூலம் QR ஸ்கேன் செய்க' : 'Open Camera to Scan QR'}</span>
          </button>

          {/* If Receptionist: STRICTLY RECEPTION MENU ON PHONE */}
          {isReceptionist ? (
            <div className="space-y-2">
              <button
                onClick={() => handleNavClick('reception')}
                className="w-full text-left px-3.5 py-3 text-xs font-bold rounded-xl bg-emerald-600 text-white flex items-center justify-between shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4" />
                  <span>{t.reception}</span>
                </div>
                {waitingCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[10px] font-mono font-bold">
                    {waitingCount} {isTa ? 'காத்திருப்பு' : 'waiting'}
                  </span>
                )}
              </button>
            </div>
          ) : (
            /* Non-receptionist roles: Mobile Menu categorized neatly */
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-50 text-slate-800 border border-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-500" />
                  <span>{t.dashboard}</span>
                </button>

                <button
                  onClick={() => handleNavClick('reception')}
                  className={`p-2.5 rounded-xl font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'reception' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-50 text-slate-800 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    <span>{t.reception}</span>
                  </div>
                  {waitingCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-mono">
                      {waitingCount}
                    </span>
                  )}
                </button>
              </div>

              <button
                onClick={() => handleNavClick('ai_report')}
                className={`w-full p-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'ai_report'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>
                  {isTa
                    ? 'ஏஐ மூலோபாய அறிக்கை (AI Priority Report)'
                    : 'AI Strategic Priority Report'}
                </span>
              </button>

              {/* Registries Section */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  {t.menuRegistries}
                </div>
                <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-1 space-y-0.5">
                  <button
                    onClick={() => handleNavClick('registry')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer ${
                      activeTab === 'registry' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>{t.registry}</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('elderly')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer ${
                      activeTab === 'elderly' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{t.elderly}</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('disability')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer ${
                      activeTab === 'disability' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <HeartHandshake className="w-4 h-4" />
                    <span>{t.disability}</span>
                  </button>
                </div>
              </div>

              {/* Services & Aid Section */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  {t.menuServices}
                </div>
                <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-1 space-y-0.5">
                  {!isAuditor && (
                    <button
                      onClick={() => handleNavClick('assistance')}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer ${
                        activeTab === 'assistance' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <Gift className="w-4 h-4" />
                      <span>{t.assistance}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleNavClick('needs')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer ${
                      activeTab === 'needs' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>{t.needs}</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('requests')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer ${
                      activeTab === 'requests' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>{t.requests}</span>
                  </button>
                </div>
              </div>

              {/* Administration Section */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  {t.menuAdmin}
                </div>
                <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-1 space-y-0.5">
                  <button
                    onClick={() => handleNavClick('audit')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer ${
                      activeTab === 'audit' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>{t.audit}</span>
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleNavClick('governance')}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer ${
                        activeTab === 'governance' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      <span>{t.governance}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleNavClick('sync')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer ${
                      activeTab === 'sync' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{t.sync}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
export default Header;
