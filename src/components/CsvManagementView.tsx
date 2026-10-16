import React, { useState } from 'react';
import { Beneficiary, User, GNDivision } from '../types';
import { Language, translations } from '../translations/i18n';
import {
  downloadCsvFile,
  generateBeneficiarySampleCsv,
  generateUsersSampleCsv,
  generateDivisionsSampleCsv,
  parseBeneficiariesFromCsv,
  parseUsersFromCsv,
  exportBeneficiariesToCsv,
  exportUsersToCsv,
  exportDivisionsToCsv,
} from '../services/csv';

interface CsvManagementViewProps {
  beneficiaries: Beneficiary[];
  users: User[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onUpdateUsers: (items: User[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const CsvManagementView: React.FC<CsvManagementViewProps> = ({
  beneficiaries,
  users,
  divisions,
  currentUser,
  lang,
  onUpdateBeneficiaries,
  onUpdateUsers,
  onAuditLog,
}) => {
  const t = translations[lang];

  type ActiveCsvType = 'beneficiaries' | 'users' | 'divisions';
  const [activeType, setActiveType] = useState<ActiveCsvType>('beneficiaries');

  // Import State
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [successBanner, setSuccessBanner] = useState<string>('');

  const handleDownloadSample = () => {
    if (activeType === 'beneficiaries') {
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
    if (activeType === 'beneficiaries') {
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

      if (activeType === 'beneficiaries') {
        const { items, errors } = parseBeneficiariesFromCsv(text);
        setParsedPreview(items);
        setParseErrors(errors);
      } else if (activeType === 'users') {
        const { items, errors } = parseUsersFromCsv(text);
        setParsedPreview(items);
        setParseErrors(errors);
      } else {
        setParsedPreview([]);
        setParseErrors([]);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleCommitImport = () => {
    if (parsedPreview.length === 0) return;

    if (activeType === 'beneficiaries') {
      // Merge by ID or NIC to prevent duplicates
      const newItems = parsedPreview as Beneficiary[];
      const existingMap = new Map(beneficiaries.map((b) => [b.nic, b]));
      for (const item of newItems) {
        existingMap.set(item.nic, item);
      }
      const merged = Array.from(existingMap.values());
      onUpdateBeneficiaries(merged);
      onAuditLog('IMPORT_CSV', `Imported ${newItems.length} beneficiaries via CSV`);
      setSuccessBanner(`${newItems.length} ${lang === 'ta' ? 'பயனாளிகள் வெற்றிகரமாக சேர்க்கப்பட்டனர்!' : 'beneficiaries imported successfully!'}`);
    } else if (activeType === 'users') {
      const newUsers = parsedPreview as User[];
      const existingMap = new Map(users.map((u) => [u.id, u]));
      for (const item of newUsers) {
        existingMap.set(item.id, item);
      }
      const merged = Array.from(existingMap.values());
      onUpdateUsers(merged);
      onAuditLog('IMPORT_CSV', `Imported ${newUsers.length} staff users via CSV`);
      setSuccessBanner(`${newUsers.length} ${lang === 'ta' ? 'அலுவலர் கணக்குகள் வெற்றிகரமாக சேர்க்கப்பட்டன!' : 'users imported successfully!'}`);
    }

    setParsedPreview([]);
    setFileContent('');
    setFileName('');
    setTimeout(() => setSuccessBanner(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t.csvTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t.csvSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSample}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-200"
          >
            <span>📥</span>
            <span>{t.downloadTemplates}</span>
          </button>
          <button
            onClick={handleExportCurrent}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <span>📤</span>
            <span>{t.exportCurrentData}</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{successBanner}</span>
        </div>
      )}

      {/* Dataset Selection Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl max-w-md">
        <button
          onClick={() => {
            setActiveType('beneficiaries');
            setParsedPreview([]);
            setParseErrors([]);
          }}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors ${
            activeType === 'beneficiaries'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.beneficiaryTemplate}
        </button>
        <button
          onClick={() => {
            setActiveType('users');
            setParsedPreview([]);
            setParseErrors([]);
          }}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors ${
            activeType === 'users'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.usersTemplate}
        </button>
        <button
          onClick={() => {
            setActiveType('divisions');
            setParsedPreview([]);
            setParseErrors([]);
          }}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors ${
            activeType === 'divisions'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.divisionsTemplate}
        </button>
      </div>

      {/* Upload Box */}
      <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-600 transition-colors">
        <div className="text-3xl mb-2">📁</div>
        <h4 className="text-sm font-bold text-slate-800">
          {lang === 'ta' ? 'CSV கோப்பை இங்கு இழுத்து இடவும் அல்லது தேர்ந்தெடுக்கவும்' : 'Upload CSV File'}
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          {lang === 'ta'
            ? 'தமிழ் யுனிகோட் (UTF-8) எழுத்துக்கள் கொண்ட கோப்புகளை நேரடியாக பதிவேற்றலாம்.'
            : 'Supports UTF-8 encoded files with Tamil Unicode characters and formatted Excel sheets.'}
        </p>

        <div className="mt-4 flex justify-center">
          <label className="cursor-pointer px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs">
            <span>{fileName || t.chooseFile}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {fileName && (
          <div className="mt-2 text-xs font-mono text-emerald-800">
            {fileName} ({parsedPreview.length} {t.records})
          </div>
        )}
      </div>

      {/* Parse Errors if any */}
      {parseErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg space-y-1">
          <div className="font-bold">⚠️ Warnings / Errors:</div>
          {parseErrors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}

      {/* Live Preview Table */}
      {parsedPreview.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {t.previewRows} ({parsedPreview.length} {t.records})
            </span>

            <button
              onClick={handleCommitImport}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              ✓ {t.validateAndSave}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto overflow-x-auto text-xs">
            <table className="w-full text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-mono">
                <tr>
                  {activeType === 'beneficiaries' ? (
                    <>
                      <th className="py-2 px-3">NIC</th>
                      <th className="py-2 px-3">Name (Tamil)</th>
                      <th className="py-2 px-3">Name (English)</th>
                      <th className="py-2 px-3">Division</th>
                      <th className="py-2 px-3">Household</th>
                      <th className="py-2 px-3">Scheme</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-3">User ID</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Division</th>
                      <th className="py-2 px-3">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {parsedPreview.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {activeType === 'beneficiaries' ? (
                      <>
                        <td className="py-2 px-3 font-mono font-bold">{row.nic}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{row.nameTa}</td>
                        <td className="py-2 px-3 text-slate-600">{row.nameEn}</td>
                        <td className="py-2 px-3 font-mono">{row.divisionCode}</td>
                        <td className="py-2 px-3 font-mono">{row.householdNo}</td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-emerald-800">{row.welfareScheme}</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 font-mono font-bold">{row.id}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{row.name}</td>
                        <td className="py-2 px-3 font-mono font-semibold">{row.role}</td>
                        <td className="py-2 px-3 font-mono">{row.division}</td>
                        <td className="py-2 px-3">{row.status}</td>
                      </>
                    )}
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
