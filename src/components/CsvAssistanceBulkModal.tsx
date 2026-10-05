import React, { useState } from 'react';
import { User, AssistanceProgram, AssistanceRecord, Family } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  X,
  ArrowRight,
  Info,
  Check,
  Copy,
  Table,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface CsvAssistanceBulkModalProps {
  currentUser: User;
  onClose: () => void;
  onDisbursalComplete: () => void;
  currentLang: Language;
  initialTab?: 'upload' | 'guidelines';
}

interface ParsedRow {
  index: number;
  qrNumber: string;
  familyName: string;
  divisionName: string;
  programId: string;
  assistanceType: AssistanceRecord['Assistance_Type'];
  description: string;
  amount: number;
  quantity: number;
  unit: string;
  date: string;
  remarks: string;
  isValid: boolean;
  isRepeatedRecipient: boolean;
  errors: string[];
}

export const CsvAssistanceBulkModal: React.FC<CsvAssistanceBulkModalProps> = ({
  currentUser,
  onClose,
  onDisbursalComplete,
  currentLang,
  initialTab = 'upload'
}) => {
  const t = TRANSLATIONS[currentLang];
  const programs = StorageService.getPrograms().filter(p => p.Status === 'Active');
  const [selectedProgramId, setSelectedProgramId] = useState<string>(programs[0]?.Program_ID || '');
  const [activeTab, setActiveTab] = useState<'upload' | 'guidelines'>(initialTab);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ added: number; errors: string[] } | null>(null);
  const [copiedSample, setCopiedSample] = useState(false);

  const selectedProgram = programs.find(p => p.Program_ID === selectedProgramId) || programs[0];

  const downloadFile = (csvContent: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBlankTemplate = () => {
    const csv = StorageService.generateAssistanceTemplate(currentUser, selectedProgramId, false);
    downloadFile(
      csv,
      `Assistance_Sample_Template_${selectedProgram.Program_ID}_${new Date().toISOString().substring(0, 10)}.csv`
    );
  };

  const handleDownloadPrefilledTemplate = () => {
    const csv = StorageService.generateAssistanceTemplate(currentUser, selectedProgramId, true);
    downloadFile(
      csv,
      `Assistance_Prefilled_${selectedProgram.Program_ID}_${currentUser.Division.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`
    );
  };

  const handleCopySampleToClipboard = () => {
    const sampleCsv = StorageService.generateAssistanceTemplate(currentUser, selectedProgramId, false);
    navigator.clipboard.writeText(sampleCsv);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2500);
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      alert(currentLang === 'ta' ? 'CSV கோப்பில் தலைப்பு மற்றும் தரவு வரிகள் இருக்க வேண்டும்.' : 'CSV file does not contain header and data rows.');
      return;
    }

    const registeredFamilies = StorageService.getFamilies();
    const existingAssistance = StorageService.getAssistance();

    const headerRow = parseCsvLine(lines[0]);
    const cleanHeader = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, '');

    const colMap: { [key: string]: number } = {};
    headerRow.forEach((h, idx) => {
      const norm = cleanHeader(h);
      if (norm.includes('qr')) colMap.qr = idx;
      else if (norm.includes('family') || norm.includes('name')) colMap.family = idx;
      else if (norm.includes('div')) colMap.division = idx;
      else if (norm.includes('programid') || norm === 'progid') colMap.programId = idx;
      else if (norm.includes('type')) colMap.type = idx;
      else if (norm.includes('desc')) colMap.desc = idx;
      else if (norm.includes('amount')) colMap.amount = idx;
      else if (norm.includes('quantity') || norm === 'qty') colMap.qty = idx;
      else if (norm.includes('unit')) colMap.unit = idx;
      else if (norm.includes('date')) colMap.date = idx;
      else if (norm.includes('remark')) colMap.remarks = idx;
    });

    const parsed: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rawCols = parseCsvLine(lines[i]);
      if (rawCols.length === 0 || (rawCols.length === 1 && !rawCols[0].trim())) continue;

      const qr = (colMap.qr !== undefined ? rawCols[colMap.qr] : rawCols[0] || '').trim().toUpperCase();
      const familyName = (colMap.family !== undefined ? rawCols[colMap.family] : rawCols[1] || '').trim();
      const division = (colMap.division !== undefined ? rawCols[colMap.division] : rawCols[2] || '').trim();
      const progId = (colMap.programId !== undefined ? rawCols[colMap.programId] : selectedProgramId).trim() || selectedProgramId;
      const type = (colMap.type !== undefined ? rawCols[colMap.type] : 'Goods/In-kind').trim() as AssistanceRecord['Assistance_Type'];
      const desc = (colMap.desc !== undefined ? rawCols[colMap.desc] : selectedProgram.Program_Name).trim();
      const amount = Number((colMap.amount !== undefined ? rawCols[colMap.amount] : rawCols[7] || '0').replace(/[^0-9.]/g, '')) || 0;
      const quantity = Number((colMap.qty !== undefined ? rawCols[colMap.qty] : rawCols[8] || '1').replace(/[^0-9.]/g, '')) || 1;
      const unit = (colMap.unit !== undefined ? rawCols[colMap.unit] : 'Package').trim();
      const date = (colMap.date !== undefined ? rawCols[colMap.date] : new Date().toISOString().substring(0, 10)).trim();
      const remarks = (colMap.remarks !== undefined ? rawCols[colMap.remarks] : 'Bulk CSV Upload').trim();

      const errors: string[] = [];

      if (!qr) {
        errors.push(currentLang === 'ta' ? 'QR எண் இல்லை' : 'Missing QR Number');
      }

      const matchedFamily = registeredFamilies.find(f => f.QR_Number.toUpperCase() === qr);
      if (qr && !matchedFamily) {
        errors.push(currentLang === 'ta' ? `QR ${qr}: பதிவேட்டில் இல்லை` : `QR ${qr} not found in registry`);
      } else if (matchedFamily && !StorageService.canAccessDivision(currentUser, matchedFamily.Division_Name)) {
        errors.push(currentLang === 'ta' ? `அனுமதி மறுப்பு: ${matchedFamily.Division_Name} பிரிவு` : `Access denied for division ${matchedFamily.Division_Name}`);
      }

      const priorCount = existingAssistance.filter(a => a.QR_Number.toUpperCase() === qr).length;
      const isRepeated = priorCount >= 3;

      parsed.push({
        index: i,
        qrNumber: qr,
        familyName: matchedFamily ? matchedFamily.Family_Name : familyName || 'Unknown',
        divisionName: matchedFamily ? matchedFamily.Division_Name : division || 'Vaharai',
        programId: progId,
        assistanceType: type,
        description: desc,
        amount,
        quantity,
        unit,
        date,
        remarks,
        isValid: errors.length === 0,
        isRepeatedRecipient: isRepeated,
        errors
      });
    }

    setParsedRows(parsed);
  };

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResultSummary(null);
    const reader = new FileReader();
    reader.onload = evt => {
      const text = (evt.target?.result as string) || '';
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const handleCommitBulk = () => {
    const validOnes = parsedRows.filter(r => r.isValid);
    if (validOnes.length === 0) {
      alert(currentLang === 'ta' ? 'செல்லுபடியான பதிவுகள் எதுவும் இல்லை.' : 'No valid rows to commit.');
      return;
    }
    setIsProcessing(true);
    try {
      const result = StorageService.addBulkAssistance(
        currentUser,
        validOnes.map(r => ({
          QR_Number: r.qrNumber,
          Program_ID: r.programId,
          Assistance_Type: r.assistanceType,
          Description: r.description,
          Amount: r.amount,
          Quantity: r.quantity,
          Unit: r.unit,
          Assistance_Date: r.date,
          Remarks: r.remarks
        }))
      );
      setIsProcessing(false);
      setResultSummary({ added: result.addedCount, errors: result.errors });
      onDisbursalComplete();
    } catch (err: unknown) {
      setIsProcessing(false);
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Failed to process bulk upload.');
      }
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;
  const repeatedCount = parsedRows.filter(r => r.isRepeatedRecipient).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">{t.csvTemplateSection}</h3>
              <p className="text-xs text-slate-300">
                {t.divisionSecretariat} • {currentUser.Division === 'ALL' ? t.allDivisions : currentUser.Division}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-md cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.program} <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={selectedProgramId}
                    onChange={e => setSelectedProgramId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold cursor-pointer focus:outline-none"
                  >
                    {programs.map(p => (
                      <option key={p.Program_ID} value={p.Program_ID}>
                        {p.Program_ID} • {p.Program_Name} ({p.Program_Type})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={handleDownloadBlankTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>{currentLang === 'ta' ? 'மாதிரி CSV பதிவிறக்குக' : t.downloadTemplate}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPrefilledTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{t.downloadPrefilledTemplate}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Drop Zone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-emerald-50/30 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">{t.csvDropHint}</p>
              <label className="mt-3 inline-block px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shadow-xs">
                <span>{currentLang === 'ta' ? 'CSV கோப்பைத் தெரிவுசெய்க' : 'Browse CSV File'}</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              {fileName && (
                <p className="text-xs font-mono font-semibold text-emerald-700 mt-2">
                  Loaded: {fileName} ({parsedRows.length} rows)
                </p>
              )}
            </div>

            {/* Success Result Banner */}
            {resultSummary && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">
                      {currentLang === 'ta'
                        ? `வெற்றி: ${resultSummary.added} உதவிப் பதிவுகள் வெற்றிகரமாக சேமிக்கப்பட்டன!`
                        : `Success: ${resultSummary.added} assistance records successfully logged and audited!`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-md cursor-pointer"
                >
                  {t.closeDossier}
                </button>
              </div>
            )}

            {/* Validation Summary */}
            {parsedRows.length > 0 && !resultSummary && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                    <span className="text-[10px] text-emerald-700 block uppercase font-bold">{t.validRows}</span>
                    <span className="text-lg font-bold font-mono">{validCount}</span>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs">
                    <span className="text-[10px] text-rose-700 block uppercase font-bold">{t.invalidRows}</span>
                    <span className="text-lg font-bold font-mono">{invalidCount}</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                    <span className="text-[10px] text-amber-700 block uppercase font-bold">{t.repeatedWarnings}</span>
                    <span className="text-lg font-bold font-mono">{repeatedCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    {currentLang === 'ta'
                      ? `${validCount} சரியான பதிவுகள் உதவிப் பதிவேட்டில் சேர்க்கப்படும்.`
                      : `${validCount} valid disbursements will be added to the registry.`}
                  </span>
                  <button
                    type="button"
                    disabled={validCount === 0 || isProcessing}
                    onClick={handleCommitBulk}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isProcessing ? '...' : t.confirmBulkDisbursal}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <span>{t.divisionSecretariat}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md shadow-2xs cursor-pointer"
          >
            {t.closeDossier}
          </button>
        </div>
      </div>
    </div>
  );
};
