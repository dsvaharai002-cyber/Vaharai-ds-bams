import React, { useState } from 'react';
import { Beneficiary, User, GNDivision, AssistanceRecord } from '../types';
import { Language, translations } from '../translations/i18n';
import {
  downloadCsvFile,
  generateBeneficiarySampleCsv,
  generateUsersSampleCsv,
  generateDivisionsSampleCsv,
  generateAssistanceSampleCsv,
  generateFamiliesSampleCsv,
  parseBeneficiariesFromCsv,
  parseUsersFromCsv,
  parseAssistanceFromCsv,
  parseFamiliesFromCsv,
  exportBeneficiariesToCsv,
  exportUsersToCsv,
  exportDivisionsToCsv,
  exportAssistanceToCsv,
  exportFamiliesToCsv,
} from '../services/csv';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Users,
  Gift,
  Building,
  UserCheck,
} from 'lucide-react';

interface CsvManagementViewProps {
  beneficiaries: Beneficiary[];
  users: User[];
  divisions: GNDivision[];
  assistanceRecords?: AssistanceRecord[];
  currentUser: User;
  lang: Language;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onUpdateUsers: (items: User[]) => void;
  onUpdateAssistanceRecords?: (items: AssistanceRecord[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const CsvManagementView: React.FC<CsvManagementViewProps> = ({
  beneficiaries,
  users,
  divisions,
  assistanceRecords = [],
  currentUser,
  lang,
  onUpdateBeneficiaries,
  onUpdateUsers,
  onUpdateAssistanceRecords,
  onAuditLog,
}) => {
  const t = translations[lang];

  type ActiveCsvType = 'assistance' | 'families' | 'beneficiaries' | 'users' | 'divisions';
  const [activeType, setActiveType] = useState<ActiveCsvType>('assistance');

  // Import State
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [parsedDuplicates, setParsedDuplicates] = useState<AssistanceRecord[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [successBanner, setSuccessBanner] = useState<string>('');

  const handleDownloadSample = () => {
    if (activeType === 'assistance') {
      const csv = generateAssistanceSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_assistance_distribution_sample.csv');
    } else if (activeType === 'families') {
      const csv = generateFamiliesSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_families_registration_sample.csv');
    } else if (activeType === 'beneficiaries') {
      const csv = generateBeneficiarySampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_beneficiaries_sample.csv');
    } else if (activeType === 'users') {
      const csv = generateUsersSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_users_sample.csv');
    } else {
      const csv = generateDivisionsSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_divisions_sample.csv');
    }
  };

  const handleExportCurrent = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (activeType === 'assistance') {
      const csv = exportAssistanceToCsv(assistanceRecords);
      downloadCsvFile(csv, `vaharai_assistance_distribution_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported ${assistanceRecords.length} assistance distribution records to CSV`);
    } else if (activeType === 'families') {
      const csv = exportFamiliesToCsv(beneficiaries);
      downloadCsvFile(csv, `vaharai_families_master_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported family master records to CSV`);
    } else if (activeType === 'beneficiaries') {
      const csv = exportBeneficiariesToCsv(beneficiaries);
      downloadCsvFile(csv, `vaharai_beneficiaries_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported ${beneficiaries.length} citizen records to CSV`);
    } else if (activeType === 'users') {
      const csv = exportUsersToCsv(users);
      downloadCsvFile(csv, `vaharai_users_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported ${users.length} staff records to CSV`);
    } else {
      const csv = exportDivisionsToCsv(divisions);
      downloadCsvFile(csv, `vaharai_divisions_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported ${divisions.length} GN divisions to CSV`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);

      if (activeType === 'assistance') {
        const { validRecords, duplicateRecords, errors } = parseAssistanceFromCsv(
          text,
          assistanceRecords,
          beneficiaries
        );
        setParsedPreview(validRecords);
        setParsedDuplicates(duplicateRecords);
        setParseErrors(errors);
      } else if (activeType === 'families') {
        const { items, errors } = parseFamiliesFromCsv(text, beneficiaries);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else if (activeType === 'beneficiaries') {
        const { items, errors } = parseBeneficiariesFromCsv(text);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else if (activeType === 'users') {
        const { items, errors } = parseUsersFromCsv(text);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else {
        setParsedPreview([]);
        setParsedDuplicates([]);
        setParseErrors([]);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 1. Commit Import (with duplicate prevention for assistance)
  const handleCommitImport = (includeDuplicates: boolean = false) => {
    if (parsedPreview.length === 0 && (!includeDuplicates || parsedDuplicates.length === 0)) return;

    if (activeType === 'assistance') {
      const itemsToSave = includeDuplicates
        ? [...parsedPreview, ...parsedDuplicates]
        : (parsedPreview as AssistanceRecord[]);

      if (onUpdateAssistanceRecords) {
        onUpdateAssistanceRecords([...itemsToSave, ...assistanceRecords]);
      }
      onAuditLog(
        'IMPORT_ASSISTANCE_CSV',
        `Imported ${itemsToSave.length} relief records (duplicates filtered: ${includeDuplicates ? 'No (Forced)' : 'Yes'})`
      );
      setSuccessBanner(
        lang === 'ta'
          ? `✅ ${itemsToSave.length} உதவிப் பதிவுகள் வெற்றிகரமாக சேர்க்கப்பட்டன! (${parsedDuplicates.length} இரட்டை உதவிகள் ${includeDuplicates ? 'விதிவிலக்காக அனுமதிக்கப்பட்டன' : 'தடுக்கப்பட்டன'})`
          : `✅ ${itemsToSave.length} assistance records saved! (${parsedDuplicates.length} duplicates ${includeDuplicates ? 'force imported' : 'prevented'}).`
      );
    } else if (activeType === 'families' || activeType === 'beneficiaries') {
      const newItems = parsedPreview as Beneficiary[];
      const existingMap = new Map(beneficiaries.map((b) => [b.nic, b]));
      for (const item of newItems) {
        existingMap.set(item.nic, item);
      }
      const merged = Array.from(existingMap.values());
      onUpdateBeneficiaries(merged);
      onAuditLog('IMPORT_CSV', `Imported ${newItems.length} records via CSV`);
      setSuccessBanner(
        `${newItems.length} ${
          activeType === 'families'
            ? lang === 'ta'
              ? 'குடும்பங்கள் தனித்துவமான QR குறியீட்டுடன் சேர்க்கப்பட்டன!'
              : 'families registered with unique QR codes!'
            : lang === 'ta'
            ? 'பயனாளிகள் சேர்க்கப்பட்டனர்!'
            : 'beneficiaries imported successfully!'
        }`
      );
    } else if (activeType === 'users') {
      const newUsers = parsedPreview as User[];
      const existingMap = new Map(users.map((u) => [u.id, u]));
      for (const item of newUsers) {
        existingMap.set(item.id, item);
      }
      const merged = Array.from(existingMap.values());
      onUpdateUsers(merged);
      onAuditLog('IMPORT_CSV', `Imported ${newUsers.length} staff users via CSV`);
      setSuccessBanner(`${newUsers.length} ${lang === 'ta' ? 'அலுவலர் கணக்குகள் சேர்க்கப்பட்டன!' : 'users imported successfully!'}`);
    }

    setParsedPreview([]);
    setParsedDuplicates([]);
    setFileContent('');
    setFileName('');
    setTimeout(() => setSuccessBanner(''), 5000);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-xl shadow-xs">📊</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {lang === 'ta' ? 'சிஎஸ்வி (CSV) மாதிரிகள் & தரவு மேலாண்மை' : 'CSV Templates & Data Import/Export'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ta'
              ? 'உதவி வழங்கல், புதிய குடும்பப் பதிவுகள், மற்றும் பிரஜை விபரங்களை மாதிரி CSV மூலம் பதிவேற்றி, இரட்டை உதவிகளைத் தடுத்தல்.'
              : 'Bulk import and export assistance distributions with duplicate aid prevention, family registrations, and citizen records.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadSample}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-rose-200 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-rose-700" />
            <span>{lang === 'ta' ? 'மாதிரி CSV ஐ பதிவிறக்கு' : 'Download Sample CSV'}</span>
          </button>
          <button
            onClick={handleExportCurrent}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'ta' ? 'தற்போதைய தரவை ஏற்றுமதி செய்' : 'Export Current Data'}</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Dataset Selection Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl flex-wrap">
        <button
          onClick={() => {
            setActiveType('assistance');
            setParsedPreview([]);
            setParsedDuplicates([]);
            setParseErrors([]);
          }}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeType === 'assistance'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>{lang === 'ta' ? 'உதவி வழங்கல் & இரட்டை உதவி தடுப்பு CSV' : 'Aid Distribution & Anti-Duplication'}</span>
        </button>

        <button
          onClick={() => {
            setActiveType('families');
            setParsedPreview([]);
            setParsedDuplicates([]);
            setParseErrors([]);
          }}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeType === 'families'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{lang === 'ta' ? 'புதிய குடும்பப் பதிவு CSV (தனித்துவ QR)' : 'Family Registration CSV (Unique QR)'}</span>
        </button>

        <button
          onClick={() => {
            setActiveType('beneficiaries');
            setParsedPreview([]);
            setParsedDuplicates([]);
            setParseErrors([]);
          }}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeType === 'beneficiaries'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>{lang === 'ta' ? 'பிரஜைகள் (Citizens)' : 'Citizens'}</span>
        </button>

        <button
          onClick={() => {
            setActiveType('users');
            setParsedPreview([]);
            setParsedDuplicates([]);
            setParseErrors([]);
          }}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeType === 'users'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <span>👥</span>
          <span>{lang === 'ta' ? 'அலுவலர்கள் (Staff)' : 'Staff Users'}</span>
        </button>

        <button
          onClick={() => {
            setActiveType('divisions');
            setParsedPreview([]);
            setParsedDuplicates([]);
            setParseErrors([]);
          }}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeType === 'divisions'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>{lang === 'ta' ? 'பிரிவுகள் (Divisions)' : 'GN Divisions'}</span>
        </button>
      </div>

      {/* Model & Upload Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {activeType === 'assistance'
                ? lang === 'ta'
                  ? 'உதவி வழங்கல் சிஎஸ்வி மாதிரி & பதிவேற்றம் (இரட்டை உதவி தடுப்புடன்)'
                  : 'Assistance Distribution CSV Model & Upload with Anti-Duplication'
                : activeType === 'families'
                ? lang === 'ta'
                  ? 'குடும்பப் பதிவு சிஎஸ்வி மாதிரி & பதிவேற்றம் (தனித்துவமான QR குறியீட்டுடன்)'
                  : 'Family Registration CSV Model & Upload with Unique QR Codes'
                : lang === 'ta'
                ? 'சிஎஸ்வி கோப்பைப் பதிவேற்றுக'
                : 'Upload CSV File'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeType === 'assistance'
                ? lang === 'ta'
                  ? 'ஒரே குடும்பத்திற்கே தொடர்ச்சியான உதவிகள் கிடைப்பதை தடுக்க, இந்த மாதிரி மூலம் பதிவேற்றும் போது முறைமை இரட்டை உதவிகளை தானாக சுட்டிக்காட்டும்.'
                  : 'When uploading assistance records, the engine checks if the family received aid recently to prevent continuous aid abuse.'
                : activeType === 'families'
                ? lang === 'ta'
                  ? 'ஒவ்வொரு குடும்பத்திற்கும் தனித்துவமான Family Master QR உருவாக்கப்பட்டு அனைத்து உறுப்பினர்களும் இணைக்கப்படுவர்.'
                  : 'Every family receives a unique Master QR code linking all household members.'
                : lang === 'ta'
                ? 'தரவுகளை மாதிரியின்படி நிரப்பி பதிவேற்றவும்.'
                : 'Populate data according to the CSV template and upload.'}
            </p>
          </div>

          <button
            onClick={handleDownloadSample}
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'ta' ? 'மாதிரி கோப்பை பதிவிறக்கு' : 'Download Template'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
          />
          {fileName && (
            <span className="text-xs text-slate-500 font-mono">
              {fileName}
            </span>
          )}
        </div>

        {parseErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl space-y-1">
            <div className="font-bold">⚠️ {lang === 'ta' ? 'பிழைகள்:' : 'Errors:'}</div>
            {parseErrors.map((err, idx) => (
              <div key={idx} className="text-[11px]">• {err}</div>
            ))}
          </div>
        )}
      </div>

      {/* PREVIEW: ASSISTANCE DISTRIBUTION (WITH DUPLICATE PREVENTION HIGHLIGHTS) */}
      {activeType === 'assistance' && (parsedPreview.length > 0 || parsedDuplicates.length > 0) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="font-bold text-slate-900">
                {lang === 'ta' ? 'பகுப்பாய்வு முடிவுகள்:' : 'Analysis:'}
              </span>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full font-bold">
                🟢 {parsedPreview.length} {lang === 'ta' ? 'தகுதியான புதிய உதவிகள்' : 'Eligible First-Time Aid'}
              </span>
              {parsedDuplicates.length > 0 && (
                <span className="px-2.5 py-1 bg-red-100 text-red-900 rounded-full font-bold">
                  ⚠️ {parsedDuplicates.length} {lang === 'ta' ? 'இரட்டை உதவி எச்சரிக்கை!' : 'Duplicate Aid Detected!'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleCommitImport(false)}
                disabled={parsedPreview.length === 0}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {lang === 'ta'
                    ? '✅ இரட்டை உதவிகளைத் தடுத்து தகுதியானவர்களை மட்டும் பதிவேற்று'
                    : 'Filter Duplicates & Import Eligible Only'}
                </span>
              </button>

              {parsedDuplicates.length > 0 && (
                <button
                  onClick={() => handleCommitImport(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  {lang === 'ta' ? 'விதிவிலக்காக அனைத்தையும் பதிவேற்று' : 'Force Import All (Override)'}
                </button>
              )}
            </div>
          </div>

          {/* Duplicates Table */}
          {parsedDuplicates.length > 0 && (
            <div className="bg-red-50/80 border border-red-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-950">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>
                  {lang === 'ta'
                    ? `⚠️ பின்வரும் ${parsedDuplicates.length} குடும்பங்களுக்கு ஏற்கனவே சமீபத்தில் உதவி வழங்கப்பட்டுள்ளது (தொடர் உதவி தடுப்பு எச்சரிக்கை):`
                    : `⚠️ The following ${parsedDuplicates.length} families have received aid recently (Continuous Aid Duplication Alert):`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden border border-red-200">
                  <thead className="bg-red-100 text-red-950 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">குடும்ப இலக்கம்</th>
                      <th className="p-2.5">பெயர் & NIC</th>
                      <th className="p-2.5">கோரப்பட்ட உதவி</th>
                      <th className="p-2.5">காரணம் / கடந்த கால உதவி விபரம்</th>
                      <th className="p-2.5">நிலை</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {parsedDuplicates.map((rec) => (
                      <tr key={rec.id} className="hover:bg-red-50/50">
                        <td className="p-2.5 font-mono font-bold text-red-950">{rec.familyCode}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{rec.beneficiaryName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{rec.beneficiaryNic}</div>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">{rec.aidDescription} ({rec.amountOrValue})</td>
                        <td className="p-2.5 text-[11px] text-red-800 font-medium">
                          {rec.duplicateWarningReason || 'இக்குடும்பம் ஏற்கனவே உதவி பெற்றுள்ளது.'}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 bg-red-200 text-red-900 font-bold text-[10px] rounded-full">
                            BLOCKED / DUPLICATE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Eligible Table */}
          {parsedPreview.length > 0 && (
            <div className="bg-white border border-emerald-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {lang === 'ta'
                    ? `🟢 தகுதியான புதிய உதவிகள் (${parsedPreview.length} குடும்பங்கள்):`
                    : `🟢 Eligible First-Time Recipients (${parsedPreview.length} families):`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden border border-slate-200">
                  <thead className="bg-emerald-50 text-emerald-950 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">குடும்ப இலக்கம்</th>
                      <th className="p-2.5">பயனாளி பெயர்</th>
                      <th className="p-2.5">உதவி வகை & விபரம்</th>
                      <th className="p-2.5">பெறுமதி / அளவு</th>
                      <th className="p-2.5">திகதி</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreview.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-emerald-900">{rec.familyCode}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{rec.beneficiaryName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{rec.beneficiaryNic}</div>
                        </td>
                        <td className="p-2.5 font-medium text-slate-800">{rec.aidDescription}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800">{rec.amountOrValue}</td>
                        <td className="p-2.5 font-mono text-slate-600">{rec.distributedDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW: OTHER DATASETS (FAMILIES, CITIZENS, USERS) */}
      {activeType !== 'assistance' && parsedPreview.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              {lang === 'ta' ? `சரிபார்க்கப்பட்ட பதிவுகள் (${parsedPreview.length})` : `Parsed Records Preview (${parsedPreview.length})`}
            </h4>
            <button
              onClick={() => handleCommitImport(false)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              {lang === 'ta' ? '✅ தரவுத்தளத்தில் இணைக்க (Commit)' : 'Commit Import'}
            </button>
          </div>

          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">அடையாளம் / குறியீடு</th>
                  <th className="p-2.5">பெயர்</th>
                  <th className="p-2.5">விபரம்</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedPreview.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-800">{row.familyCode || row.nic || row.id}</td>
                    <td className="p-2.5 font-medium text-slate-900">{row.nameTa || row.nameEn || row.name}</td>
                    <td className="p-2.5 text-slate-500">{row.notes || row.address || row.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
