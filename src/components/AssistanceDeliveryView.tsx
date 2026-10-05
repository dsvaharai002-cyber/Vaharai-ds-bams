import React, { useState } from 'react';
import { Family, AssistanceProgram, AssistanceRecord, User } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import { CsvAssistanceBulkModal } from './CsvAssistanceBulkModal';
import {
  Gift,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Building,
  Download,
  Upload,
  BookOpen
} from 'lucide-react';

interface AssistanceDeliveryViewProps {
  currentUser: User;
  preselectedFamily?: Family | null;
  onViewFamily: (family: Family) => void;
  currentLang: Language;
}

export const AssistanceDeliveryView: React.FC<AssistanceDeliveryViewProps> = ({
  currentUser,
  preselectedFamily,
  onViewFamily,
  currentLang
}) => {
  const t = TRANSLATIONS[currentLang];
  const isTa = currentLang === 'ta';
  const isGnOfficer = currentUser.Role === 'GN Officer' || currentUser.Role === 'GN_Officer';
  const families = StorageService.getFilteredFamilies(currentUser);
  const programs = StorageService.getPrograms().filter(p => p.Status === 'Active');

  // 8 Official Public Services & Assistance Schemes (Requirement: மக்களுக்கான உதவி ரொப்டவுனில் சுருக்கமாக சேர்)
  const publicServicesCatalog = [
    {
      id: 'srv_certificates_nic',
      name: isTa ? '1. பிறப்பு, இறப்பு, திருமணச் சான்றிதழ் & NIC விண்ணப்பங்கள்' : '1. Birth, Death, Marriage Certificates & NIC Applications',
      type: 'Goods/In-kind',
      desc: isTa ? 'பிறப்பு, இறப்பு, திருமணச் சான்றிதழ் பிரதிகள் மற்றும் தேசிய அடையாள அட்டை (NIC) விண்ணப்ப சேவை' : 'Issuance of Birth, Death, Marriage certificate copies and NIC applications'
    },
    {
      id: 'srv_gn_certificates',
      name: isTa ? '2. வதிவிடச் சான்றிதழ் & வருமானச் சான்றிதழ் (கிராம அலுவலர்)' : '2. Residence & Income Certificates (Grama Niladhari)',
      type: 'Goods/In-kind',
      desc: isTa ? 'கிராம அலுவலர் மூலமான வதிவிடச் சான்றிதழ் மற்றும் வருமானச் சான்றிதழ் வழங்கல்' : 'Issuance of Residence & Income certificates via Grama Niladhari'
    },
    {
      id: 'srv_land_permits',
      name: isTa ? '3. அரச காணிப் பகிர்வு, காணி அனுமதிப்பத்திரம் & உரிமங்கள் (Deeds)' : '3. State Land Alienation, Land Permits & Deeds',
      type: 'Asset/Equipment',
      desc: isTa ? 'அரச காணிகளைப் பகிர்ந்தளித்தல், காணி அனுமதிப்பத்திரங்கள் மற்றும் காணி உரிமங்கள் (Land Deeds) வழங்கல்' : 'State land alienation, land permits and land deeds'
    },
    {
      id: 'srv_aswesuma_welfare',
      name: isTa ? '4. அஸ்வெசும, முதியோர்/மாற்றுத்திறனாளி கொடுப்பனவு & நிவாரணம்' : '4. Aswesuma, Elderly, Disability Allowances & Relief',
      type: 'Cash',
      desc: isTa ? 'அஸ்வெசும, முதியோர் கொடுப்பனவு, மாற்றுத்திறனாளிக் கொடுப்பனவு மற்றும் அவசரகால நிவாரணம்' : 'Aswesuma welfare, elderly allowance, disability allowance and emergency relief'
    },
    {
      id: 'srv_business_trade',
      name: isTa ? '5. வணிகப் பெயர் பதிவு & வர்த்தக உரிமங்கள் (Trade Licenses)' : '5. Business Name Registration & Trade Licenses',
      type: 'Goods/In-kind',
      desc: isTa ? 'வணிகப் பெயர்களைப் பதிவு செய்தல் மற்றும் வர்த்தக உரிமங்களை வழங்குதல்' : 'Business names registration and trade licenses'
    },
    {
      id: 'srv_vehicle_revenue',
      name: isTa ? '6. மோட்டார் வாகன வருமான வரி அனுமதிப்பத்திரம் (Revenue License)' : '6. Motor Vehicle Revenue License',
      type: 'Goods/In-kind',
      desc: isTa ? 'மோட்டார் வாகனங்களுக்கான வருமான வரி அனுமதிப்பத்திரம் (Vehicle Revenue License) வழங்கல்' : 'Vehicle Revenue License issuance'
    },
    {
      id: 'srv_pension_services',
      name: isTa ? '7. ஓய்வுபெற்ற அரச ஊழியர் ஓய்வூதியக் கொடுப்பனவு ஆவணங்கள்' : '7. Pensions Administration for Retired Civil Servants',
      type: 'Cash',
      desc: isTa ? 'ஓய்வுபெற்ற அரச ஊழியர்களுக்கான ஓய்வூதியக் கொடுப்பனவு ஆவணங்களை நிர்வகித்தல்' : 'Pension payment documentation for retired civil servants'
    },
    {
      id: 'srv_building_permits',
      name: isTa ? '8. கட்டட திட்ட அனுமதி & ஒப்புதல் (குடியிருப்பு/வணிகம்)' : '8. Building Planning Permits & Approvals (Residential/Commercial)',
      type: 'Goods/In-kind',
      desc: isTa ? 'குடியிருப்பு மற்றும் வணிகக் கட்டடங்களுக்கான திட்ட அனுமதி மற்றும் ஒப்புதல் வழங்கல்' : 'Planning permits and approvals for residential & commercial buildings'
    }
  ];

  const [assistanceList, setAssistanceList] = useState<AssistanceRecord[]>(() =>
    StorageService.getFilteredAssistance(currentUser)
  );
  const [selectedQR, setSelectedQR] = useState<string>(preselectedFamily ? preselectedFamily.QR_Number : '');
  const [searchQR, setSearchQR] = useState<string>('');
  const [filterProgram, setFilterProgram] = useState<string>('ALL');

  const [showBulkCsvModal, setShowBulkCsvModal] = useState<boolean>(false);
  const [bulkModalTab, setBulkModalTab] = useState<'upload' | 'guidelines'>('upload');

  const selectedFamily = families.find(f => f.QR_Number.toUpperCase() === selectedQR.toUpperCase()) || null;
  const familyAssistanceCount = selectedFamily
    ? assistanceList.filter(a => a.QR_Number.toUpperCase() === selectedFamily.QR_Number.toUpperCase()).length
    : 0;

  const [formData, setFormData] = useState({
    Program_ID: programs[0]?.Program_ID || '',
    Assistance_Type: 'Goods/In-kind' as AssistanceRecord['Assistance_Type'],
    Description: '',
    Amount: '15000',
    Quantity: '1',
    Unit: 'Package',
    Assistance_Date: new Date().toISOString().substring(0, 10),
    Remarks: ''
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refreshAssistance = () => {
    setAssistanceList(StorageService.getFilteredAssistance(currentUser));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!selectedFamily) {
      setFeedback({
        type: 'error',
        message: isTa ? 'செல்லுபடியான பயனாளிக் குடும்பத்தை தெரிவுசெய்யவும்.' : 'Please select a valid registered beneficiary family.'
      });
      return;
    }
    try {
      StorageService.addAssistance(currentUser, {
        QR_Number: selectedFamily.QR_Number,
        Program_ID: formData.Program_ID,
        Assistance_Type: formData.Assistance_Type,
        Description: formData.Description,
        Amount: Number(formData.Amount) || 0,
        Quantity: Number(formData.Quantity) || 1,
        Unit: formData.Unit,
        Assistance_Date: formData.Assistance_Date,
        Remarks: formData.Remarks
      });
      refreshAssistance();
      setFeedback({
        type: 'success',
        message: isTa
          ? `உதவி வழங்கல் பதிவு செய்யப்பட்டது: LKR ${Number(formData.Amount).toLocaleString()} (${selectedFamily.Family_Name} - ${selectedFamily.QR_Number}).`
          : `Successfully logged assistance of LKR ${Number(formData.Amount).toLocaleString()} for ${selectedFamily.Family_Name} (${selectedFamily.QR_Number}).`
      });
      setFormData(prev => ({
        ...prev,
        Description: '',
        Remarks: ''
      }));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Failed to record assistance.' });
      }
    }
  };

  const handleQuickDownloadTemplate = () => {
    const csv = StorageService.generateAssistanceTemplate(currentUser, formData.Program_ID || programs[0]?.Program_ID || 'PRG001', false);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Assistance_Sample_Template_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = assistanceList.filter(a => {
    if (filterProgram !== 'ALL' && a.Program_ID !== filterProgram) return false;
    if (searchQR.trim()) {
      const q = searchQR.toLowerCase();
      return (
        a.QR_Number.toLowerCase().includes(q) ||
        a.Program_Name.toLowerCase().includes(q) ||
        a.Description.toLowerCase().includes(q) ||
        a.Provided_By.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Top Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Gift className="w-6 h-6 text-emerald-600" />
            {t.assistance}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isTa
              ? 'பயனாளிகளுக்கு உதவிகள், உபகரணங்கள் மற்றும் மானியங்களை தனித்தனியாகவோ அல்லது மொத்த CSV மூலமாகவோ வழங்குதல்.'
              : 'Record aid packages, agricultural equipment, livelihoods, and cash grants individually or via bulk CSV upload.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setBulkModalTab('guidelines');
              setShowBulkCsvModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>{isTa ? 'வழிகாட்டல் & மாதிரி' : 'Guidelines & Sample'}</span>
          </button>
          <button
            onClick={handleQuickDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isTa ? 'மாதிரி CSV பதிவிறக்குக' : t.downloadTemplate}</span>
          </button>
          <button
            onClick={() => {
              setBulkModalTab('upload');
              setShowBulkCsvModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t.uploadCsv}</span>
          </button>
        </div>
      </div>

      {/* Division Scoping Indicator (Requirement #3) */}
      {isGnOfficer && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>{t.divisionScopedNotice}</strong> {currentUser.Division} ({families.length} {t.totalFamilies.toLowerCase()})
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
            {currentUser.Role}
          </span>
        </div>
      )}

      {/* Main Grid: Single Disbursal Form on left, History on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">{t.recordAssistance}</h3>
            </div>
          </div>

          {feedback && (
            <div className={`p-3 rounded-lg text-xs flex gap-2 items-start ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.qrNumber} <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VHR-PCK-001"
                value={selectedQR}
                onChange={e => setSelectedQR(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {selectedFamily ? (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{selectedFamily.Family_Name}</span>
                    <button
                      type="button"
                      onClick={() => onViewFamily(selectedFamily)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {t.viewDossier}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{selectedFamily.Division_Name} • {selectedFamily.Family_Size} members</span>
                    <span className="font-mono">Priority: {selectedFamily.Priority_Level}</span>
                  </div>
                  {familyAssistanceCount >= 3 && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-center gap-1.5 font-medium mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>{t.repeatedAlertTitle} ({familyAssistanceCount} times previously assisted)</span>
                    </div>
                  )}
                </div>
              ) : selectedQR.trim() ? (
                <p className="text-[11px] text-rose-600 mt-1">No registered family found for QR {selectedQR}.</p>
              ) : null}
            </div>

            {/* Public Assistance / Scheme Selection Dropdown (Requirement: மக்களுக்கான உதவி ரொப்டவுனில் சுருக்கமாக சேர்) */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-1.5">
              <label className="block font-bold text-emerald-950 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{isTa ? 'மக்களுக்கான உதவி / பொதுச் சேவைத் திட்டம் (ரொப்டவுன்):' : 'Public Assistance / Service Scheme (Dropdown):'}</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                  {isTa ? 'தானாக விபரம் நிரப்பப்படும்' : 'Auto-fills description'}
                </span>
              </label>
              <select
                onChange={e => {
                  const srv = publicServicesCatalog.find(s => s.id === e.target.value);
                  if (srv) {
                    setFormData(prev => ({
                      ...prev,
                      Description: srv.desc,
                      Assistance_Type: srv.type as AssistanceRecord['Assistance_Type']
                    }));
                  }
                }}
                defaultValue=""
                className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="" disabled>
                  {isTa ? '-- மக்களுக்கான 08 பொதுச் சேவைகளில் ஒன்றைத் தெரிவுசெய்க --' : '-- Select from 8 Official Assistance Schemes --'}
                </option>
                {publicServicesCatalog.map(srv => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.program} <span className="text-rose-600">*</span>
              </label>
              <select
                value={formData.Program_ID}
                onChange={e => setFormData({ ...formData, Program_ID: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none cursor-pointer"
              >
                {programs.map(p => (
                  <option key={p.Program_ID} value={p.Program_ID}>
                    {p.Program_ID} • {p.Program_Name} ({p.Program_Type})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.type} <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.Assistance_Type}
                  onChange={e => setFormData({ ...formData, Assistance_Type: e.target.value as AssistanceRecord['Assistance_Type'] })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none cursor-pointer"
                >
                  <option value="Goods/In-kind">Goods / In-kind</option>
                  <option value="Cash">Cash Grant</option>
                  <option value="Voucher">Food Voucher</option>
                  <option value="Food Rations">Food Rations</option>
                  <option value="Asset/Equipment">Asset / Equipment</option>
                  <option value="Educational Support">Educational Support</option>
                  <option value="Housing Repair">Housing Repair</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.amount}
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={formData.Amount}
                  onChange={e => setFormData({ ...formData, Amount: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={formData.Quantity}
                  onChange={e => setFormData({ ...formData, Quantity: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                <input
                  type="text"
                  placeholder="e.g. Pack, Kit"
                  value={formData.Unit}
                  onChange={e => setFormData({ ...formData, Unit: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.date} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.Assistance_Date}
                  onChange={e => setFormData({ ...formData, Assistance_Date: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Items Description</label>
              <input
                type="text"
                placeholder="e.g. Dry food rations, school supplies pack, seeds"
                value={formData.Description}
                onChange={e => setFormData({ ...formData, Description: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.remarks}</label>
              <textarea
                rows={2}
                placeholder="Officer verification notes..."
                value={formData.Remarks}
                onChange={e => setFormData({ ...formData, Remarks: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isTa ? 'உதவி வழங்கலை பதிவுசெய்க' : 'Record Assistance Disbursement'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Deliveries List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isTa ? 'வழங்கப்பட்ட உதவிகள் வரலாறு' : 'Disbursement History & Logs'}
              </h3>
              <p className="text-xs text-slate-500">
                {filteredRecords.length} {isTa ? 'பதிவுகள்' : 'records logged'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterProgram}
                onChange={e => setFilterProgram(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none cursor-pointer"
              >
                <option value="ALL">{isTa ? 'அனைத்து திட்டங்களும்' : 'All Programs'}</option>
                {programs.map(p => (
                  <option key={p.Program_ID} value={p.Program_ID}>
                    {p.Program_Name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isTa ? 'QR எண் அல்லது உத்தியோகத்தர் பெயர்...' : 'Filter by QR number, program, officer...'}
              value={searchQR}
              onChange={e => setSearchQR(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none"
            />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-mono">Date</th>
                  <th className="px-3 py-2.5 font-mono">{t.qrNumber}</th>
                  <th className="px-3 py-2.5">{t.program}</th>
                  <th className="px-3 py-2.5 text-right font-mono">{t.amount}</th>
                  <th className="px-3 py-2.5">Qty</th>
                  <th className="px-3 py-2.5 font-mono">Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No assistance records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(record => (
                    <tr key={record.Assistance_ID} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">{record.Assistance_Date}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {record.QR_Number}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-slate-900 block truncate max-w-[200px]">
                          {record.Program_Name}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">{record.Description}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                        {record.Amount ? record.Amount.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {record.Quantity} {record.Unit}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">
                        {record.Provided_By}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showBulkCsvModal && (
        <CsvAssistanceBulkModal
          currentUser={currentUser}
          initialTab={bulkModalTab}
          onClose={() => setShowBulkCsvModal(false)}
          onDisbursalComplete={refreshAssistance}
          currentLang={currentLang}
        />
      )}
    </div>
  );
};
