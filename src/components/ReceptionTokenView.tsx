import React, { useState } from 'react';
import { QueueToken, ServiceType, TokenStatus, Beneficiary, GNDivision } from '../types';
import { Language, translations } from '../translations/i18n';
import { ThermalPrintReceipt } from './ThermalPrintReceipt';
import { VaharaiLogo } from './VaharaiLogo';
import { CitizenProfileModal } from './CitizenProfileModal';
import { BeneficiaryIdCardModal } from './BeneficiaryIdCardModal';

interface ReceptionTokenViewProps {
  tokens: QueueToken[];
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  lang: Language;
  onUpdateTokens: (tokens: QueueToken[]) => void;
  onAuditLog: (action: string, details: string) => void;
  onNavigateToLiveDisplay?: () => void;
}

export const ReceptionTokenView: React.FC<ReceptionTokenViewProps> = ({
  tokens,
  beneficiaries,
  divisions,
  lang,
  onUpdateTokens,
  onAuditLog,
  onNavigateToLiveDisplay,
}) => {
  const t = translations[lang];

  // Token Issuing Form State
  const [selectedService, setSelectedService] = useState<ServiceType>('WELFARE_SCHEME');
  const [officerToMeet, setOfficerToMeet] = useState<string>('அட்மின் 1 (Admin 1)');
  const [citizenNic, setCitizenNic] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('211');

  // Modals State
  const [activeReceiptToken, setActiveReceiptToken] = useState<QueueToken | null>(null);
  const [selectedTokenForDetails, setSelectedTokenForDetails] = useState<QueueToken | null>(null);
  const [selectedBeneficiaryForCard, setSelectedBeneficiaryForCard] = useState<Beneficiary | null>(null);

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
      setSelectedDivision(matched.divisionCode);
    }
  };

  // Issue new token and trigger thermal print
  const handleIssueToken = (e: React.FormEvent) => {
    e.preventDefault();

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
      citizenName: citizenName.trim(),
      citizenNic: citizenNic.trim(),
      divisionCode: selectedDivision,
      status: 'WAITING',
      issuedAt: new Date().toISOString(),
      barcode: tokenNumber,
    };

    const updated = [newToken, ...tokens];
    onUpdateTokens(updated);
    onAuditLog('ISSUE_TOKEN', `Issued Token ${tokenNumber} for ${newToken.officerToMeet} at Counter ${counter} (${newToken.citizenName || 'Citizen'})`);

    // Open Thermal Receipt Modal immediately for printing
    setActiveReceiptToken(newToken);

    // Reset Form
    setCitizenNic('');
    setCitizenName('');
  };

  const handleUpdateStatus = (tokenId: string, nextStatus: TokenStatus) => {
    const updated = tokens.map((tItem) => {
      if (tItem.id === tokenId) {
        if (nextStatus === 'CALLING') {
          playCallingChime();
          return { ...tItem, status: nextStatus, calledAt: new Date().toISOString() };
        }
        if (nextStatus === 'COMPLETED') {
          return { ...tItem, status: nextStatus, completedAt: new Date().toISOString() };
        }
        return { ...tItem, status: nextStatus };
      }
      return tItem;
    });

    onUpdateTokens(updated);
    const token = tokens.find((tItem) => tItem.id === tokenId);
    onAuditLog('UPDATE_TOKEN_STATUS', `Token ${token?.tokenNumber} status changed to ${nextStatus}`);
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
              ? 'வரவேற்பகத்தில் பொதுமக்களுக்கு வரிசை இலக்கம் வழங்கி, யாரை பார்க்க வேண்டும் (அட்மின் 1, அட்மின் 2) என பதிந்து தர்மல் ரசீது அச்சிடல்'
              : 'Issue service tokens, assign designated officer to meet (Admin 1, Admin 2), and print 58mm/80mm thermal receipts'}
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

      {/* Grid: Token Issuer Form & Calling Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Issue New Token Card */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="text-lg">📝</span>
            <h3 className="text-sm font-bold text-slate-900">{t.issueNewToken}</h3>
          </div>

          <form onSubmit={handleIssueToken} className="mt-4 space-y-3.5">
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

            {/* 2. CRITICAL USER REQUIREMENT: யாரை பார்க்க வேண்டும்? (Whom to meet?) */}
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
                <option value="கிராம அலுவலர் (Grama Niladhari)">🌾 கிராம அலுவலர் (Grama Niladhari)</option>
                <option value="பிறப்பு/இறப்பு பதிவாளர் (Civil Registrar)">📜 பிறப்பு / இறப்பு / விவாக பதிவாளர் (Civil Registrar)</option>
                <option value="அஸ்வெசும / சமூர்த்தி உத்தியோகத்தர்">🤝 அஸ்வெசும / சமூர்த்தி நலன்புரி உத்தியோகத்தர்</option>
                <option value="காணி பிரிவு உத்தியோகத்தர்">🗺️ காணி பிரிவு உத்தியோகத்தர் (Land Officer)</option>
                <option value="கணக்காளர் / நிதிப் பிரிவு">💰 கணக்காளர் / நிதிப் பிரிவு (Accountant / Finance)</option>
                <option value="திட்டமிடல் பணிப்பாளர் / அபிவிருத்தி">📈 திட்டமிடல் பணிப்பாளர் / அபிவிருத்திப் பிரிவு</option>
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
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.citizenNicOptional}
              </label>
              <input
                type="text"
                placeholder="e.g. 198421500321 or VHR-211-..."
                value={citizenNic}
                onChange={(e) => handleNicChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* 4. Citizen Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.citizenNameOptional}
              </label>
              <input
                type="text"
                placeholder="பெயர் / Citizen Name"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
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

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
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
                activeCallingTokens.map((tItem) => (
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

                    {/* Button with my logo: "அனைத்து தரவுகளையும் பார்க்க" */}
                    <div className="mt-3 pt-2.5 border-t border-slate-700/80 flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleOpenCitizenDetails(tItem)}
                        className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                        title="View complete citizen data"
                      >
                        <div className="p-0.5 bg-white rounded-full shrink-0">
                          <VaharaiLogo size={16} className="w-4 h-4" />
                        </div>
                        <span>{lang === 'ta' ? 'அனைத்து தரவுகளையும் பார்க்க' : 'View Citizen Details'}</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(tItem.id, 'COMPLETED')}
                        className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        ✓ {t.completeService}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Waiting Queue List with "அனைத்து தரவுகளையும் பார்க்க" (my logo) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {t.waitingQueue} ({waitingTokens.length})
              </span>
              <span className="text-slate-500 text-[11px]">
                {lang === 'ta' ? 'வரிசைப்படி அழைக்கவும்' : 'Call in order of arrival'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {waitingTokens.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  {lang === 'ta' ? 'காத்திருப்பு வரிசையில் எவரும் இல்லை' : 'Queue is empty.'}
                </div>
              ) : (
                waitingTokens.map((tok, idx) => (
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
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Button with my logo to view citizen dossier */}
                      <button
                        onClick={() => handleOpenCitizenDetails(tok)}
                        className="py-1 px-2.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="View citizen details"
                      >
                        <VaharaiLogo size={14} className="w-3.5 h-3.5" />
                        <span>{lang === 'ta' ? 'அனைத்து தரவுகளையும் பார்க்க' : 'View Details'}</span>
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
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <span>🔔</span>
                        <span>{t.callNext}</span>
                      </button>
                    </div>
                  </div>
                ))
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
                <th className="pb-2">யாரை பார்த்தார் (Officer)</th>
                <th className="pb-2">பிரஜை / Citizen</th>
                <th className="pb-2">{t.division}</th>
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
                  <td className="py-2.5 font-medium text-slate-800">
                    {ct.officerToMeet || 'அட்மின் 1 (Admin 1)'}
                  </td>
                  <td className="py-2.5 text-slate-800">{ct.citizenName || ct.citizenNic || 'Citizen'}</td>
                  <td className="py-2.5 font-mono">{ct.divisionCode}</td>
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

      {/* Citizen Profile & Dossier Modal triggered by "அனைத்து தரவுகளையும் பார்க்க (my logo)" */}
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

      {/* Thermal Receipt Modal Preview & Auto-Print */}
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
