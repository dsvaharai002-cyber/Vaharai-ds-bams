import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import {
  LayoutDashboard,
  Users,
  Ticket,
  Tv,
  Sparkles,
  FileSpreadsheet,
  HardDrive,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  ScanLine,
  LogOut,
  FolderKanban,
  Settings2,
  CheckCircle2,
  ClipboardList,
  Gift,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  onLogout: () => void;
  onOpenScanner: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  onLogout,
  onOpenScanner,
}) => {
  const t = translations[lang];

  // RBAC permissions
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const isAdmin = currentUser?.role === 'ADMIN 1' || currentUser?.role === 'ADMIN 2' || isSuperAdmin;
  const isReception = currentUser?.role === 'Reception Registrar';
  const isNormal = currentUser?.role === 'NORMAL'; // Dedicated Public Live Counter TV Display role

  const canAccessStaff = isSuperAdmin;
  const canAccessDrive = isAdmin;
  const canAccessAi = isAdmin;
  const canAccessBeneficiaries = !isReception && !isNormal;
  const canAccessCsv = (isAdmin || currentUser?.role === 'DATAENRY OFFCER') && !isNormal;
  const canAccessDashboard = !isNormal;
  const canAccessReception = !isNormal;

  // Active dropdown menu states (desktop)
  const [openMenu, setOpenMenu] = useState<'public' | 'registry' | 'admin' | null>(null);
  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDropdown = (menu: 'public' | 'registry' | 'admin') => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    setOpenMenu(null);
    setMobileMenuOpen(false);
  };

  // Determine which sub-menu is currently active
  const isPublicServicesActive = currentTab === 'reception' || currentTab === 'live-display';
  const isRegistryActive = currentTab === 'beneficiaries' || currentTab === 'assistance' || currentTab === 'csv' || currentTab === 'ai-report';
  const isAdminActive = currentTab === 'staff' || currentTab === 'drive' || currentTab === 'service-audit';

  // Sub-menu definitions
  const publicServiceItems = [
    ...(canAccessReception
      ? [
          {
            id: 'reception',
            title: t.navReception,
            subtitle: lang === 'ta' ? 'டோக்கன் வழங்கல் & வரிசை மேலாண்மை' : 'Issue queue token & counter assignment',
            icon: Ticket,
            badge: null,
          },
        ]
      : []),
    {
      id: 'live-display',
      title: t.navLiveDisplay,
      subtitle: lang === 'ta' ? 'அழைப்பு ஒலி & டிவி காட்சிப் பலகை' : 'Real-time queue display screen with voice callout',
      icon: Tv,
      badge: lang === 'ta' ? 'நேரலை' : 'Live TV',
    },
    ...(!isNormal
      ? [
          {
            id: 'scanner-action',
            title: t.quickScanner,
            subtitle: t.quickScannerDesc,
            icon: ScanLine,
            badge: lang === 'ta' ? 'விரைவு' : 'Action',
            isAction: true,
          },
        ]
      : []),
  ];

  const registryItems = [
    ...(canAccessBeneficiaries
      ? [
          {
            id: 'beneficiaries',
            title: t.navBeneficiaries,
            subtitle: lang === 'ta' ? 'பிரஜை விபரம், அட்டை & வடிகட்டல்' : 'Citizen records, identity cards & chronic illness',
            icon: Users,
            badge: null,
          },
        ]
      : []),
    ...(!isReception && !isNormal
      ? [
          {
            id: 'assistance',
            title: lang === 'ta' ? 'உதவி வழங்கல் & இரட்டை உதவி தடுப்பு' : 'Relief & Anti-Duplication Desk',
            subtitle: lang === 'ta' ? 'சிஎஸ்வி மாதிரி, அப்லோட் & குடும்ப QR சரிபார்ப்பு' : 'CSV model, bulk upload & duplicate prevention',
            icon: Gift,
            badge: lang === 'ta' ? 'நிவாரணம்' : 'Relief',
          },
        ]
      : []),
    ...(canAccessCsv
      ? [
          {
            id: 'csv',
            title: t.navCsv,
            subtitle: lang === 'ta' ? 'CSV பதிவேற்றம், இறக்கம் & காப்பு' : 'Upload or export Excel/CSV spreadsheets',
            icon: FileSpreadsheet,
            badge: null,
          },
        ]
      : []),
    ...(canAccessAi
      ? [
          {
            id: 'ai-report',
            title: t.navAiReport,
            subtitle: lang === 'ta' ? 'தேவைகள் பகுப்பாய்வு & நிறைவேற்று அறிக்கை' : 'Executive needs assessment & planning report',
            icon: Sparkles,
            badge: 'AI',
          },
        ]
      : []),
  ];

  const adminItems = [
    ...(canAccessStaff
      ? [
          {
            id: 'staff',
            title: t.navStaff,
            subtitle: lang === 'ta' ? 'அலுவலர் கணக்குகள் & பாதுகாப்பு அனுமதிகள்' : 'Super Admin RBAC access control & users',
            icon: ShieldCheck,
            badge: 'SuperAdmin',
          },
        ]
      : []),
    ...(canAccessDrive
      ? [
          {
            id: 'drive',
            title: t.navDrive,
            subtitle: lang === 'ta' ? 'கூகிள் டிரைவ் மேகக் காப்புநகல் & மீளமைத்தல்' : 'Google Drive cloud database backup & restore',
            icon: HardDrive,
            badge: 'Cloud',
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: 'service-audit',
            title: lang === 'ta' ? 'சேவை தணிக்கை & நிறைவடையாதோர்' : 'Service Audit & Incomplete Records',
            subtitle: lang === 'ta' ? 'நிறைவு அடையாதோர் & நிறைவு செய்த உத்தியோகத்தர் (திகதி வாரியாக)' : 'Pending tokens, completed officers & star ratings by date',
            icon: ClipboardList,
            badge: lang === 'ta' ? 'அட்மின் போல்டர்' : 'Admin Folder',
          },
        ]
      : []),
  ];

  const hasPublicServices = publicServiceItems.length > 0;
  const hasRegistry = registryItems.length > 0;
  const hasAdmin = adminItems.length > 0;

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print w-full max-w-full overflow-x-hidden"
    >
      {/* 1. Official Government Top Strip */}
      <div className="bg-emerald-950 text-emerald-100 text-[11px] px-3 sm:px-6 py-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="font-semibold truncate">{t.republicSriLanka}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{t.batticaloaDistrict}</span>
          {currentUser && (
            <>
              <span className="hidden sm:inline">·</span>
              <span className="bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded font-mono text-[10px] whitespace-nowrap font-bold">
                {currentUser.role} {currentUser.division && currentUser.division !== 'ALL' ? `(${currentUser.division})` : ''}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-emerald-900 transition-colors text-white font-bold text-xs"
            title="Switch Language"
          >
            <span>🌐</span>
            <span>{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Navigation Bar with Compact Sub-menus */}
      <div className="px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4 relative">
        {/* Zone 1: Branding Logo & Office Title */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
          <button
            onClick={() => !isNormal && handleSelectTab('dashboard')}
            className="flex items-center gap-2 text-left group focus:outline-none"
          >
            <div className="p-0.5 bg-white rounded-full shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <VaharaiLogo size={32} className="w-8 h-8" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate max-w-[175px] sm:max-w-[260px] md:max-w-none">
                {lang === 'ta' ? 'வாகரை பிரதேச செயலகம்' : 'Koralaipattu North DS'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium truncate hidden md:block">
                {isNormal
                  ? (lang === 'ta' ? 'நேரலை கவுண்டர் காட்சிப் பலகை' : 'Live Counter Display TV')
                  : (lang === 'ta' ? 'ஒருங்கிணைந்த நிர்வாக & பிரஜைகள் சேவை' : 'Integrated Management & Citizen Portal')}
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Categorized Sub-Menu Navigation for Desktop & Laptops */}
        {currentUser && !isNormal && (
          <nav className="hidden lg:flex items-center gap-1.5">
            {/* 1. Dashboard (Direct) */}
            {canAccessDashboard && (
              <button
                onClick={() => handleSelectTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{t.navDashboard}</span>
              </button>
            )}

            {/* 2. Sub-Menu: Public Services */}
            {hasPublicServices && (
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('public')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isPublicServicesActive
                      ? 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300'
                      : openMenu === 'public'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                  aria-expanded={openMenu === 'public'}
                >
                  <Ticket className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t.menuPublicServices}</span>
                  {isPublicServicesActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                      openMenu === 'public' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu Panel */}
                {openMenu === 'public' && (
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                      <span>{t.menuPublicServices}</span>
                      <span className="text-[9px] text-slate-400 font-normal">Sub-menu</span>
                    </div>
                    <div className="space-y-1">
                      {publicServiceItems.map((item) => {
                        const Icon = item.icon;
                        const isCurrent = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.isAction) {
                                setOpenMenu(null);
                                onOpenScanner();
                              } else {
                                handleSelectTab(item.id);
                              }
                            }}
                            className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors group ${
                              isCurrent
                                ? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200'
                                : 'hover:bg-slate-50 text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            <div
                              className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold truncate leading-tight">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 text-amber-800 shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                                {isCurrent && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-tight">
                                {item.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Sub-Menu: Registry & Analytics */}
            {hasRegistry && (
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('registry')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isRegistryActive
                      ? 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300'
                      : openMenu === 'registry'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                  aria-expanded={openMenu === 'registry'}
                >
                  <FolderKanban className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t.menuRegistryAnalytics}</span>
                  {isRegistryActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                      openMenu === 'registry' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu Panel */}
                {openMenu === 'registry' && (
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                      <span>{t.menuRegistryAnalytics}</span>
                      <span className="text-[9px] text-slate-400 font-normal">Sub-menu</span>
                    </div>
                    <div className="space-y-1">
                      {registryItems.map((item) => {
                        const Icon = item.icon;
                        const isCurrent = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectTab(item.id)}
                            className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors group ${
                              isCurrent
                                ? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200'
                                : 'hover:bg-slate-50 text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            <div
                              className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold truncate leading-tight">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 text-amber-800 shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                                {isCurrent && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-tight">
                                {item.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Sub-Menu: Administration & System */}
            {hasAdmin && (
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isAdminActive
                      ? 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300'
                      : openMenu === 'admin'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                  aria-expanded={openMenu === 'admin'}
                >
                  <Settings2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t.menuAdministration}</span>
                  {isAdminActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                      openMenu === 'admin' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu Panel */}
                {openMenu === 'admin' && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                      <span>{t.menuAdministration}</span>
                      <span className="text-[9px] text-slate-400 font-normal">Sub-menu</span>
                    </div>
                    <div className="space-y-1">
                      {adminItems.map((item) => {
                        const Icon = item.icon;
                        const isCurrent = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectTab(item.id)}
                            className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors group ${
                              isCurrent
                                ? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200'
                                : 'hover:bg-slate-50 text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            <div
                              className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold truncate leading-tight">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-100 text-emerald-900 shrink-0 font-mono">
                                    {item.badge}
                                  </span>
                                )}
                                {isCurrent && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-tight">
                                {item.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        )}

        {/* Dedicated Live Counter view role badge */}
        {currentUser && isNormal && (
          <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-950 px-3 py-1 rounded-lg text-xs font-bold">
            <Tv className="w-4 h-4 text-amber-600" />
            <span>Dedicated Live TV Screen Mode</span>
          </div>
        )}

        {/* Zone 3: Quick Action, User Profile & Mobile Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {currentUser ? (
            <>
              {/* Quick Scanner Action button */}
              {!isNormal && (
                <button
                  onClick={onOpenScanner}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition-colors"
                  title="Barcode / NIC Scanner"
                >
                  <ScanLine className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline font-semibold">
                    {lang === 'ta' ? 'பார்கோட்' : 'Scanner'}
                  </span>
                </button>
              )}

              {/* User Session Info */}
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[110px]">
                    {currentUser.name.split('(')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ID: {currentUser.id}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                  title={t.logout}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.logout}</span>
                </button>
              </div>

              {/* Mobile Menu Hamburger Toggle */}
              {!isNormal && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5 text-slate-900" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <Menu className="w-5 h-5 text-slate-900" />
                      <span className="text-[11px] font-bold pr-0.5">
                        {lang === 'ta' ? 'மெனு' : 'Menu'}
                      </span>
                    </div>
                  )}
                </button>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500 font-medium">
              {lang === 'ta' ? 'உள்நுழைக' : 'Please Sign In'}
            </span>
          )}
        </div>
      </div>

      {/* 3. In-Page Sub-Menu Quick Switching Strip (Breadcrumb / Quick Siblings) */}
      {currentUser && !isNormal && (
        <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-6 py-1.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">
              {currentTab === 'dashboard'
                ? (lang === 'ta' ? 'முதன்மை நிலை:' : 'Section:')
                : isPublicServicesActive
                ? `${t.menuPublicServices}:`
                : isRegistryActive
                ? `${t.menuRegistryAnalytics}:`
                : `${t.menuAdministration}:`}
            </span>

            {/* Quick Sibling Sub-menu Chips */}
            {isPublicServicesActive && (
              <div className="flex items-center gap-1 shrink-0">
                {canAccessReception && (
                  <button
                    onClick={() => handleSelectTab('reception')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      currentTab === 'reception'
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    🎫 {t.navReception}
                  </button>
                )}
                <button
                  onClick={() => handleSelectTab('live-display')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    currentTab === 'live-display'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  📺 {t.navLiveDisplay}
                </button>
              </div>
            )}

            {isRegistryActive && (
              <div className="flex items-center gap-1 shrink-0">
                {canAccessBeneficiaries && (
                  <button
                    onClick={() => handleSelectTab('beneficiaries')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      currentTab === 'beneficiaries'
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    👥 {t.navBeneficiaries}
                  </button>
                )}
                {canAccessCsv && (
                  <button
                    onClick={() => handleSelectTab('csv')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      currentTab === 'csv'
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    📁 {t.navCsv}
                  </button>
                )}
                {canAccessAi && (
                  <button
                    onClick={() => handleSelectTab('ai-report')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      currentTab === 'ai-report'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ✨ {t.navAiReport}
                  </button>
                )}
              </div>
            )}

            {isAdminActive && (
              <div className="flex items-center gap-1 shrink-0">
                {canAccessStaff && (
                  <button
                    onClick={() => handleSelectTab('staff')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      currentTab === 'staff'
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    🛡️ {t.navStaff}
                  </button>
                )}
                {canAccessDrive && (
                  <button
                    onClick={() => handleSelectTab('drive')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      currentTab === 'drive'
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ☁️ {t.navDrive}
                  </button>
                )}
              </div>
            )}

            {currentTab === 'dashboard' && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {t.navDashboard}
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
            <span>DS Vaharai Digital Portal</span>
          </div>
        </div>
      )}

      {/* 4. Mobile Categorized Sub-Menu Drawer (Completely fits screen height) */}
      {mobileMenuOpen && currentUser && !isNormal && (
        <div className="lg:hidden bg-slate-900/40 backdrop-blur-xs fixed inset-x-0 bottom-0 top-[88px] z-50">
          <div className="bg-white border-b border-slate-200 shadow-2xl max-h-[calc(100vh-95px)] overflow-y-auto p-4 space-y-4">
            {/* Quick Switch to Dashboard */}
            {canAccessDashboard && (
              <button
                onClick={() => handleSelectTab('dashboard')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{t.navDashboard}</span>
                </div>
                {currentTab === 'dashboard' && (
                  <span className="text-xs bg-emerald-700 px-2 py-0.5 rounded font-normal">
                    {t.activeNow}
                  </span>
                )}
              </button>
            )}

            {/* Sub-menu 1: Public Services */}
            {hasPublicServices && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
                  <Ticket className="w-4 h-4 text-emerald-700" />
                  <span>{t.menuPublicServices}</span>
                </div>
                <div className="space-y-1.5">
                  {publicServiceItems.map((item) => {
                    const Icon = item.icon;
                    const isCurrent = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.isAction) {
                            setMobileMenuOpen(false);
                            onOpenScanner();
                          } else {
                            handleSelectTab(item.id);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                          isCurrent
                            ? 'bg-emerald-700 text-white font-bold shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white' : 'text-slate-600'}`} />
                          <div className="truncate">
                            <div className="text-xs font-semibold truncate">{item.title}</div>
                            <div className={`text-[10px] truncate ${isCurrent ? 'text-emerald-100' : 'text-slate-500'}`}>
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold shrink-0 ml-2 ${
                            isCurrent ? 'bg-emerald-900 text-emerald-100' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-menu 2: Registry & Analytics */}
            {hasRegistry && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
                  <FolderKanban className="w-4 h-4 text-emerald-700" />
                  <span>{t.menuRegistryAnalytics}</span>
                </div>
                <div className="space-y-1.5">
                  {registryItems.map((item) => {
                    const Icon = item.icon;
                    const isCurrent = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                          isCurrent
                            ? 'bg-emerald-700 text-white font-bold shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white' : 'text-slate-600'}`} />
                          <div className="truncate">
                            <div className="text-xs font-semibold truncate">{item.title}</div>
                            <div className={`text-[10px] truncate ${isCurrent ? 'text-emerald-100' : 'text-slate-500'}`}>
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold shrink-0 ml-2 ${
                            isCurrent ? 'bg-emerald-900 text-emerald-100' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-menu 3: Administration & System */}
            {hasAdmin && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
                  <Settings2 className="w-4 h-4 text-emerald-700" />
                  <span>{t.menuAdministration}</span>
                </div>
                <div className="space-y-1.5">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const isCurrent = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                          isCurrent
                            ? 'bg-emerald-700 text-white font-bold shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white' : 'text-slate-600'}`} />
                          <div className="truncate">
                            <div className="text-xs font-semibold truncate">{item.title}</div>
                            <div className={`text-[10px] truncate ${isCurrent ? 'text-emerald-100' : 'text-slate-500'}`}>
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold shrink-0 ml-2 ${
                            isCurrent ? 'bg-emerald-900 text-emerald-100' : 'bg-emerald-100 text-emerald-900 font-mono'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
