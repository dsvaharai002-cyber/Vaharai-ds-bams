import React, { useState, useMemo } from 'react';
import { Beneficiary, GNDivision, User, WelfareScheme, ChronicIllness, WelfareStatus, FamilyRelationship, CitizenStatus } from '../types';
import { Language, translations } from '../translations/i18n';
import { BeneficiaryIdCardModal } from './BeneficiaryIdCardModal';
import { PrintableFilteredReportModal } from './PrintableFilteredReportModal';
import { DisabilityOfficerManagementView } from './DisabilityOfficerManagementView';
import { calculateAge, generateSystemCitizenId, generateProvisionalNic } from '../services/storage';
import { generateQrDataUrl } from '../utils/barcode';
import { parseSriLankanNic } from '../utils/nicParser';

interface BeneficiariesViewProps {
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const BeneficiariesView: React.FC<BeneficiariesViewProps> = ({
  beneficiaries,
  divisions,
  currentUser,
  lang,
  onUpdateBeneficiaries,
  onAuditLog,
}) => {
  const t = translations[lang];

  // Role separation check
  const isGramaNiladhari = currentUser.role === 'GRAMANIILATHARI';
  const officerDivision = isGramaNiladhari ? currentUser.division || '211' : '';
  const canDelete = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN 1' || currentUser.role === 'ADMIN 2';

  // Specialized Officer Roles
  const isECDO = currentUser.role === 'ECDO';
  const isDisabilityOfficer = currentUser.role === 'DISABILITY_OFFICER';
  const isWHHOfficer = currentUser.role === 'WHH_OFFICER';
  const isSamurdhiOfficer = currentUser.role === 'SAMURDHI_OFFICER';

  // STRICT REQUIREMENT 05: Disability Officer dedicated view
  if (isDisabilityOfficer) {
    return (
      <DisabilityOfficerManagementView
        beneficiaries={beneficiaries}
        divisions={divisions}
        currentUser={currentUser}
        lang={lang}
        onUpdateBeneficiaries={onUpdateBeneficiaries}
        onAuditLog={onAuditLog}
      />
    );
  }

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>(isGramaNiladhari ? officerDivision : 'ALL');
  const [selectedWelfare, setSelectedWelfare] = useState<string>('ALL');
  const [selectedIllness, setSelectedIllness] = useState<string>('ALL');
  const [filterYouth16Only, setFilterYouth16Only] = useState<boolean>(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DECEASED' | 'TRANSFERRED'>('ALL');

  // Specialized Category Quick Filter (ECDO, Disability, WHH, Samurdhi, Family Master)
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'PREGNANT' | 'DISABILITY' | 'WHH' | 'SAMURDHI'>(() => {
    if (isECDO) return 'PREGNANT';
    if (isWHHOfficer) return 'WHH';
    if (isSamurdhiOfficer) return 'SAMURDHI';
    return 'ALL';
  });

  // Family Master QR Modal State (Unified QR shared across family members)
  const [selectedFamilyForModal, setSelectedFamilyForModal] = useState<string | null>(null);
  const [familyQrDataUrl, setFamilyQrDataUrl] = useState<string>('');

  // Status Change Modal State (Requirement 07: மரணப்பதிவு / பதிவுமாற்றம்)
  const [statusModalBeneficiary, setStatusModalBeneficiary] = useState<Beneficiary | null>(null);
  const [statusForm, setStatusForm] = useState<{
    status: CitizenStatus;
    deathDate: string;
    deathCertificateNo: string;
    transferredToDivision: string;
    transferredDate: string;
    notes: string;
  }>({
    status: 'ACTIVE',
    deathDate: new Date().toISOString().slice(0, 10),
    deathCertificateNo: '',
    transferredToDivision: '',
    transferredDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Modals State
  const [viewingCardBeneficiary, setViewingCardBeneficiary] = useState<Beneficiary | null>(null);
  const [showPdfReportModal, setShowPdfReportModal] = useState<boolean>(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Beneficiary>>({
    divisionCode: isGramaNiladhari ? officerDivision : '211',
    gender: 'MALE',
    familyHead: true,
    welfareScheme: 'NONE',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'NONE',
    isProvisionalNic: false,
    familyRelationship: 'HEAD',
  });

  // Filtered dataset
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      // 1. Division restriction
      if (isGramaNiladhari && b.divisionCode !== officerDivision) {
        return false;
      }
      if (!isGramaNiladhari && selectedDivision !== 'ALL' && b.divisionCode !== selectedDivision) {
        return false;
      }

      // 2. Specialized Category filter (ECDO, Disability, WHH, Samurdhi)
      if (categoryFilter === 'PREGNANT' && !b.isPregnantMother) return false;
      if (categoryFilter === 'DISABILITY' && !b.isPersonWithDisability && b.chronicIllness !== 'DISABILITY_PHYSICAL') return false;
      if (categoryFilter === 'WHH' && !b.isWomanHeadedHousehold) return false;
      if (categoryFilter === 'SAMURDHI' && !b.isSamurdhiBeneficiary && b.welfareScheme !== 'SAMURDHI' && !b.welfareScheme.startsWith('ASWESUMA')) return false;

      // 3. Welfare Scheme filter
      if (selectedWelfare !== 'ALL') {
        if (selectedWelfare === 'ASWESUMA_ALL') {
          if (!b.welfareScheme.startsWith('ASWESUMA')) return false;
        } else if (b.welfareScheme !== selectedWelfare) {
          return false;
        }
      }

      // 4. Chronic Illness filter
      if (selectedIllness !== 'ALL' && b.chronicIllness !== selectedIllness) {
        return false;
      }

      // 5. 16 Years Completed filter (For NIC applications)
      const age = calculateAge(b.dob);
      if (filterYouth16Only && age !== 16) {
        return false;
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNic = (b.nic || '').toLowerCase().includes(q);
        const matchesId = (b.id || '').toLowerCase().includes(q);
        const matchesNameTa = (b.nameTa || '').toLowerCase().includes(q);
        const matchesNameEn = (b.nameEn || '').toLowerCase().includes(q);
        const matchesPhone = (b.phone || '').toLowerCase().includes(q);
        const matchesHh = (b.householdNo || '').toLowerCase().includes(q);
        const matchesFam = (b.familyCode || '').toLowerCase().includes(q);
        return matchesNic || matchesId || matchesNameTa || matchesNameEn || matchesPhone || matchesHh || matchesFam;
      }

      // 7. Citizen Status filter (Requirement 07: மரணப்பதிவு / பதிவுமாற்றம்)
      if (selectedStatusFilter !== 'ALL') {
        const currentStatus = b.status || 'ACTIVE';
        if (currentStatus !== selectedStatusFilter) return false;
      }

      return true;
    });
  }, [
    beneficiaries,
    isGramaNiladhari,
    officerDivision,
    selectedDivision,
    categoryFilter,
    selectedWelfare,
    selectedIllness,
    filterYouth16Only,
    searchQuery,
    selectedStatusFilter,
  ]);

  // Open Status Change Modal (மரணப்பதிவு / பதிவுமாற்றம்)
  const handleOpenStatusModal = (b: Beneficiary) => {
    setStatusModalBeneficiary(b);
    setStatusForm({
      status: b.status || 'ACTIVE',
      deathDate: b.deathDate || new Date().toISOString().slice(0, 10),
      deathCertificateNo: b.deathCertificateNo || '',
      transferredToDivision: b.transferredToDivision || '',
      transferredDate: b.transferredDate || new Date().toISOString().slice(0, 10),
      notes: '',
    });
  };

  const handleSaveStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalBeneficiary) return;

    const updated = beneficiaries.map((b) => {
      if (b.id === statusModalBeneficiary.id) {
        return {
          ...b,
          status: statusForm.status,
          deathDate: statusForm.status === 'DECEASED' ? statusForm.deathDate : undefined,
          deathCertificateNo: statusForm.status === 'DECEASED' ? statusForm.deathCertificateNo : undefined,
          transferredToDivision: statusForm.status === 'TRANSFERRED' ? statusForm.transferredToDivision : undefined,
          transferredDate: statusForm.status === 'TRANSFERRED' ? statusForm.transferredDate : undefined,
          notes: statusForm.notes
            ? `${b.notes || ''} [Status Update: ${statusForm.status} - ${statusForm.notes}]`.trim()
            : b.notes,
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });

    onUpdateBeneficiaries(updated);
    onAuditLog(
      'CITIZEN_STATUS_CHANGE',
      `Changed citizen status for ${statusModalBeneficiary.nameTa} (${statusModalBeneficiary.nic}) to ${statusForm.status}`
    );
    setStatusModalBeneficiary(null);
  };

  // Open Add Citizen Modal with automated System ID
  const handleOpenAdd = () => {
    setIsNewRecord(true);
    const targetDiv = isGramaNiladhari ? officerDivision : '211';
    const autoSystemId = generateSystemCitizenId(targetDiv, beneficiaries.length + 1);

    setFormData({
      id: autoSystemId,
      nic: '',
      isProvisionalNic: false,
      nameTa: '',
      nameEn: '',
      gender: 'MALE',
      dob: '2000-01-01',
      phone: '',
      address: '',
      divisionCode: targetDiv,
      familyHead: true,
      householdNo: `HH-${targetDiv}-${Math.floor(Math.random() * 900 + 100)}`,
      welfareScheme: 'NONE',
      welfareStatus: 'ACTIVE',
      chronicIllness: 'NONE',
      notes: '',
    });
    setEditingBeneficiary({} as Beneficiary);
  };

  const handleOpenEdit = (b: Beneficiary) => {
    setIsNewRecord(false);
    setFormData({ ...b });
    setEditingBeneficiary(b);
  };

  // Toggle Provisional Computer NIC for citizens without official card
  const handleToggleNoNic = (hasNoNic: boolean) => {
    const targetDiv = formData.divisionCode || '211';
    if (hasNoNic) {
      const generatedNic = generateProvisionalNic(targetDiv);
      setFormData({
        ...formData,
        isProvisionalNic: true,
        nic: generatedNic,
      });
    } else {
      setFormData({
        ...formData,
        isProvisionalNic: false,
        nic: '',
      });
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameTa) {
      alert(lang === 'ta' ? 'பெயர் கட்டாயம் தேவை!' : 'Citizen name is required!');
      return;
    }

    const divisionCode = isGramaNiladhari ? officerDivision : formData.divisionCode || '211';
    const id = formData.id || generateSystemCitizenId(divisionCode, beneficiaries.length + 1);
    
    // If citizen has no NIC and none provided, auto-generate provisional
    let nic = formData.nic?.trim() || '';
    let isProvisional = formData.isProvisionalNic ?? false;
    if (!nic) {
      nic = generateProvisionalNic(divisionCode);
      isProvisional = true;
    }

    const barcode = nic || id;
    const qrPayload = `VHR-DS|ID:${id}|NIC:${nic}|DIV:${divisionCode}|MED:${formData.chronicIllness}|SCHEME:${formData.welfareScheme}`;
    const familyCode = formData.familyCode?.trim() || (formData.householdNo ? `FAM-${formData.householdNo.replace(/^HH-/, '')}` : `FAM-${divisionCode}-001`);
    const familyQrPayload = `VHR-FAMILY|FAM:${familyCode}|DIV:${divisionCode}|MEMBERS_LINKED`;

    const recordToSave: Beneficiary = {
      id,
      nic,
      isProvisionalNic: isProvisional,
      nameTa: formData.nameTa.trim(),
      nameEn: formData.nameEn?.trim() || formData.nameTa.trim(),
      gender: formData.gender || 'MALE',
      dob: formData.dob || '1995-01-01',
      phone: formData.phone?.trim() || '',
      address: formData.address?.trim() || '',
      divisionCode,
      familyHead: formData.familyHead ?? true,
      householdNo: formData.householdNo?.trim() || `HH-${divisionCode}-001`,
      familyCode,
      familyRelationship: (formData.familyRelationship as FamilyRelationship) || (formData.familyHead ? 'HEAD' : 'CHILD'),
      isPregnantMother: !!formData.isPregnantMother,
      pregnancyStageMonths: formData.isPregnantMother ? formData.pregnancyStageMonths : undefined,
      isPersonWithDisability: !!formData.isPersonWithDisability,
      disabilityType: formData.isPersonWithDisability ? formData.disabilityType : undefined,
      isWomanHeadedHousehold: !!formData.isWomanHeadedHousehold,
      isSamurdhiBeneficiary: !!formData.isSamurdhiBeneficiary,
      welfareScheme: (formData.welfareScheme as WelfareScheme) || 'NONE',
      welfareStatus: (formData.welfareStatus as WelfareStatus) || 'ACTIVE',
      chronicIllness: (formData.chronicIllness as ChronicIllness) || 'NONE',
      barcode,
      qrPayload,
      familyQrPayload,
      notes: formData.notes?.trim() || '',
      createdAt: isNewRecord ? new Date().toISOString() : formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updated: Beneficiary[];
    if (isNewRecord) {
      updated = [recordToSave, ...beneficiaries];
      onAuditLog('CREATE_BENEFICIARY', `Registered citizen ${recordToSave.nameEn} (ID: ${recordToSave.id}, NIC: ${recordToSave.nic}, Family: ${familyCode})`);
    } else {
      updated = beneficiaries.map((b) => (b.id === recordToSave.id ? recordToSave : b));
      onAuditLog('UPDATE_BENEFICIARY', `Updated citizen ${recordToSave.nameEn} (ID: ${recordToSave.id})`);
    }

    onUpdateBeneficiaries(updated);
    setEditingBeneficiary(null);
  };

  const handleOpenFamilyMasterModal = (famCode: string) => {
    setSelectedFamilyForModal(famCode);
    const payload = `VHR-FAMILY|FAM:${famCode}|MEMBERS_LINKED`;
    generateQrDataUrl(payload).then((url) => {
      setFamilyQrDataUrl(url);
    });
  };

  const handleDelete = (b: Beneficiary) => {
    if (!canDelete) {
      alert(lang === 'ta' ? 'பதிவுகளை நீக்கும் அதிகாரம் சூப்பர் அட்மின் மற்றும் அட்மினுக்கு மட்டுமே உண்டு.' : 'Permission denied. Only Super Admin and Admin can delete records.');
      return;
    }
    if (!window.confirm(t.deleteConfirm)) return;
    const updated = beneficiaries.filter((item) => item.id !== b.id);
    onUpdateBeneficiaries(updated);
    onAuditLog('DELETE_BENEFICIARY', `Deleted citizen ${b.nameEn} (ID: ${b.id})`);
  };

  // Super Admin Bulk Delete & Clear All Tools
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredBeneficiaries.length && filteredBeneficiaries.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBeneficiaries.map((b) => b.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    if (!canDelete || selectedIds.size === 0) return;
    const confirmMsg = lang === 'ta'
      ? `தேர்ந்தெடுக்கப்பட்ட ${selectedIds.size} பிரஜைகளின் பதிவுகளை நிச்சயமாக நீக்க வேண்டுமா?`
      : `Are you sure you want to delete the ${selectedIds.size} selected records?`;
    if (!window.confirm(confirmMsg)) return;

    const updated = beneficiaries.filter((b) => !selectedIds.has(b.id));
    onUpdateBeneficiaries(updated);
    onAuditLog('BULK_DELETE_BENEFICIARIES', `Deleted ${selectedIds.size} citizens in bulk by ${currentUser.name}`);
    setSelectedIds(new Set());
  };

  const handleClearAllBeneficiaries = () => {
    if (!isSuperAdmin) return;
    const confirmMsg = lang === 'ta'
      ? 'கவனம்: அனைத்து பிரஜைகளின் பதிவுகளும் நிரந்தரமாக அழிக்கப்படும்! நிச்சயமாக அழிக்க விரும்புகிறீர்களா?'
      : 'Caution: ALL citizen records will be permanently deleted. Are you sure you want to proceed?';
    if (!window.confirm(confirmMsg)) return;

    const promptText = lang === 'ta' ? 'உறுதிப்படுத்த "DELETE" அல்லது "அழி" என தட்டச்சு செய்யவும்:' : 'Type "DELETE" to confirm:';
    const answer = window.prompt(promptText);
    if (answer === 'DELETE' || answer === 'அழி') {
      onUpdateBeneficiaries([]);
      onAuditLog('CLEAR_ALL_BENEFICIARIES', `Super Admin (${currentUser.name}) wiped all citizen records`);
      setSelectedIds(new Set());
      alert(lang === 'ta' ? 'அனைத்து பிரஜைகளின் பதிவுகளும் வெற்றிகரமாக அழிக்கப்பட்டன.' : 'All citizen records erased successfully.');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {t.beneficiariesTitle}
            </h2>
            {isGramaNiladhari && (
              <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded font-mono font-bold">
                GN பிரிவு / Div: {officerDivision}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isGramaNiladhari
              ? lang === 'ta'
                ? `தகவல் மட்டுப்பாடு: தங்களுக்கு ஒதுக்கப்பட்ட (${officerDivision}) பிரிவு பிரஜைகளின் விபரங்கள் மட்டுமே பார்வைக்கு உண்டு.`
                : `Role-restricted: Showing citizen data exclusively for your assigned GN division (${officerDivision}).`
              : lang === 'ta'
              ? 'வாகரையின் 16 கிராம அலுவலர் பிரிவுகளின் பிரஜைகள், நாள்பட்ட நோயாளர்கள், மற்றும் 16 வயது இளைஞர்கள் பதிவேடு.'
              : 'Complete registry covering 16 GN divisions with chronic medical tracking and age 16 NIC youth filters.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && canDelete && (
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs animate-in fade-in"
            >
              <span>🗑️</span>
              <span>{t.bulkDeleteSelected} ({selectedIds.size})</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={handleClearAllBeneficiaries}
              className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title={lang === 'ta' ? 'அனைத்து பிரஜைகளையும் அழிக்கும் சுப்பர் அட்மின் அதிகாரம்' : 'Clear all citizen records (Super Admin power)'}
            >
              <span>⚠️</span>
              <span>{t.deleteAllBeneficiaries}</span>
            </button>
          )}

          <button
            onClick={() => setShowPdfReportModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>📄</span>
            <span>{t.printPdfReport}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>➕</span>
            <span>{t.addBeneficiary}</span>
          </button>
        </div>
      </div>

      {/* Multi-Parameter Filter Matrix */}
      <div className="bg-white p-3.5 sm:p-4 border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50/50"
            />
          </div>

          {/* Division Filter */}
          <div>
            <select
              disabled={isGramaNiladhari}
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {!isGramaNiladhari && <option value="ALL">{t.allDivisions}</option>}
              {divisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.nameTa}
                </option>
              ))}
            </select>
          </div>

          {/* Chronic Illness Filter */}
          <div>
            <select
              value={selectedIllness}
              onChange={(e) => setSelectedIllness(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
            >
              <option value="ALL">🏥 {t.filterByIllness}: {t.allDivisions}</option>
              <option value="CKD_KIDNEY">{t.illnessCkd}</option>
              <option value="CANCER">{t.illnessCancer}</option>
              <option value="THALASSEMIA">{t.illnessThalassemia}</option>
              <option value="HEART_DISEASE">{t.illnessHeart}</option>
              <option value="DIABETES_CHRONIC">{t.illnessDiabetes}</option>
              <option value="DISABILITY_PHYSICAL">{t.illnessPhysicalDisability}</option>
              <option value="MENTAL_HEALTH">{t.illnessMentalHealth}</option>
              <option value="OTHER_CHRONIC">{t.illnessOther}</option>
              <option value="NONE">{t.illnessNone}</option>
            </select>
          </div>
        </div>

        {/* Second Row: Restructured Welfare Scheme Filter & 16-Year-Old NIC Drive Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex-1 max-w-md">
            <select
              value={selectedWelfare}
              onChange={(e) => setSelectedWelfare(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">🌾 {t.filterByWelfare}: {t.allDivisions}</option>
              <option value="ASWESUMA_ALL">அனைத்து அஸ்வெசும பிரிவுகளும் (All Aswesuma)</option>
              <option value="ASWESUMA_EXTREME">{t.schemeAswesumaExtreme}</option>
              <option value="ASWESUMA_POOR">{t.schemeAswesumaPoor}</option>
              <option value="ASWESUMA_VULNERABLE">{t.schemeAswesumaVulnerable}</option>
              <option value="ASWESUMA_TRANSITIONAL">{t.schemeAswesumaTransitional}</option>
              <option value="SAMURDHI">{t.schemeSamurdhi}</option>
              <option value="ELDERLY">{t.schemeElderly}</option>
              <option value="DISABILITY">{t.schemeDisability}</option>
              <option value="CHRONIC_KIDNEY">{t.schemeChronicKidney}</option>
              <option value="FARMER_SUBSIDY">{t.schemeFarmer}</option>
              <option value="FISHERY_AID">{t.schemeFishery}</option>
              <option value="DISASTER_RELIEF">{t.schemeDisaster}</option>
              <option value="SELF_EMPLOYMENT">{t.schemeSelfEmployment}</option>
              <option value="NONE">{t.schemeNone}</option>
            </select>
          </div>

          {/* Quick Preset: 16 Years Completed Youth (NIC Drive) */}
          <button
            type="button"
            onClick={() => setFilterYouth16Only(!filterYouth16Only)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-xs ${
              filterYouth16Only
                ? 'bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span>🎯</span>
            <span>{t.filterYouth16}</span>
            {filterYouth16Only && <span className="ml-1 text-[10px] bg-slate-900 text-white px-1.5 py-0.2 rounded-full">Active</span>}
          </button>
        </div>

        {/* Requirement 07: Citizen Lifecycle Status Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
          <span className="text-xs font-bold text-slate-600 mr-1">
            {lang === 'ta' ? 'பிரஜை நிலை (Lifecycle):' : 'Citizen Status:'}
          </span>
          {[
            { id: 'ALL', labelTa: 'அனைத்தும்', labelEn: 'All Records' },
            { id: 'ACTIVE', labelTa: 'செயலில் (Active)', labelEn: 'Active' },
            { id: 'DECEASED', labelTa: 'மரணப்பதிவு (Deceased)', labelEn: 'Deceased' },
            { id: 'TRANSFERRED', labelTa: 'பதிவுமாற்றம் (Transferred)', labelEn: 'Transferred Out' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatusFilter(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedStatusFilter === tab.id
                  ? tab.id === 'DECEASED'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : tab.id === 'TRANSFERRED'
                    ? 'bg-purple-800 text-white shadow-xs'
                    : 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'ta' ? tab.labelTa : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Table Container (With overflow-x-auto to prevent mobile blowout) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider font-mono">
              {filteredBeneficiaries.length} {t.records}
            </span>
            {filterYouth16Only && (
              <span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded">
                16 வயது நிரம்பியோர் பட்டியல்
              </span>
            )}
            {selectedStatusFilter !== 'ALL' && (
              <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded">
                வடிகட்டி: {selectedStatusFilter}
              </span>
            )}
          </div>
          <span className="text-slate-500 text-[11px]">
            {lang === 'ta' ? 'அனைவருக்கும் தானியங்கி System ID, குடும்ப QR மற்றும் பார்கோட் ஒதுக்கப்பட்டுள்ளது' : 'System ID, Family QR & Barcode assigned'}
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                {canDelete && (
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredBeneficiaries.length}
                      onChange={handleToggleSelectAll}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      title={lang === 'ta' ? 'அனைத்தையும் தேர்ந்தெடு' : 'Select all'}
                    />
                  </th>
                )}
                <th className="py-3 px-3">System ID</th>
                <th className="py-3 px-3">{t.nic}</th>
                <th className="py-3 px-3">{t.nameTamil} / English</th>
                <th className="py-3 px-2 text-center">{t.age}</th>
                <th className="py-3 px-3">{t.division}</th>
                <th className="py-3 px-3">{t.chronicIllness}</th>
                <th className="py-3 px-3">{t.welfareScheme}</th>
                <th className="py-3 px-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBeneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 9 : 8} className="py-10 text-center text-slate-400">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filteredBeneficiaries.map((b) => {
                  const age = calculateAge(b.dob);
                  return (
                    <tr key={b.id} className={`hover:bg-slate-50/90 transition-colors ${selectedIds.has(b.id) ? 'bg-emerald-50/50' : ''}`}>
                      {/* Selection Checkbox */}
                      {canDelete && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(b.id)}
                            onChange={() => handleToggleSelectOne(b.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                      )}
                      {/* System ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 text-[11px] whitespace-nowrap">
                        {b.id}
                      </td>

                      {/* NIC with Provisional Badge if computer generated */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-emerald-950 text-[11px]">
                          {b.nic}
                        </div>
                        {b.isProvisionalNic ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[9px] font-semibold">
                            {t.provisionalNicBadge}
                          </span>
                        ) : (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px]">
                            {t.officialNicBadge}
                          </span>
                        )}
                      </td>

                      {/* Name with Status and Family QR tags */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 leading-tight">{b.nameTa}</span>
                          {b.status === 'DECEASED' && (
                            <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded text-[9px] font-bold">
                              {lang === 'ta' ? 'மரணப்பதிவு' : 'Deceased'} {b.deathDate ? `(${b.deathDate})` : ''}
                            </span>
                          )}
                          {b.status === 'TRANSFERRED' && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 rounded text-[9px] font-bold">
                              {lang === 'ta' ? 'பதிவுமாற்றம்' : 'Transferred'} {b.transferredToDivision ? `(${b.transferredToDivision})` : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{b.nameEn}</div>
                        {b.familyCode && (
                          <div className="text-[10px] text-emerald-800 font-mono mt-0.5 flex items-center gap-1">
                            <span className="font-bold">QR அலகு:</span>
                            <span>{b.familyCode}</span>
                          </div>
                        )}
                      </td>

                      {/* Age with Highlight if 16 */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            age === 16
                              ? 'bg-amber-300 text-slate-950 shadow-xs'
                              : 'text-slate-700 bg-slate-100'
                          }`}
                        >
                          {age} {t.yearsOld}
                        </span>
                      </td>

                      {/* Division */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800">{b.divisionCode}</span>
                        <span className="text-[11px] text-slate-500 ml-1">
                          ({divisions.find((d) => d.code === b.divisionCode)?.nameTa || b.divisionCode})
                        </span>
                      </td>

                      {/* Chronic Illness Tag */}
                      <td className="py-3 px-3">
                        {b.chronicIllness && b.chronicIllness !== 'NONE' ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-900">
                            {b.chronicIllness === 'CKD_KIDNEY'
                              ? 'Kidney (CKD)'
                              : b.chronicIllness === 'CANCER'
                              ? 'Cancer'
                              : b.chronicIllness.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Welfare Scheme */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            b.welfareScheme.startsWith('ASWESUMA')
                              ? 'bg-amber-100 text-amber-900'
                              : b.welfareScheme === 'SAMURDHI'
                              ? 'bg-emerald-100 text-emerald-900'
                              : b.welfareScheme === 'ELDERLY'
                              ? 'bg-blue-100 text-blue-900'
                              : b.welfareScheme === 'CHRONIC_KIDNEY'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {b.welfareScheme}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenStatusModal(b)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-medium text-[11px] transition-colors border border-amber-200"
                          title={lang === 'ta' ? 'மரணப்பதிவு / பதிவுமாற்றம்' : 'Deceased / Transfer Status'}
                        >
                          📜 {lang === 'ta' ? 'நிலை' : 'Status'}
                        </button>
                        <button
                          onClick={() => setViewingCardBeneficiary(b)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-medium text-[11px] transition-colors"
                          title={t.printIdCard}
                        >
                          🪪 {lang === 'ta' ? 'அட்டை' : 'Pass'}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] transition-colors"
                        >
                          ✏️
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(b)}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded font-medium text-[11px] transition-colors"
                            title={t.delete}
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ID Pass Modal */}
      {viewingCardBeneficiary && (
        <BeneficiaryIdCardModal
          beneficiary={viewingCardBeneficiary}
          division={divisions.find((d) => d.code === viewingCardBeneficiary.divisionCode)}
          lang={lang}
          onClose={() => setViewingCardBeneficiary(null)}
        />
      )}

      {/* PDF Filtered Report Modal */}
      {showPdfReportModal && (
        <PrintableFilteredReportModal
          beneficiaries={filteredBeneficiaries}
          divisions={divisions}
          activeDivision={selectedDivision}
          activeWelfare={selectedWelfare}
          activeIllness={selectedIllness}
          activeYouth16={filterYouth16Only}
          searchQuery={searchQuery}
          lang={lang}
          onClose={() => setShowPdfReportModal(false)}
        />
      )}

      {/* Requirement 07: Status Change Modal (மரணப்பதிவு / பதிவுமாற்றம்) */}
      {statusModalBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>📜</span>
                  <span>{lang === 'ta' ? 'பிரஜை நிலை மாற்றம் / பதிவு விபரம்' : 'Citizen Lifecycle Status Update'}</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {statusModalBeneficiary.nameTa} · {statusModalBeneficiary.nic}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalBeneficiary(null)}
                className="text-slate-400 hover:text-slate-700 text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatusChange} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  {lang === 'ta' ? 'தற்போதைய நிலை (Status):' : 'Select Status:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ACTIVE', labelTa: 'செயலில்', labelEn: 'Active', bg: 'bg-emerald-700' },
                    { id: 'DECEASED', labelTa: 'மரணப்பதிவு', labelEn: 'Deceased', bg: 'bg-slate-900' },
                    { id: 'TRANSFERRED', labelTa: 'பதிவுமாற்றம்', labelEn: 'Transferred', bg: 'bg-purple-800' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatusForm({ ...statusForm, status: s.id as CitizenStatus })}
                      className={`py-2 px-2 rounded-lg font-bold text-center border transition-all ${
                        statusForm.status === s.id
                          ? `${s.bg} text-white shadow-xs`
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lang === 'ta' ? s.labelTa : s.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deceased Specific Fields */}
              {statusForm.status === 'DECEASED' && (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-2.5">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>⚰️</span>
                    <span>{lang === 'ta' ? 'மரண விபரங்கள் (Deceased Details)' : 'Deceased Information'}</span>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'ta' ? 'மரணமடைந்த திகதி:' : 'Date of Death:'}
                    </label>
                    <input
                      type="date"
                      required
                      value={statusForm.deathDate}
                      onChange={(e) => setStatusForm({ ...statusForm, deathDate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'ta' ? 'இறப்பு சான்றிதழ் இலக்கம் / குறிப்பு:' : 'Death Certificate No / Reference:'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DC-VHR-2026-089"
                      value={statusForm.deathCertificateNo}
                      onChange={(e) => setStatusForm({ ...statusForm, deathCertificateNo: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Transferred Out Specific Fields */}
              {statusForm.status === 'TRANSFERRED' && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg space-y-2.5">
                  <div className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                    <span>🚚</span>
                    <span>{lang === 'ta' ? 'பதிவுமாற்ற விபரங்கள் (Transfer Out Details)' : 'Transfer Out Details'}</span>
                  </div>
                  <div>
                    <label className="block text-purple-900 font-semibold mb-1">
                      {lang === 'ta' ? 'மாற்றப்பட்டுச் சென்ற பிரதேச செயலகம் / கிராமம்:' : 'Transferred To DS Division / Area:'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. கோறளைப்பற்று மத்தி (வாழைச்சேனை) / மட்டக்களப்பு"
                      value={statusForm.transferredToDivision}
                      onChange={(e) => setStatusForm({ ...statusForm, transferredToDivision: e.target.value })}
                      className="w-full px-3 py-1.5 border border-purple-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-purple-900 font-semibold mb-1">
                      {lang === 'ta' ? 'பதிவு மாற்றம் செய்யப்பட்ட திகதி:' : 'Date of Transfer:'}
                    </label>
                    <input
                      type="date"
                      required
                      value={statusForm.transferredDate}
                      onChange={(e) => setStatusForm({ ...statusForm, transferredDate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-purple-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'ta' ? 'அதிகாரபூர்வ குறிப்பு / காரணம்:' : 'Official Remarks:'}
                </label>
                <textarea
                  rows={2}
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder={lang === 'ta' ? 'காரணம் மற்றும் கிராம அலுவலர் ஆவணக் குறிப்பு...' : 'Remarks and document references...'}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 font-medium">
                ℹ️ {lang === 'ta'
                  ? 'குறிப்பு: இந்நிலை மாற்றம் குடும்ப அலகு (Family QR) பதிவுகளில் இருந்து இவரை நீக்காது; ஆனால் மரணப்பதிவு/பதிவுமாற்றம் என தெளிவாக அடையாளப்படுத்தும்.'
                  : 'Note: This keeps the family QR linkage intact while explicitly recording the deceased/transferred status.'}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalBeneficiary(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'நிலையை சேமிக்க' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Citizen Modal */}
      {editingBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-4 sm:p-6 border border-slate-200 my-4 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-200 flex items-center justify-between">
              <span>{isNewRecord ? t.addBeneficiary : t.editBeneficiary}</span>
              <span className="text-xs font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                {formData.id}
              </span>
            </h3>

            <form onSubmit={handleSaveForm} className="mt-4 space-y-3.5">
              {/* System ID Section */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold">{t.systemId}:</span>
                  {isSuperAdmin && (
                    <span className="text-[10px] bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded font-bold font-mono">
                      SUPER ADMIN EDIT
                    </span>
                  )}
                </div>
                {isSuperAdmin ? (
                  <input
                    type="text"
                    value={formData.id || ''}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.trim() })}
                    className="w-full px-2.5 py-1.5 border border-purple-300 rounded font-mono font-bold text-slate-900 bg-white"
                  />
                ) : (
                  <strong className="font-mono text-emerald-900 block">{formData.id}</strong>
                )}
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {lang === 'ta' ? 'நிரந்தர கணனி பிரஜை பதிவு இலக்கம்' : 'Permanent citizen system registration ID'}
                </span>
              </div>

              {/* NIC Section with Provisional Computer NIC toggle & Auto Sri Lankan Parser */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    {t.nic}
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-900 font-medium">
                    <input
                      type="checkbox"
                      checked={formData.isProvisionalNic ?? false}
                      onChange={(e) => handleToggleNoNic(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>{t.hasNoNicYet}</span>
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="e.g. 198421500321 or 842150321V"
                  value={formData.nic || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim().toUpperCase();
                    const parsed = parseSriLankanNic(val);
                    if (parsed.isValid && parsed.birthDate) {
                      setFormData((prev) => ({
                        ...prev,
                        nic: val,
                        gender: parsed.gender || prev.gender,
                        dob: parsed.birthDate || prev.dob,
                      }));
                    } else {
                      setFormData((prev) => ({ ...prev, nic: val }));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                />

                {/* Auto-extracted Sri Lankan NIC result */}
                {(() => {
                  const p = parseSriLankanNic(formData.nic || '');
                  if (!p.isValid) return null;
                  return (
                    <div className="p-2 bg-emerald-50 border border-emerald-300 rounded text-[11px] text-emerald-950 flex items-center justify-between font-medium">
                      <span>
                        ✓ <strong>{lang === 'ta' ? 'அடையாள அட்டை கணக்கீடு:' : 'NIC Parsed:'}</strong>{' '}
                        {p.gender === 'FEMALE' ? (lang === 'ta' ? 'பெண் (Female)' : 'Female') : (lang === 'ta' ? 'ஆண் (Male)' : 'Male')}, {p.birthDate} ({p.age} {t.yearsOld})
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
                        {p.format.toUpperCase()}
                      </span>
                    </div>
                  );
                })()}

                {formData.isProvisionalNic && (
                  <div className="text-[10px] text-amber-800 font-medium">
                    ⚠️ {lang === 'ta' ? 'அடையாள அட்டை இல்லாத காரணத்தால் கணனி மூலம் தற்காலிக எண் ஒதுக்கப்பட்டுள்ளது. இது பார்கோட் மற்றும் டோக்கன் சேவைகளுக்கு செல்லுபடியாகும்.' : 'Provisional computer NIC assigned. Valid for barcode and token front desk services.'}
                  </div>
                )}
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.nameTamil} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="பெயர் தமிழில்"
                    value={formData.nameTa || ''}
                    onChange={(e) => setFormData({ ...formData, nameTa: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.nameEnglish}
                  </label>
                  <input
                    type="text"
                    placeholder="Name in English"
                    value={formData.nameEn || ''}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Gender, DOB, Division */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.gender}
                  </label>
                  <select
                    value={formData.gender || 'MALE'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="MALE">{t.male}</option>
                    <option value="FEMALE">{t.female}</option>
                    <option value="OTHER">{t.other}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.dob}
                  </label>
                  <input
                    type="date"
                    value={formData.dob || '2000-01-01'}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                  {formData.dob && (
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      {t.age}: {calculateAge(formData.dob)} {t.yearsOld}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.division}
                  </label>
                  <select
                    disabled={isGramaNiladhari}
                    value={formData.divisionCode || '211'}
                    onChange={(e) => setFormData({ ...formData, divisionCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  >
                    {divisions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nameTa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chronic Illness Dropdown (NEW) */}
              <div>
                <label className="block text-xs font-bold text-red-900 mb-1">
                  🏥 {t.chronicIllness}
                </label>
                <select
                  value={formData.chronicIllness || 'NONE'}
                  onChange={(e) => setFormData({ ...formData, chronicIllness: e.target.value as ChronicIllness })}
                  className="w-full px-3 py-2 text-xs border border-red-200 rounded-lg bg-red-50/40 text-slate-900 font-medium"
                >
                  <option value="NONE">{t.illnessNone}</option>
                  <option value="CKD_KIDNEY">{t.illnessCkd}</option>
                  <option value="CANCER">{t.illnessCancer}</option>
                  <option value="THALASSEMIA">{t.illnessThalassemia}</option>
                  <option value="HEART_DISEASE">{t.illnessHeart}</option>
                  <option value="DIABETES_CHRONIC">{t.illnessDiabetes}</option>
                  <option value="DISABILITY_PHYSICAL">{t.illnessPhysicalDisability}</option>
                  <option value="MENTAL_HEALTH">{t.illnessMentalHealth}</option>
                  <option value="OTHER_CHRONIC">{t.illnessOther}</option>
                </select>
              </div>

              {/* Restructured Welfare & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.welfareScheme}
                  </label>
                  <select
                    value={formData.welfareScheme || 'NONE'}
                    onChange={(e) => setFormData({ ...formData, welfareScheme: e.target.value as WelfareScheme })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="NONE">{t.schemeNone}</option>
                    <option value="ASWESUMA_EXTREME">{t.schemeAswesumaExtreme}</option>
                    <option value="ASWESUMA_POOR">{t.schemeAswesumaPoor}</option>
                    <option value="ASWESUMA_VULNERABLE">{t.schemeAswesumaVulnerable}</option>
                    <option value="ASWESUMA_TRANSITIONAL">{t.schemeAswesumaTransitional}</option>
                    <option value="SAMURDHI">{t.schemeSamurdhi}</option>
                    <option value="ELDERLY">{t.schemeElderly}</option>
                    <option value="DISABILITY">{t.schemeDisability}</option>
                    <option value="CHRONIC_KIDNEY">{t.schemeChronicKidney}</option>
                    <option value="FARMER_SUBSIDY">{t.schemeFarmer}</option>
                    <option value="FISHERY_AID">{t.schemeFishery}</option>
                    <option value="DISASTER_RELIEF">{t.schemeDisaster}</option>
                    <option value="SELF_EMPLOYMENT">{t.schemeSelfEmployment}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.welfareStatus}
                  </label>
                  <select
                    value={formData.welfareStatus || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, welfareStatus: e.target.value as WelfareStatus })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ACTIVE">{t.statusActive}</option>
                    <option value="PENDING">{t.statusPending}</option>
                    <option value="WAITLIST">{t.statusWaitlist}</option>
                    <option value="REJECTED">{t.statusRejected}</option>
                  </select>
                </div>
              </div>

              {/* Household & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.householdNo}
                  </label>
                  <input
                    type="text"
                    value={formData.householdNo || ''}
                    onChange={(e) => setFormData({ ...formData, householdNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.phone}
                  </label>
                  <input
                    type="text"
                    placeholder="07XXXXXXXX"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.address}
                </label>
                <input
                  type="text"
                  placeholder="Street / Village address in Vaharai"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="familyHeadCheck"
                  checked={formData.familyHead ?? true}
                  onChange={(e) => setFormData({ ...formData, familyHead: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-600"
                />
                <label htmlFor="familyHeadCheck" className="text-xs text-slate-700">
                  {t.familyHead} (குடும்பத் தலைவர்)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBeneficiary(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
