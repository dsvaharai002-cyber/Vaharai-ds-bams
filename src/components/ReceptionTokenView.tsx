import React, { useState, useEffect } from 'react';
import { QueueToken, ServiceType, TokenStatus, Beneficiary, GNDivision, User, TokenForwardRecord } from '../types';
import { Language, translations } from '../translations/i18n';
import { ThermalPrintReceipt } from './ThermalPrintReceipt';
import { VaharaiLogo } from './VaharaiLogo';
import { CitizenProfileModal } from './CitizenProfileModal';
import { BeneficiaryIdCardModal } from './BeneficiaryIdCardModal';
import { generateSystemCitizenId, generateProvisionalNic } from '../services/storage';

interface ReceptionTokenViewProps {
  tokens: QueueToken[];
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  currentUser?: User;
  lang: Language;
  onUpdateTokens: (tokens: QueueToken[]) => void;
  onUpdateBeneficiaries?: (items: Beneficiary[]) => void;
  onAuditLog: (action: string, details: string) => void;
  onNavigateToLiveDisplay?: () => void;
}

export const ReceptionTokenView: React.FC<ReceptionTokenViewProps> = ({
  tokens,
  beneficiaries,
  divisions,
  currentUser,
  lang,
  onUpdateTokens,
  onUpdateBeneficiaries,
  onAuditLog,
  onNavigateToLiveDisplay,
}) => {
  const t = translations[lang];

  // Token Issuing Form State
  const [selectedService, setSelectedService] = useState<ServiceType>('WELFARE_SCHEME');
  const [officerToMeet, setOfficerToMeet] = useState<string>('அட்மின் 1 (Admin 1)');
  const [citizenNic, setCitizenNic] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenNameEn, setCitizenNameEn] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenAddress, setCitizenAddress] = useState('');
  const [citizenFamilyCode, setCitizenFamilyCode] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('211');

  // Specialized Category Checkboxes for New Citizen Registration
  const [showCitizenRegPanel, setShowCitizenRegPanel] = useState<boolean>(false);
  const [isPregnantMother, setIsPregnantMother] = useState<boolean>(false);
  const [pregnancyMonths, setPregnancyMonths] = useState<number>(5);
  const [isPersonWithDisability, setIsPersonWithDisability] = useState<boolean>(false);
  const [disabilityNote, setDisabilityNote] = useState<string>('உடல் ஊனம் (Physical)');
  const [isWomanHeadedHousehold, setIsWomanHeadedHousehold] = useState<boolean>(false);
  const [isSamurdhiBeneficiary, setIsSamurdhiBeneficiary] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string>('');

  // Modals State
  const [activeReceiptToken, setActiveReceiptToken] = useState<QueueToken | null>(null);
  const [selectedTokenForDetails, setSelectedTokenForDetails] = useState<QueueToken | null>(null);
  const [selectedBeneficiaryForCard, setSelectedBeneficiaryForCard] = useState<Beneficiary | null>(null);

  // Notes Modal State
  const [selectedTokenForNotes, setSelectedTokenForNotes] = useState<QueueToken | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>('');

  // Forward Token Modal State
  const [selectedTokenForForward, setSelectedTokenForForward] = useState<QueueToken | null>(null);
  const [forwardTargetOfficer, setForwardTargetOfficer] = useState<string>('அட்மின் 1 (Admin 1)');
  const [forwardReason, setForwardReason] = useState<string>('');

  // Complete Token Modal with Star Rating
  const [selectedTokenForComplete, setSelectedTokenForComplete] = useState<QueueToken | null>(null);
  const [completionRating, setCompletionRating] = useState<number>(5);
  const [completionFeedback, setCompletionFeedback] = useState<string>('');

  // Live Timer for dynamic waiting time calculation
  const [nowTime, setNowTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 20000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedWaitMinutes = (issuedAt: string): number => {
    const diff = Math.floor((nowTime - new Date(issuedAt).getTime()) / 60000);
    return diff >= 0 ? diff : 0;
  };

  // Audio chime for calling numbers
  const playCallingChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // AudioContext fallback
    }
  };

  const getServicePrefix = (service: ServiceType): { prefix: string; counter: number; labelTa: string; labelEn: string; defaultOfficer: string } => {
    switch (service) {
      case 'LAND_PERMIT':
        return { prefix: 'L', counter: 2, labelTa: t.serviceLand, labelEn: 'Land Permits & Boundary Inquiries', defaultOfficer: 'அட்மின் 1 (Admin 1)' };
      case 'WELFARE_SCHEME':
        return { prefix: 'W', counter: 4, labelTa: t.serviceWelfare, labelEn: 'Aswesuma & Samurdhi Welfare', defaultOfficer: 'அட்மின் 2 (Admin 2)' };
      case 'CIVIL_REGISTRATION':
        return { prefix: 'C', counter: 1, labelTa: t.serviceCivil, labelEn: 'Birth / Death / Marriage Registration', defaultOfficer: 'பிறப்பு/இறப்பு பதிவாளர் (Civil Registrar)' };
      case 'GRAMA_CERTIFICATE':
        return { prefix: 'G', counter: 3, labelTa: t.serviceGramaCert, labelEn: 'Grama Niladhari Certificates', defaultOfficer: 'கிராம அலுவலர் (Grama Niladhari)' };
      case 'PUBLIC_ASSISTANCE':
        return { prefix: 'P', counter: 5, labelTa: t.servicePublicAssist, labelEn: 'Public Assistance & Relief', defaultOfficer: 'அட்மின் 2 (Admin 2)' };
      case 'GENERAL_INQUIRY':
      default:
        return { prefix: 'A', counter: 6, labelTa: t.serviceGeneral, labelEn: 'General Guidance & Inquiries', defaultOfficer: 'அட்மின் 1 (Admin 1)' };
    }
  };

  // Change default officer when service changes
  const handleServiceChange = (service: ServiceType) => {
    setSelectedService(service);
    const { defaultOfficer } = getServicePrefix(service);
    setOfficerToMeet(defaultOfficer);
  };

  // Auto lookup citizen name if NIC matches existing beneficiary
  const handleNicChange = (nicVal: string) => {
    setCitizenNic(nicVal);
    const matched = beneficiaries.find((b) => b.nic.toLowerCase() === nicVal.trim().toLowerCase());
    if (matched) {
      setCitizenName(matched.nameTa || matched.nameEn);
      setCitizenNameEn(matched.nameEn || '');
      setCitizenPhone(matched.phone || '');
      setCitizenAddress(matched.address || '');
      setCitizenFamilyCode(matched.familyCode || matched.householdNo || '');
      setSelectedDivision(matched.divisionCode);
      setIsPregnantMother(!!matched.isPregnantMother);
      setIsPersonWithDisability(!!matched.isPersonWithDisability);
      setIsWomanHeadedHousehold(!!matched.isWomanHeadedHousehold);
      setIsSamurdhiBeneficiary(!!matched.isSamurdhiBeneficiary);
    }
  };

  // Generate computer provisional NIC for citizen without ID card
  const handleGenerateProvisionalNic = () => {
    const provNic = generateProvisionalNic(selectedDivision);
    setCitizenNic(provNic);
    setShowCitizenRegPanel(true);
  };

  // 1. SAVE NEW CITIZEN TO DATABASE (Requirement: வரவேற்பு பீடத்தில் புதியவரை பதிவு செய்யுமபோது சேவ் பட்டனும் தேவை)
  const handleSaveCitizenToDb = (isAlsoIssuingToken: boolean = false) => {
    if (!citizenName.trim()) {
      alert(lang === 'ta' ? 'பிரஜையின் பெயர் கட்டாயம் தேவை!' : 'Citizen name is required!');
      return;
    }

    const effectiveNic = citizenNic.trim() || generateProvisionalNic(selectedDivision);
    if (!citizenNic.trim()) {
      setCitizenNic(effectiveNic);
    }

    const effectiveFamilyCode = citizenFamilyCode.trim() || `FAM-${selectedDivision}-${Math.floor(Math.random() * 900 + 100)}`;
    const systemId = generateSystemCitizenId(selectedDivision, beneficiaries.length + 1);

    // Check if citizen exists
    const existingIndex = beneficiaries.findIndex(
      (b) => b.nic.toLowerCase().trim() === effectiveNic.toLowerCase().trim()
    );

    let updatedBeneficiaries: Beneficiary[];
    if (existingIndex >= 0) {
      // Update existing citizen record
      const updatedItem: Beneficiary = {
        ...beneficiaries[existingIndex],
        nameTa: citizenName.trim(),
        nameEn: citizenNameEn.trim() || citizenName.trim(),
        phone: citizenPhone.trim() || beneficiaries[existingIndex].phone,
        address: citizenAddress.trim() || beneficiaries[existingIndex].address,
        divisionCode: selectedDivision,
        familyCode: effectiveFamilyCode,
        isPregnantMother,
        pregnancyStageMonths: isPregnantMother ? pregnancyMonths : undefined,
        isPersonWithDisability,
        disabilityType: isPersonWithDisability ? disabilityNote : undefined,
        isWomanHeadedHousehold,
        isSamurdhiBeneficiary,
        updatedAt: new Date().toISOString(),
      };
      updatedBeneficiaries = [...beneficiaries];
      updatedBeneficiaries[existingIndex] = updatedItem;
    } else {
      // Create new citizen
      const newBeneficiary: Beneficiary = {
        id: systemId,
        nic: effectiveNic,
        isProvisionalNic: effectiveNic.startsWith('TNIC'),
        nameTa: citizenName.trim(),
        nameEn: citizenNameEn.trim() || citizenName.trim(),
        gender: 'MALE',
        dob: '1995-01-01',
        phone: citizenPhone.trim(),
        address: citizenAddress.trim() || `வாகரை (${selectedDivision})`,
        divisionCode: selectedDivision,
        familyHead: true,
        householdNo: `HH-${selectedDivision}-001`,
        familyCode: effectiveFamilyCode,
        familyRelationship: 'HEAD',
        isPregnantMother,
        pregnancyStageMonths: isPregnantMother ? pregnancyMonths : undefined,
        isPersonWithDisability,
        disabilityType: isPersonWithDisability ? disabilityNote : undefined,
        isWomanHeadedHousehold,
        isSamurdhiBeneficiary,
        welfareScheme: isSamurdhiBeneficiary ? 'SAMURDHI' : isPersonWithDisability ? 'DISABILITY' : 'NONE',
        welfareStatus: 'ACTIVE',
        chronicIllness: isPersonWithDisability ? 'DISABILITY_PHYSICAL' : 'NONE',
        barcode: effectiveNic,
        qrPayload: `ID:${systemId}|NIC:${effectiveNic}|DIV:${selectedDivision}`,
        familyQrPayload: `VHR-FAMILY|FAM:${effectiveFamilyCode}|DIV:${selectedDivision}`,
        notes: `வரவேற்பகத்தில் பதிவு செய்யப்பட்டது (${currentUser?.name || 'Reception'})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedBeneficiaries = [newBeneficiary, ...beneficiaries];
    }

    if (onUpdateBeneficiaries) {
      onUpdateBeneficiaries(updatedBeneficiaries);
    }

    onAuditLog(
      'SAVE_CITIZEN_RECEPTION',
      `Saved citizen ${citizenName.trim()} (${effectiveNic}) with Family Code ${effectiveFamilyCode}`
    );

    setSaveSuccessNotice(
      lang === 'ta'
        ? `✓ பிரஜை "${citizenName.trim()}" (${effectiveNic}) தரவுத்தளத்தில் வெற்றிகரமாக சேமிக்கப்பட்டார்!`
        : `✓ Citizen "${citizenName.trim()}" (${effectiveNic}) saved to database successfully!`
    );
    setTimeout(() => setSaveSuccessNotice(''), 4500);

    // If issuing token as well, trigger token issuance
    if (isAlsoIssuingToken) {
      handleIssueTokenDirect(effectiveNic, citizenName.trim(), effectiveFamilyCode);
    }
  };

  // Issue new token helper
  const handleIssueTokenDirect = (nicToUse: string, nameToUse: string, famCode?: string) => {
    const { prefix, counter } = getServicePrefix(selectedService);
    const serviceTokens = tokens.filter((tItem) => tItem.serviceType === selectedService);
    const nextSeq = serviceTokens.length + 101;
    const tokenNumber = `${prefix}-${nextSeq}`;

    const newToken: QueueToken = {
      id: `T-${Date.now().toString().slice(-4)}`,
      tokenNumber,
      serviceType: selectedService,
      counterNo: counter,
      officerToMeet: officerToMeet.trim() || 'அட்மின் 1 (Admin 1)',
      citizenName: nameToUse.trim(),
      citizenNic: nicToUse.trim(),
      divisionCode: selectedDivision,
      status: 'WAITING',
      issuedAt: new Date().toISOString(),
      barcode: tokenNumber,
      familyCode: famCode || citizenFamilyCode || undefined,
    };

    const updated = [newToken, ...tokens];
    onUpdateTokens(updated);
    onAuditLog(
      'ISSUE_TOKEN',
      `Issued Token ${tokenNumber} for ${newToken.officerToMeet} at Counter ${counter} (${newToken.citizenName || 'Citizen'})`
    );

    setActiveReceiptToken(newToken);
  };

  const handleIssueTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleIssueTokenDirect(citizenNic, citizenName);
  };

  const handleUpdateStatus = (tokenId: string, nextStatus: TokenStatus) => {
    const updated = tokens.map((tItem) => {
      if (tItem.id === tokenId) {
        if (nextStatus === 'CALLING') {
          playCallingChime();
          return { ...tItem, status: nextStatus, calledAt: new Date().toISOString() };
        }
        if (nextStatus === 'COMPLETED') {
          return {
            ...tItem,
            status: nextStatus,
            completedAt: new Date().toISOString(),
            servedByOfficerId: currentUser?.id,
            servedByOfficerName: currentUser?.name || 'அட்மின் 1 (Admin 1)',
            rating: tItem.rating || 5,
          };
        }
        return { ...tItem, status: nextStatus };
      }
      return tItem;
    });

    onUpdateTokens(updated);
    const token = tokens.find((tItem) => tItem.id === tokenId);
    onAuditLog('UPDATE_TOKEN_STATUS', `Token ${token?.tokenNumber} status changed to ${nextStatus}`);
  };

  // Handle Save Token Notes
  const handleSaveNotes = () => {
    if (!selectedTokenForNotes) return;
    const updated = tokens.map((tItem) => {
      if (tItem.id === selectedTokenForNotes.id) {
        return { ...tItem, notes: notesDraft.trim() };
      }
      return tItem;
    });
    onUpdateTokens(updated);
    onAuditLog('UPDATE_TOKEN_NOTES', `Updated note for token ${selectedTokenForNotes.tokenNumber}`);
    setSelectedTokenForNotes(null);
  };

  // Handle Forward Token
  const handleConfirmForward = () => {
    if (!selectedTokenForForward) return;
    const fromOfficer = selectedTokenForForward.officerToMeet || currentUser?.name || 'Reception';
    const record: TokenForwardRecord = {
      fromOfficer,
      toOfficer: forwardTargetOfficer,
      forwardedAt: new Date().toISOString(),
      reason: forwardReason.trim() || undefined,
    };

    const updated = tokens.map((tItem) => {
      if (tItem.id === selectedTokenForForward.id) {
        return {
          ...tItem,
          officerToMeet: forwardTargetOfficer,
          forwardedFrom: fromOfficer,
          forwardHistory: [...(tItem.forwardHistory || []), record],
          status: 'WAITING' as const,
          notes: tItem.notes
            ? `${tItem.notes} | Forwarded to ${forwardTargetOfficer} (${forwardReason})`
            : `Forwarded to ${forwardTargetOfficer} (${forwardReason})`,
        };
      }
      return tItem;
    });

    onUpdateTokens(updated);
    onAuditLog('FORWARD_TOKEN', `Token ${selectedTokenForForward.tokenNumber} forwarded to ${forwardTargetOfficer}`);
    setSelectedTokenForForward(null);
    setForwardReason('');
  };

  // Handle Confirm Complete with Star Rating
  const handleConfirmComplete = () => {
    if (!selectedTokenForComplete) return;
    const issuedTime = new Date(selectedTokenForComplete.issuedAt).getTime();
    const durationMins = Math.max(1, Math.round((Date.now() - issuedTime) / 60000));

    const updated = tokens.map((tItem) => {
      if (tItem.id === selectedTokenForComplete.id) {
        return {
          ...tItem,
          status: 'COMPLETED' as const,
          completedAt: new Date().toISOString(),
          servedByOfficerId: currentUser?.id,
          servedByOfficerName: currentUser?.name || selectedTokenForComplete.officerToMeet,
          rating: completionRating,
          ratingFeedback: completionFeedback.trim() || undefined,
          serviceDurationMinutes: durationMins,
        };
      }
      return tItem;
    });

    onUpdateTokens(updated);
    onAuditLog(
      'COMPLETE_SERVICE_WITH_RATING',
      `Service completed for token ${selectedTokenForComplete.tokenNumber} with ${completionRating} stars.`
    );
    setSelectedTokenForComplete(null);
  };

  // Find corresponding beneficiary for a token
  const getBeneficiaryForToken = (token: QueueToken): Beneficiary | undefined => {
    if (token.citizenNic) {
      const byNic = beneficiaries.find(
        (b) => b.nic.toLowerCase().trim() === token.citizenNic.toLowerCase().trim()
      );
      if (byNic) return byNic;
    }
    if (token.citizenName) {
      const byName = beneficiaries.find(
        (b) =>
          b.nameTa.toLowerCase().includes(token.citizenName.toLowerCase()) ||
          b.nameEn.toLowerCase().includes(token.citizenName.toLowerCase())
      );
      if (byName) return byName;
    }
    return undefined;
  };

  const handleOpenCitizenDetails = (tok: QueueToken) => {
    setSelectedTokenForDetails(tok);
    onAuditLog('VIEW_CITIZEN_DOSSIER', `Viewed details for token ${tok.tokenNumber} (${tok.citizenName || tok.citizenNic})`);
  };

  const waitingTokens = tokens.filter((tItem) => tItem.status === 'WAITING');
  const activeCallingTokens = tokens.filter((tItem) => tItem.status === 'CALLING' || tItem.status === 'SERVING');
  const completedTokens = tokens.filter((tItem) => tItem.status === 'COMPLETED');

  const matchedBeneficiary = selectedTokenForDetails
    ? getBeneficiaryForToken(selectedTokenForDetails)
    : null;

  const matchedDivision = matchedBeneficiary
    ? divisions.find((d) => d.code === matchedBeneficiary.divisionCode)
    : undefined;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🎫</span>
            <span>{t.receptionTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ta'
              ? 'வரவேற்பகத்தில் புதிய பிரஜையை சேமித்தல், வரிசை டோக்கன் வழங்கல், காத்திருக்கும் நேர கண்காணிப்பு மற்றும் தர்மல் ரசீது அச்சிடல்'
              : 'Save new citizens to database, issue queue tokens, track real-time waiting elapsed time, and print receipts with feedback slip.'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
            <span>⏱️ {t.waitingQueue}:</span>
            <span className="font-mono text-sm">{waitingTokens.length}</span>
          </div>

          {onNavigateToLiveDisplay && (
            <button
              onClick={onNavigateToLiveDisplay}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>📺</span>
              <span>{lang === 'ta' ? 'நேரலை டிவி காட்சிப் பலகை' : 'Live TV Display Board'}</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs">
          <span>{saveSuccessNotice}</span>
          <button onClick={() => setSaveSuccessNotice('')} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* Grid: Token Issuer Form & Calling Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Issue New Token & Save Citizen Card */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              <h3 className="text-sm font-bold text-slate-900">{t.issueNewToken}</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCitizenRegPanel(!showCitizenRegPanel)}
              className="text-[11px] text-emerald-800 font-bold hover:underline flex items-center gap-1"
            >
              <span>{showCitizenRegPanel ? '▲ சுருக்குக' : '▼ மேலதிக பிரஜை பதிவு'}</span>
            </button>
          </div>

          <form onSubmit={handleIssueTokenSubmit} className="space-y-3.5">
            {/* 1. Required Service */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.selectService} *
              </label>
              <select
                value={selectedService}
                onChange={(e) => handleServiceChange(e.target.value as ServiceType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
              >
                <option value="WELFARE_SCHEME">W - {t.serviceWelfare} (Counter 4)</option>
                <option value="LAND_PERMIT">L - {t.serviceLand} (Counter 2)</option>
                <option value="CIVIL_REGISTRATION">C - {t.serviceCivil} (Counter 1)</option>
                <option value="GRAMA_CERTIFICATE">G - {t.serviceGramaCert} (Counter 3)</option>
                <option value="PUBLIC_ASSISTANCE">P - {t.servicePublicAssist} (Counter 5)</option>
                <option value="GENERAL_INQUIRY">A - {t.serviceGeneral} (Counter 6)</option>
              </select>
            </div>

            {/* 2. CRITICAL: யாரை பார்க்க வேண்டும்? (Whom to meet?) */}
            <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-amber-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm">❓</span>
                  <span>{lang === 'ta' ? 'யாரை பார்க்க வேண்டும்? (Whom to Meet)' : 'Whom do you want to see? *'}</span>
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                  கட்டாயம்
                </span>
              </label>

              <select
                value={officerToMeet}
                onChange={(e) => setOfficerToMeet(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-900"
              >
                <option value="அட்மின் 1 (Admin 1)">👔 அட்மின் 01 (Admin 1 - நிர்வாக உத்தியோகத்தர் 01)</option>
                <option value="அட்மின் 2 (Admin 2)">👔 அட்மின் 02 (Admin 2 - நிர்வாக உத்தியோகத்தர் 02)</option>
                <option value="பிரதேச செயலாளர் (Super Admin)">🏛️ பிரதேச செயலாளர் / தலைமை நிர்வாகி (Super Admin)</option>
                <option value="காணி பிரிவு உத்தியோகத்தர்">🗺️ காணி பிரிவு உத்தியோகத்தர் (Land Officer)</option>
                <option value="கணக்காளர் / நிதிப் பிரிவு">💰 கணக்காளர் / நிதிப் பிரிவு (Accountant / Finance)</option>
                <option value="அஸ்வெசும / சமூர்த்தி உத்தியோகத்தர்">🤝 அஸ்வெசும / சமூர்த்தி நலன்புரி உத்தியோகத்தர்</option>
                <option value="பிறப்பு/இறப்பு பதிவாளர் (Civil Registrar)">📜 பிறப்பு / இறப்பு / விவாக பதிவாளர் (Civil Registrar)</option>
                <option value="கிராம அலுவலர் (Grama Niladhari)">🌾 கிராம அலுவலர் (Grama Niladhari)</option>
                <option value="ECDO (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)">🤰 ECDO (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)</option>
                <option value="அங்கவீனர் பதிவாளர்">♿ அங்கவீனர் / மாற்றுத்திறனாளிகள் பதிவாளர்</option>
                <option value="பொதுமக்கள் வழிகாட்டல் உத்தியோகத்தர்">ℹ️ பொதுமக்கள் சேவை வழிகாட்டல் பிரிவு</option>
              </select>

              {/* Quick Select Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-amber-800 font-semibold">{lang === 'ta' ? 'விரைவு தேர்வு:' : 'Quick:'}</span>
                <button
                  type="button"
                  onClick={() => setOfficerToMeet('அட்மின் 1 (Admin 1)')}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors ${
                    officerToMeet.includes('அட்மின் 1') || officerToMeet.includes('Admin 1')
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  அட்மின் 1
                </button>
                <button
                  type="button"
                  onClick={() => setOfficerToMeet('அட்மின் 2 (Admin 2)')}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors ${
                    officerToMeet.includes('அட்மின் 2') || officerToMeet.includes('Admin 2')
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  அட்மின் 2
                </button>
                <button
                  type="button"
                  onClick={() => setOfficerToMeet('பிரதேச செயலாளர் (Super Admin)')}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors ${
                    officerToMeet.includes('பிரதேச செயலாளர்')
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  செயலாளர்
                </button>
              </div>
            </div>

            {/* 3. Citizen NIC / Auto ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {t.citizenNicOptional}
                </label>
                <button
                  type="button"
                  onClick={handleGenerateProvisionalNic}
                  className="text-[10px] text-emerald-800 font-semibold hover:underline"
                >
                  + {lang === 'ta' ? 'தற்காலிக கணனி NIC' : 'Auto NIC'}
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. 198421500321 or TNIC-..."
                value={citizenNic}
                onChange={(e) => handleNicChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* 4. Citizen Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'ta' ? 'பிரஜையின் பெயர் (Citizen Name) *' : 'Citizen Name *'}
              </label>
              <input
                type="text"
                placeholder="முழுப் பெயர் / Full Name"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                required
              />
            </div>

            {/* 5. GN Division */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.targetDivision}
              </label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {divisions.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} - {d.nameTa} ({d.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Expandable New Citizen Registration Details Panel */}
            {showCitizenRegPanel && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>{lang === 'ta' ? 'புதிய பிரஜை முழு விபரங்கள்' : 'Full Citizen Details'}</span>
                  <span className="text-[10px] font-mono text-emerald-800">DATABASE SAVE</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">தொலைபேசி எண் (Phone):</label>
                  <input
                    type="text"
                    placeholder="e.g. 0771234567"
                    value={citizenPhone}
                    onChange={(e) => setCitizenPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    {lang === 'ta' ? 'குடும்ப குறியீடு / குடும்ப QR (Family Code):' : 'Family Code:'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FAM-211-042"
                    value={citizenFamilyCode}
                    onChange={(e) => setCitizenFamilyCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                  <span className="text-[9.5px] text-slate-400">குடும்பத்தில் உள்ள 5 பேரும் ஒரே குடும்ப QR ஐப் பகிர்வர்.</span>
                </div>

                {/* Specialized Category Checkboxes */}
                <div className="pt-1 space-y-2 border-t border-slate-200 text-[11px]">
                  <span className="font-bold text-slate-700 block">சிறப்பு பிரிவுகள் (Special Categories):</span>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPregnantMother}
                      onChange={(e) => setIsPregnantMother(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-slate-800">🤰 கர்ப்பிணித் தாய் (ECDO Officer)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPersonWithDisability}
                      onChange={(e) => setIsPersonWithDisability(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-slate-800">♿ அங்கவீனர் / மாற்றுத்திறனாளி (Disability Officer)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWomanHeadedHousehold}
                      onChange={(e) => setIsWomanHeadedHousehold(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-slate-800">👩‍👧 பெண் தலைமைத்துவ குடும்பம் (WHH Officer)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSamurdhiBeneficiary}
                      onChange={(e) => setIsSamurdhiBeneficiary(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-slate-800">🌾 சமுர்த்தி / அஸ்வெசும பயனாளி (Samurdhi Officer)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons: Explicit SAVE BUTTON + SAVE & ISSUE + ISSUE ONLY */}
            <div className="pt-2 space-y-2">
              {/* Requirement: வரவேற்பு பீடத்தில் புதியவரை பதிவு செய்யுமபோது சேவ் பட்டனும் தேவை */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveCitizenToDb(false)}
                  className="w-full py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  title="Save citizen to database permanently"
                >
                  <span>💾</span>
                  <span>{lang === 'ta' ? 'தரவுத்தளத்தில் சேமி' : 'Save to DB'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCitizenToDb(true)}
                  className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  title="Save citizen to database and issue queue token"
                >
                  <span>💾+🎫</span>
                  <span>{lang === 'ta' ? 'சேமி & டோக்கன்' : 'Save & Token'}</span>
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <span>🖨️</span>
                <span>{t.generateAndPrint}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Column 2 & 3: Live Queue Board & Counter Calling Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Now Serving Board */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">📢</span>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
                  {t.nowServing} (Live Counter Calling)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-300 font-mono">
                  வாகரை பிரதேச செயலகம்
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {activeCallingTokens.length === 0 ? (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                  {lang === 'ta' ? 'தற்போது அழைப்பில் உள்ள டோக்கன்கள் இல்லை' : 'No tokens actively being called.'}
                </div>
              ) : (
                activeCallingTokens.map((tItem) => {
                  const elapsedWait = getElapsedWaitMinutes(tItem.issuedAt);
                  return (
                    <div
                      key={tItem.id}
                      className="p-4 bg-slate-800/90 rounded-xl border border-slate-700 text-center relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-[10px] font-semibold text-amber-400">
                        <span>{t.counter} {tItem.counterNo}</span>
                        <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-bold font-mono">
                          SERVING
                        </span>
                      </div>

                      <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white my-1.5 tracking-wider">
                        {tItem.tokenNumber}
                      </div>

                      <div className="text-xs text-slate-200 truncate font-semibold">
                        {tItem.citizenName || 'Public Citizen'}
                      </div>

                      {/* Whom to Meet Badge */}
                      <div className="mt-1 text-[11px] text-amber-300 font-medium bg-slate-900/60 py-0.5 px-2 rounded-lg inline-block">
                        👔 {tItem.officerToMeet || 'அட்மின் 1 (Admin 1)'}
                      </div>

                      {/* Live Waiting Time Counter */}
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900/80 rounded-full text-[10px] font-mono font-bold text-amber-300 border border-slate-700">
                          ⏱️ காத்திருக்கும் நேரம்: {elapsedWait} நிமி ({elapsedWait} mins)
                        </span>
                      </div>

                      {/* Token Actions: Dossier, Notes, Forward, Complete with Rating */}
                      <div className="mt-3 pt-2.5 border-t border-slate-700/80 flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenCitizenDetails(tItem)}
                          className="py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                          title="View citizen profile"
                        >
                          <VaharaiLogo size={14} className="w-3.5 h-3.5" />
                          <span>{lang === 'ta' ? 'தரவுகள்' : 'Profile'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTokenForNotes(tItem);
                            setNotesDraft(tItem.notes || '');
                          }}
                          className="py-1 px-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          title="Add / Edit Notes"
                        >
                          <span>📝</span>
                          <span>{lang === 'ta' ? 'குறிப்பு' : 'Note'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTokenForForward(tItem);
                            setForwardTargetOfficer('அட்மின் 1 (Admin 1)');
                          }}
                          className="py-1 px-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                          title="Forward Token"
                        >
                          <span>➡️</span>
                          <span>{lang === 'ta' ? 'போவேட்' : 'Forward'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTokenForComplete(tItem);
                            setCompletionRating(5);
                            setCompletionFeedback('');
                          }}
                          className="py-1 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          ✓ {t.completeService}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Waiting Queue List with Live Elapsed Counter, Note button & Forward button */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {t.waitingQueue} ({waitingTokens.length})
              </span>
              <span className="text-slate-500 text-[11px]">
                {lang === 'ta' ? 'வரிசைப்படி அழைக்கவும்' : 'Call in order of arrival'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {waitingTokens.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  {lang === 'ta' ? 'காத்திருப்பு வரிசையில் எவரும் இல்லை' : 'Queue is empty.'}
                </div>
              ) : (
                waitingTokens.map((tok, idx) => {
                  const elapsedWait = getElapsedWaitMinutes(tok.issuedAt);
                  const isLongWait = elapsedWait > 20;

                  return (
                    <div key={tok.id} className="p-3.5 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {tok.tokenNumber}
                            </span>
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              {t.counter} {tok.counterNo}
                            </span>
                            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                              👔 {tok.officerToMeet || 'அட்மின் 1'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 mt-0.5">
                            {tok.citizenName ? `${tok.citizenName} · ` : ''}
                            <span className="font-mono">{tok.citizenNic || tok.divisionCode}</span>
                          </div>

                          {/* Live Waiting Time Counter Badge */}
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                isLongWait
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span>⏱️ காத்திருக்கும் நேரம்:</span>
                              <strong>{elapsedWait} நிமி</strong>
                            </span>

                            {tok.forwardedFrom && (
                              <span className="text-[10px] text-purple-700 font-medium">
                                ➡️ {tok.forwardedFrom} இலிருந்து மாற்றப்பட்டது
                              </span>
                            )}
                          </div>

                          {tok.notes && (
                            <div className="mt-1 text-[10px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              📝 {tok.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                        {/* Dossier button */}
                        <button
                          onClick={() => handleOpenCitizenDetails(tok)}
                          className="py-1 px-2 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="View citizen details"
                        >
                          <VaharaiLogo size={14} className="w-3.5 h-3.5" />
                          <span>{lang === 'ta' ? 'விபரம்' : 'Details'}</span>
                        </button>

                        {/* Note button (குறிப்பு பட்டன்) */}
                        <button
                          onClick={() => {
                            setSelectedTokenForNotes(tok);
                            setNotesDraft(tok.notes || '');
                          }}
                          className="py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1"
                          title="Add / View Token Notes"
                        >
                          <span>📝</span>
                          <span>{lang === 'ta' ? 'குறிப்பு' : 'Note'}</span>
                        </button>

                        {/* Forward button (போவேட் பட்டன்) */}
                        <button
                          onClick={() => {
                            setSelectedTokenForForward(tok);
                            setForwardTargetOfficer('அட்மின் 1 (Admin 1)');
                          }}
                          className="py-1 px-2 bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 rounded text-xs font-semibold flex items-center gap-1"
                          title="Forward Token to Another Officer"
                        >
                          <span>➡️</span>
                          <span>{lang === 'ta' ? 'போவேட்' : 'Forward'}</span>
                        </button>

                        <button
                          onClick={() => setActiveReceiptToken(tok)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded text-xs"
                          title={t.printThermalReceipt}
                        >
                          🖨️
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(tok.id, 'CALLING')}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <span>🔔</span>
                          <span>{t.callNext}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Completed Services History */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800">
            {t.servedList} ({completedTokens.length})
          </span>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                <th className="pb-2">{t.tokenNumber}</th>
                <th className="pb-2">{t.timeIssued}</th>
                <th className="pb-2">சேவை வழங்கிய அலுவலர்</th>
                <th className="pb-2">பிரஜை / Citizen</th>
                <th className="pb-2">{t.division}</th>
                <th className="pb-2">நட்சத்திர மதிப்பீடு</th>
                <th className="pb-2 text-right">விபரம்</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {completedTokens.slice(0, 10).map((ct) => (
                <tr key={ct.id}>
                  <td className="py-2.5 font-mono font-bold text-slate-900">{ct.tokenNumber}</td>
                  <td className="py-2.5 font-mono text-[11px] text-slate-500">
                    {new Date(ct.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 font-bold text-slate-800">
                    {ct.servedByOfficerName || ct.officerToMeet || 'அட்மின் 1 (Admin 1)'}
                  </td>
                  <td className="py-2.5 text-slate-800">{ct.citizenName || ct.citizenNic || 'Citizen'}</td>
                  <td className="py-2.5 font-mono">{ct.divisionCode}</td>
                  <td className="py-2.5 font-mono text-amber-600 font-bold">
                    {'★'.repeat(ct.rating || 5)} ({ct.rating || 5}/5)
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleOpenCitizenDetails(ct)}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-emerald-900 rounded text-xs font-semibold inline-flex items-center gap-1 border border-slate-200"
                    >
                      <VaharaiLogo size={14} className="w-3.5 h-3.5" />
                      <span>{lang === 'ta' ? 'தரவுகள்' : 'Details'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Token Notes (குறிப்பு பட்டன்) */}
      {selectedTokenForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ta' ? 'டோக்கன் குறிப்பு / ஆவண விபரம்' : 'Token Remarks / Notes'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTokenForNotes(null)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="p-2.5 bg-slate-50 rounded-lg text-xs font-mono">
                <div><strong>வரிசை எண்:</strong> {selectedTokenForNotes.tokenNumber}</div>
                <div><strong>பிரஜை:</strong> {selectedTokenForNotes.citizenName || selectedTokenForNotes.citizenNic}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ta' ? 'உத்தியோகபூர்வ குறிப்பு / விபரம்:' : 'Officer Remark:'}
                </label>
                <textarea
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="e.g. காணி அனுமதிப்பத்திரம் சரிபார்க்கப்பட்டது..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTokenForNotes(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'சேமி (Save Note)' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Forward Token to another officer (போவேட் பட்டன்) */}
      {selectedTokenForForward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">➡️</span>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ta' ? 'டோக்கனை வேறு அலுவலருக்கு மாற்றுக (Forward Token)' : 'Forward Token to Officer'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTokenForForward(null)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                <div><strong>டோக்கன்:</strong> <span className="font-mono font-bold">{selectedTokenForForward.tokenNumber}</span></div>
                <div><strong>பிரஜை:</strong> {selectedTokenForForward.citizenName || selectedTokenForForward.citizenNic}</div>
                <div><strong>தற்போதைய அலுவலர்:</strong> {selectedTokenForForward.officerToMeet}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ta' ? 'யாரிடம் மாற்ற வேண்டும்? (Forward To):' : 'Forward To:'}
                </label>
                <select
                  value={forwardTargetOfficer}
                  onChange={(e) => setForwardTargetOfficer(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  <option value="அட்மின் 1 (Admin 1)">👔 அட்மின் 01 (Admin 1 - நிர்வாக உத்தியோகத்தர் 01)</option>
                  <option value="அட்மின் 2 (Admin 2)">👔 அட்மின் 02 (Admin 2 - நிர்வாக உத்தியோகத்தர் 02)</option>
                  <option value="பிரதேச செயலாளர் (Super Admin)">🏛️ பிரதேச செயலாளர் (Super Admin)</option>
                  <option value="காணி பிரிவு உத்தியோகத்தர்">🗺️ காணி பிரிவு உத்தியோகத்தர் (Land Officer)</option>
                  <option value="கணக்காளர் / நிதிப் பிரிவு">💰 கணக்காளர் / நிதிப் பிரிவு (Accountant / Finance)</option>
                  <option value="அஸ்வெசும / சமூர்த்தி உத்தியோகத்தர்">🤝 அஸ்வெசும / சமூர்த்தி நலன்புரி உத்தியோகத்தர்</option>
                  <option value="பிறப்பு/இறப்பு பதிவாளர் (Civil Registrar)">📜 பிறப்பு / இறப்பு பதிவாளர் (Civil Registrar)</option>
                  <option value="ECDO (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)">🤰 ECDO (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)</option>
                  <option value="அங்கவீனர் பதிவாளர்">♿ அங்கவீனர் / மாற்றுத்திறனாளிகள் பதிவாளர்</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ta' ? 'மாற்றுவதற்கான காரணம் / அறிவுறுத்தல்:' : 'Reason / Handover Note:'}
                </label>
                <input
                  type="text"
                  value={forwardReason}
                  onChange={(e) => setForwardReason(e.target.value)}
                  placeholder="e.g. மேலதிக காணி ஆவண சரிபார்ப்புக்கு..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTokenForForward(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmForward}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'மாற்றுக (Forward)' : 'Forward'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Complete Service with Star Rating */}
      {selectedTokenForComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ta' ? 'சேவை நிறைவு & நட்சத்திர மதிப்பீடு பதிவு' : 'Complete Service & Rating'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTokenForComplete(null)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                <div><strong>வரிசை எண்:</strong> <span className="font-mono font-bold">{selectedTokenForComplete.tokenNumber}</span></div>
                <div><strong>பிரஜை:</strong> {selectedTokenForComplete.citizenName || selectedTokenForComplete.citizenNic}</div>
                <div><strong>சேவை வழங்கிய அலுவலர்:</strong> <span className="font-bold">{currentUser?.name || selectedTokenForComplete.officerToMeet}</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ta' ? 'பிரஜையின் சேவை திருப்தி நட்சத்திர மதிப்பீடு:' : 'Satisfaction Star Rating:'}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCompletionRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        star <= completionRating ? 'text-amber-500' : 'text-slate-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 font-mono ml-2">
                    {completionRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ta' ? 'பிரஜையின் கருத்து / குறிப்பு:' : 'Citizen Feedback:'}
                </label>
                <textarea
                  rows={2}
                  value={completionFeedback}
                  onChange={(e) => setCompletionFeedback(e.target.value)}
                  placeholder="e.g. கோரிக்கை ஏற்றுக்கொள்ளப்பட்டு அனுமதி வழங்கப்பட்டது..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTokenForComplete(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmComplete}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'நிறைவு செய்' : 'Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Citizen Profile & Dossier Modal triggered by "அனைத்து தரவுகளையும் பார்க்க" */}
      {selectedTokenForDetails && (
        <CitizenProfileModal
          token={selectedTokenForDetails}
          beneficiary={matchedBeneficiary}
          division={matchedDivision}
          lang={lang}
          onClose={() => setSelectedTokenForDetails(null)}
          onPrintCard={matchedBeneficiary ? () => setSelectedBeneficiaryForCard(matchedBeneficiary) : undefined}
          onPrintThermal={() => setActiveReceiptToken(selectedTokenForDetails)}
        />
      )}

      {/* Citizen ID Pass / Barcode Modal */}
      {selectedBeneficiaryForCard && (
        <BeneficiaryIdCardModal
          beneficiary={selectedBeneficiaryForCard}
          division={divisions.find((d) => d.code === selectedBeneficiaryForCard.divisionCode)}
          lang={lang}
          onClose={() => setSelectedBeneficiaryForCard(null)}
        />
      )}

      {/* Thermal Receipt Modal Preview & Auto-Print with Feedback Tear-Off Slip */}
      {activeReceiptToken && (
        <ThermalPrintReceipt
          token={activeReceiptToken}
          waitingCount={waitingTokens.filter((w) => w.id !== activeReceiptToken.id).length}
          serviceLabelTa={getServicePrefix(activeReceiptToken.serviceType).labelTa}
          serviceLabelEn={getServicePrefix(activeReceiptToken.serviceType).labelEn}
          onClose={() => setActiveReceiptToken(null)}
          autoPrint={false}
        />
      )}
    </div>
  );
};
