import React, { useState, useMemo } from 'react';
import { Family, User } from '../types';
import { StorageService } from '../services/storageService';
import { RegisterFamilyModal } from './RegisterFamilyModal';
import { FamilyDetailModal } from './FamilyDetailModal';
import { PrintableQrCard } from './PrintableQrCard';
import { PrintableRegistryModal } from './PrintableRegistryModal';
import { TRANSLATIONS, Language } from '../utils/translations';
import {
  Users,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  QrCode,
  Gift,
  Building,
  Phone,
  Home,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileDown
} from 'lucide-react';

interface FamilyRegistryViewProps {
  currentUser: User;
  currentLang?: Language;
  onRecordAssistance?: (family: Family) => void;
  onRequestTransfer?: (oldNIC: string, qrNumber: string) => void;
}

export const FamilyRegistryView: React.FC<FamilyRegistryViewProps> = ({
  currentUser,
  currentLang = 'en',
  onRecordAssistance,
  onRequestTransfer
}) => {
  const t = TRANSLATIONS[currentLang];
  const isTa = currentLang === 'ta';
  const isGnOfficer = currentUser.Role === 'GN Officer' || currentUser.Role === 'GN_Officer';
  const canFilterAndPrintByDivision =
    currentUser.Role === 'Super Admin' ||
    currentUser.Role === 'Super_Admin' ||
    currentUser.Role === 'Data Entry Officer' ||
    currentUser.Role === 'Data_Entry_Officer' ||
    currentUser.Role === 'Assistance Officer' ||
    currentUser.Role === 'Assistance_Officer';
  const divisions = StorageService.getDivisions();

  // State
  const [families, setFamilies] = useState<Family[]>(() => StorageService.getFilteredFamilies(currentUser));
  const [members, setMembers] = useState(() => StorageService.getMembers());
  const [assistanceList] = useState(() => StorageService.getAssistance());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>(
    currentUser.Division !== 'ALL' ? currentUser.Division : 'ALL'
  );
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedAswesuma, setSelectedAswesuma] = useState<string>('ALL');
  const [specialCategoryFilter, setSpecialCategoryFilter] = useState<
    'ALL' | 'female_headed' | 'no_toilet' | 'no_water' | 'no_house' | 'has_elderly' | 'has_disabled'
  >('ALL');

  // Requirement #6: 25 items per page with Previous / Next ("முன்" / "பின்") pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 25; // Exactly 25 as requested

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeDossierFamily, setActiveDossierFamily] = useState<Family | null>(null);
  const [activePrintFamily, setActivePrintFamily] = useState<Family | null>(null);
  const [showPrintableRegistry, setShowPrintableRegistry] = useState(false);

  const refreshFamilies = () => {
    setFamilies(StorageService.getFilteredFamilies(currentUser));
    setMembers(StorageService.getMembers());
  };

  const handleFamilyCreated = (newFamily: Family) => {
    refreshFamilies();
    setActiveDossierFamily(newFamily);
  };

  // Base search & priority/division filter (Strictly division scoped for GN officer)
  const baseFiltered = useMemo(() => {
    return StorageService.searchFamilies(
      currentUser,
      searchQuery,
      isGnOfficer ? currentUser.Division : selectedDivision,
      selectedPriority
    );
  }, [currentUser, searchQuery, selectedDivision, selectedPriority, isGnOfficer, families]);

  // Apply special category & Aswesuma filter
  const filtered = useMemo(() => {
    return baseFiltered.filter(f => {
      if (selectedAswesuma !== 'ALL') {
        const famAswesuma = f.Aswesuma_Category || 'Not selected';
        if (famAswesuma !== selectedAswesuma) return false;
      }
      if (specialCategoryFilter === 'ALL') return true;
      const famMembers = members.filter(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
      const isFemaleHead =
        f.is_female_headed ||
        f.vulnerability?.is_single_parent ||
        famMembers.some(m => (m.Relationship === 'Head of Family' || m.Relationship.includes('Head')) && m.Gender === 'Female');
      const hasNoToilet = f.no_toilet || f.vulnerability?.no_adequate_sanitation;
      const hasNoWater = f.no_drinking_water_well || f.vulnerability?.no_clean_drinking_water;
      const hasNoHouse =
        f.no_house ||
        f.Housing_Status === 'Landless' ||
        f.Housing_Status === 'Temporary/Hut' ||
        f.vulnerability?.no_house_land_ownership;
      const hasElderly = famMembers.some(m => m.Elderly === 'Yes' || (m.Calculated_Age && m.Calculated_Age >= 60));
      const hasDisabled = famMembers.some(m => m.Disability === 'Yes');

      if (specialCategoryFilter === 'female_headed') return isFemaleHead;
      if (specialCategoryFilter === 'no_toilet') return hasNoToilet;
      if (specialCategoryFilter === 'no_water') return hasNoWater;
      if (specialCategoryFilter === 'no_house') return hasNoHouse;
      if (specialCategoryFilter === 'has_elderly') return hasElderly;
      if (specialCategoryFilter === 'has_disabled') return hasDisabled;
      return true;
    });
  }, [baseFiltered, specialCategoryFilter, selectedAswesuma, members]);

  // Requirement #6: Calculate Paginated Slice of 25 items
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedFamilies = useMemo(() => {
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, safePage]);

  // Calculate counts for quick chips
  const countFemaleHeaded = baseFiltered.filter(f => {
    const famMembers = members.filter(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
    return (
      f.is_female_headed ||
      f.vulnerability?.is_single_parent ||
      famMembers.some(m => (m.Relationship === 'Head of Family' || m.Relationship.includes('Head')) && m.Gender === 'Female')
    );
  }).length;

  const countNoToilet = baseFiltered.filter(f => f.no_toilet || f.vulnerability?.no_adequate_sanitation).length;
  const countNoWater = baseFiltered.filter(f => f.no_drinking_water_well || f.vulnerability?.no_clean_drinking_water).length;
  const countNoHouse = baseFiltered.filter(
    f => f.no_house || f.Housing_Status === 'Landless' || f.Housing_Status === 'Temporary/Hut' || f.vulnerability?.no_house_land_ownership
  ).length;
  const countWithElderly = baseFiltered.filter(f =>
    members.some(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase() && (m.Elderly === 'Yes' || (m.Calculated_Age && m.Calculated_Age >= 60)))
  ).length;
  const countWithDisabled = baseFiltered.filter(f =>
    members.some(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase() && m.Disability === 'Yes')
  ).length;

  const getDivisionTamilName = (divName: string) => {
    const div = divisions.find(d => d.Division_Name === divName);
    return isTa && div?.Tamil_Name ? div.Tamil_Name : divName;
  };

  const getPriorityLabel = (priority: string) => {
    if (isTa) {
      if (priority === 'Critical') return 'மிக அவசரம் (Critical)';
      if (priority === 'High') return 'அதி முன்னுரிமை (High)';
      if (priority === 'Medium') return 'நடுத்தர முன்னுரிமை';
      if (priority === 'Low') return 'சாதாரண முன்னுரிமை';
    }
    return priority;
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions with Beneficiary CSV Download */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            {t.familyRegistryTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isGnOfficer
              ? `${t.showingDivisions}: ${getDivisionTamilName(currentUser.Division)} (${filtered.length} ${t.totalFamilies})`
              : `${t.allDivisionsScope} (${filtered.length} ${t.totalFamilies})`}
          </p>
        </div>

        {/* Action Buttons: Requirement 02 - Filter & Print by GS Division is ONLY for Admin & Data Entry / Assistance Officer (Not for GN Officer) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canFilterAndPrintByDivision && !isGnOfficer && (
            <button
              onClick={() => setShowPrintableRegistry(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-300 rounded-lg hover:bg-indigo-100 shadow-xs cursor-pointer"
              title={isTa ? 'அனைத்து வினாக்களையும் வடிகட்டி தனித்தனி கிராம அலுவலர் பிரிவாக அச்சிடுக' : 'Filter All Questionnaire Indicators & Print per GS Division'}
            >
              <Printer className="w-3.5 h-3.5 text-indigo-700" />
              <span>{isTa ? 'வினாக்கள் வடிகட்டி & GS பிரிவு அச்சிடுக' : 'Filter All Questions & Print by GS'}</span>
            </button>
          )}

          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t.registerNewFamily}
          </button>
        </div>
      </div>

      {/* GN Officer Scoping Banner (Requirement #3) */}
      {isGnOfficer && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>{t.divisionScopedNotice}</strong> {currentUser.Division} ({filtered.length} {isTa ? 'குடும்பங்கள்' : 'families'})
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
            {currentUser.Name}
          </span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // reset to page 1 on search
            }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        {/* GN Division Dropdown: Disabled and locked to GN Officer's own division for GN officers */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={isGnOfficer ? currentUser.Division : selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setCurrentPage(1);
              }}
              disabled={isGnOfficer}
              aria-label={t.gnDivision}
              className="w-full text-xs text-slate-700 bg-transparent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              {!isGnOfficer && (
                <option value="ALL">
                  {isTa ? 'அனைத்து கிராம சேவகர் பிரிவுகளும் (16)' : 'All 16 GN Divisions'}
                </option>
              )}
              {divisions.map((d) => (
                <option key={d.GN_Code || d.Division_ID} value={d.Division_Name}>
                  {d.GN_Code} - {isTa && d.Tamil_Name ? d.Tamil_Name : d.Division_Name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Aswesuma Category Filter */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-1.5 border border-emerald-300 rounded-lg px-2.5 py-1.5 bg-emerald-50/40">
            <Filter className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <select
              value={selectedAswesuma}
              onChange={(e) => {
                setSelectedAswesuma(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Aswesuma Category"
              className="w-full text-xs font-bold text-emerald-950 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">{isTa ? 'அனைத்து அஸ்வெசும நிலைகளும்' : 'All Aswesuma Status'}</option>
              <option value="Severely Poor">Severely Poor (மிகவும் வறியவர்)</option>
              <option value="Poor">Poor (வறியவர்)</option>
              <option value="Vulnerable">Vulnerable (இடர்பாட்டுக்குள்ளானவர்)</option>
              <option value="Not selected">Not selected (தெரிவு செய்யப்படவில்லை)</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              aria-label={t.priority}
              className="w-full text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">
                {isTa ? 'அனைத்து முன்னுரிமை' : 'All Priorities'}
              </option>
              <option value="Critical">{getPriorityLabel('Critical')}</option>
              <option value="High">{getPriorityLabel('High')}</option>
              <option value="Medium">{getPriorityLabel('Medium')}</option>
              <option value="Low">{getPriorityLabel('Low')}</option>
            </select>
          </div>
        </div>

        {/* Quick Vulnerability Focus Chips */}
        <div className="md:col-span-12 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">
            {isTa ? 'முக்கிய வகைகள்:' : 'Focus Categories:'}
          </span>
          <button
            type="button"
            onClick={() => {
              setSpecialCategoryFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer ${
              specialCategoryFilter === 'ALL'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isTa ? `அனைத்தும் (${baseFiltered.length})` : `All (${baseFiltered.length})`}
          </button>
          <button
            type="button"
            onClick={() => {
              setSpecialCategoryFilter('female_headed');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer ${
              specialCategoryFilter === 'female_headed'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span>👩</span>
            <span>{isTa ? 'பெண் தலைமைத்துவம்' : 'Female-Headed'}</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/70 text-[10px] font-mono">
              {countFemaleHeaded}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSpecialCategoryFilter('no_toilet');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer ${
              specialCategoryFilter === 'no_toilet'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>🚻</span>
            <span>{isTa ? 'மலசலகூட வசதி அற்றவை' : 'No Toilet'}</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/70 text-[10px] font-mono">
              {countNoToilet}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSpecialCategoryFilter('no_water');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer ${
              specialCategoryFilter === 'no_water'
                ? 'bg-cyan-700 text-white'
                : 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100 border border-cyan-200'
            }`}
          >
            <span>💧</span>
            <span>{isTa ? 'குடிநீர் கிணறு அற்றவை' : 'No Well / Water'}</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/70 text-[10px] font-mono">
              {countNoWater}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSpecialCategoryFilter('no_house');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer ${
              specialCategoryFilter === 'no_house'
                ? 'bg-orange-700 text-white'
                : 'bg-orange-50 text-orange-900 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <span>🏚️</span>
            <span>{isTa ? 'வீடற்றவை / குடிசை' : 'Homeless / No House'}</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/70 text-[10px] font-mono">
              {countNoHouse}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSpecialCategoryFilter('has_elderly');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer ${
              specialCategoryFilter === 'has_elderly'
                ? 'bg-purple-700 text-white'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <span>👴</span>
            <span>{isTa ? 'முதியோர்களைக் கொண்டவை' : 'With Elderly'}</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/70 text-[10px] font-mono">
              {countWithElderly}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSpecialCategoryFilter('has_disabled');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer ${
              specialCategoryFilter === 'has_disabled'
                ? 'bg-indigo-700 text-white'
                : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <span>♿</span>
            <span>{isTa ? 'விசேட தேவையுடையோர்' : 'With Disabled'}</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/70 text-[10px] font-mono">
              {countWithDisabled}
            </span>
          </button>
        </div>
      </div>

      {/* Requirement #6: Beneficiary Data Table showing 25 per page with Previous / Next Controls */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Pagination and Count Status Bar */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="font-mono text-slate-700">
            {isTa ? (
              <span>
                காண்பிக்கப்படுகிறது: <strong>{(safePage - 1) * ITEMS_PER_PAGE + 1}</strong> முதல்{' '}
                <strong>{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</strong> வரை / மொத்தம்{' '}
                <strong>{filtered.length}</strong> குடும்பங்கள் (பக்கத்திற்கு 25 விதம்)
              </span>
            ) : (
              <span>
                Showing <strong>{(safePage - 1) * ITEMS_PER_PAGE + 1}</strong> to{' '}
                <strong>{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</strong> of{' '}
                <strong>{filtered.length}</strong> families (25 per page)
              </span>
            )}
          </div>

          {/* Previous / Next Controls ("முன்" / "பின்") */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">
              {isTa ? 'பக்கம்' : 'Page'} <strong className="text-slate-900 font-mono">{safePage}</strong> / {totalPages}
            </span>

            {/* "முன்" (Previous Button) */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
              title={isTa ? 'முந்தைய 25 குடும்பங்கள் (முன்)' : 'Previous 25 Families'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{isTa ? 'முன் (Previous)' : 'Previous'}</span>
            </button>

            {/* "பின்" (Next Button) */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
              title={isTa ? 'அடுத்த 25 குடும்பங்கள் (பின்)' : 'Next 25 Families'}
            >
              <span>{isTa ? 'பின் (Next)' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">{t.qrNumber}</th>
                <th className="py-3 px-4">{t.familyName}</th>
                <th className="py-3 px-4">{t.gnDivision}</th>
                <th className="py-3 px-4">{t.addressContact}</th>
                <th className="py-3 px-4 text-center">{t.members}</th>
                <th className="py-3 px-4">{t.income}</th>
                <th className="py-3 px-4">{t.priority}</th>
                <th className="py-3 px-4 text-center">{t.assistanceCount}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedFamilies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">{t.noFamiliesFound}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isTa ? 'வடிகட்டல் அல்லது தேடலை மாற்றி முயற்சிக்கவும்.' : 'Try adjusting your search criteria or register a new family.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedFamilies.map((fam) => {
                  const aidCount = assistanceList.filter((a) => a.QR_Number === fam.QR_Number).length;
                  const isRepeated = aidCount >= 3;
                  return (
                    <tr key={fam.QR_Number} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200 block w-fit">
                          {fam.QR_Number}
                        </span>
                        <span className="font-mono text-[10px] text-indigo-700 font-semibold mt-0.5 block">
                          {fam.Registration_Number || `REG-${fam.QR_Number}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{fam.Family_Name}</div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span>{isTa ? 'வீட்டு நிலை:' : 'Housing:'} {fam.Housing_Status}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                            fam.Aswesuma_Category === 'Severely Poor'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : fam.Aswesuma_Category === 'Poor'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : fam.Aswesuma_Category === 'Vulnerable'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            Aswesuma: {fam.Aswesuma_Category || 'Not selected'}
                          </span>
                        </div>
                        {/* Vulnerability badges */}
                        {(() => {
                          const famMembers = members.filter(m => m.QR_Number.toUpperCase() === fam.QR_Number.toUpperCase());
                          const isFemaleHead =
                            fam.is_female_headed ||
                            fam.vulnerability?.is_single_parent ||
                            famMembers.some(m => (m.Relationship === 'Head of Family' || m.Relationship.includes('Head')) && m.Gender === 'Female');
                          const hasNoToilet = fam.no_toilet || fam.vulnerability?.no_adequate_sanitation;
                          const hasNoWater = fam.no_drinking_water_well || fam.vulnerability?.no_clean_drinking_water;
                          const hasNoHouse =
                            fam.no_house ||
                            fam.Housing_Status === 'Landless' ||
                            fam.Housing_Status === 'Temporary/Hut' ||
                            fam.vulnerability?.no_house_land_ownership;
                          const elderlyCount = famMembers.filter(m => m.Elderly === 'Yes' || (m.Calculated_Age && m.Calculated_Age >= 60)).length;
                          const disabledCount = famMembers.filter(m => m.Disability === 'Yes').length;
                          return (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {isFemaleHead && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  <span>👩</span>
                                  <span>{isTa ? 'பெண் தலைமைத்துவம்' : 'Female Headed'}</span>
                                </span>
                              )}
                              {hasNoToilet && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  <span>🚻</span>
                                  <span>{isTa ? 'மலசலகூடமில்லை' : 'No Toilet'}</span>
                                </span>
                              )}
                              {hasNoWater && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                                  <span>💧</span>
                                  <span>{isTa ? 'குடிநீரில்லை' : 'No Water'}</span>
                                </span>
                              )}
                              {hasNoHouse && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-800 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                                  <span>🏚️</span>
                                  <span>{isTa ? 'வீடற்றவர்' : 'No House'}</span>
                                </span>
                              )}
                              {elderlyCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                  <span>👴</span>
                                  <span>{isTa ? `முதியோர்: ${elderlyCount}` : `Elderly: ${elderlyCount}`}</span>
                                </span>
                              )}
                              {disabledCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                  <span>♿</span>
                                  <span>{isTa ? `இயலாமை: ${disabledCount}` : `Disabled: ${disabledCount}`}</span>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">
                          {getDivisionTamilName(fam.Division_Name)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-600 truncate max-w-xs">{fam.Address}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {fam.Telephone || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                        {fam.Family_Size}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        LKR {fam.Monthly_Income.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadgeClass(fam.Priority_Level)}`}>
                          {getPriorityLabel(fam.Priority_Level)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                            isRepeated
                              ? 'bg-amber-100 text-amber-800'
                              : aidCount > 0
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {aidCount} {isTa ? 'உதவி' : 'aid'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveDossierFamily(fam)}
                            title={t.viewDetails}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setActivePrintFamily(fam)}
                            title={t.printCard}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {onRecordAssistance && (
                            <button
                              onClick={() => onRecordAssistance(fam)}
                              title={t.recordAssistance}
                              className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                            >
                              <Gift className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar: 25 items per page with "முன்" / "பின்" controls */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-mono">
            {isTa ? (
              <span>
                காண்பிக்கப்படுகிறது: <strong>{(safePage - 1) * ITEMS_PER_PAGE + 1}</strong> -{' '}
                <strong>{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</strong> (மொத்தம் {filtered.length} குடும்பங்கள்)
              </span>
            ) : (
              <span>
                Showing <strong>{(safePage - 1) * ITEMS_PER_PAGE + 1}</strong> -{' '}
                <strong>{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</strong> of {filtered.length} families
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{isTa ? 'முன் (Previous)' : 'Previous'}</span>
            </button>

            {/* Direct Page Numbers */}
            <div className="flex items-center gap-1 font-mono">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                // Only show around current page
                if (totalPages > 6 && Math.abs(p - safePage) > 2 && p !== 1 && p !== totalPages) {
                  if (Math.abs(p - safePage) === 3) return <span key={p} className="px-1 text-slate-400">...</span>;
                  return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors cursor-pointer ${
                      safePage === p
                        ? 'bg-slate-900 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
            >
              <span>{isTa ? 'பின் (Next)' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showRegisterModal && (
        <RegisterFamilyModal
          currentUser={currentUser}
          currentLang={currentLang}
          onClose={() => setShowRegisterModal(false)}
          onFamilyCreated={handleFamilyCreated}
        />
      )}
      {activeDossierFamily && (
        <FamilyDetailModal
          family={activeDossierFamily}
          currentUser={currentUser}
          currentLang={currentLang}
          onClose={() => setActiveDossierFamily(null)}
          onDataChanged={refreshFamilies}
          onRequestTransfer={onRequestTransfer}
        />
      )}
      {activePrintFamily && (
        <PrintableQrCard
          family={activePrintFamily}
          members={StorageService.getMembers().filter(m => m.QR_Number === activePrintFamily.QR_Number)}
          onClose={() => setActivePrintFamily(null)}
        />
      )}
      {showPrintableRegistry && (
        <PrintableRegistryModal
          initialFamilies={families}
          currentUser={currentUser}
          currentLang={currentLang}
          onClose={() => setShowPrintableRegistry(false)}
        />
      )}
    </div>
  );
};
