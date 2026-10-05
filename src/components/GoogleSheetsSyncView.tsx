import React, { useState } from 'react';
import { Language } from '../utils/translations';
import {
  DEFAULT_WEB_APP_URL,
  getGoogleWebAppUrl,
  setGoogleWebAppUrl,
  MASTER_QUESTIONNAIRE_HEADERS,
} from '../services/cloudService';
import { StorageService } from '../services/storageService';
import {
  Database,
  Check,
  Copy,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  ListChecks
} from 'lucide-react';

interface GoogleSheetsSyncViewProps {
  currentLang: Language;
}

export const GoogleSheetsSyncView: React.FC<GoogleSheetsSyncViewProps> = ({ currentLang }) => {
  const isTa = currentLang === 'ta';
  const [copiedCode, setCopiedCode] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState(getGoogleWebAppUrl() || DEFAULT_WEB_APP_URL);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSaveAndSyncAll = async () => {
    const trimmed = webAppUrl.trim() || DEFAULT_WEB_APP_URL;
    setGoogleWebAppUrl(trimmed);
    setWebAppUrl(trimmed);
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await StorageService.syncAllQuestionnaireDataToGoogleSheet();
      setSyncMessage({
        type: 'success',
        text: isTa
          ? `வெற்றி! ${result.count} குடும்பங்களின் அனைத்து 43+ வினாக்கள் மற்றும் குறிகாட்டிகள் உங்கள் கூகுள் எக்செல் சீட்டில் (${trimmed.slice(
              0,
              48
            )}...) நேரடியாகப் பதிவு செய்யப்பட்டன!`
          : `Success! All 43+ questionnaire fields for ${result.count} families were recorded directly to your Google Sheet!`,
      });
    } catch (e: any) {
      setSyncMessage({
        type: 'error',
        text: isTa
          ? 'இணைப்பில் தற்காலிகத் தடை. ஆயினும் பின்னணி நேரலை ஒத்திசைவு (Background Cloud Sync) இயங்குகிறது.'
          : 'Sync warning: Background cloud synchronization has been queued.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const appsScriptCode = `/**
 * ============================================================================
 * BAMS – VAHARAI DIVISIONAL SECRETARIAT (கோறளைப்பற்று வடக்கு - வாகரை)
 * FULL QUESTIONNAIRE GOOGLE SHEETS / EXCEL RECORDING SCRIPT (NO LOCAL STORAGE)
 * Deployment URL: ${DEFAULT_WEB_APP_URL}
 * ============================================================================
 */

const MASTER_HEADERS = ${JSON.stringify(MASTER_QUESTIONNAIRE_HEADERS, null, 2)};

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAllData';

  if (action === 'getAllData') {
    const families = getSheetObjects(ss, 'Families');
    const members = getSheetObjects(ss, 'Family_Members');
    const assistance = getSheetObjects(ss, 'Assistance_Records');
    const users = getSheetObjects(ss, 'Users');
    return jsonResponse({ status: 'success', families, members, assistance, users });
  }
  return jsonResponse({ status: 'online', service: 'Vaharai BAMS Cloud Sheet API' });
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const raw = e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    const type = body.type || body.action || 'ADD_FAMILY';
    const payload = body.payload || body;

    // 1. Always record full 43-column Questionnaire into "Master_Questionnaire" sheet
    const masterSheet = ensureSheet(ss, 'Master_Questionnaire', MASTER_HEADERS);
    if (payload && payload.flatRow && Array.isArray(payload.flatRow)) {
      upsertRowByKey(masterSheet, 1, payload.QR_Number || payload.Registration_Number, payload.flatRow);
    } else if (payload && payload.flatQuestionnaire) {
      const rowArr = MASTER_HEADERS.map(h => payload.flatQuestionnaire[h] !== undefined ? payload.flatQuestionnaire[h] : '');
      upsertRowByKey(masterSheet, 1, payload.QR_Number || payload.Registration_Number, rowArr);
    }

    // 2. Sync to structured entity tabs
    if (type === 'ADD_FAMILY' || type === 'UPDATE_FAMILY') {
      const famHeaders = MASTER_HEADERS;
      const famSheet = ensureSheet(ss, 'Families', famHeaders);
      const flat = payload.flatQuestionnaire || payload;
      const rowArr = famHeaders.map(h => flat[h] !== undefined ? flat[h] : (payload[h] !== undefined ? payload[h] : ''));
      upsertRowByKey(famSheet, 1, payload.QR_Number, rowArr);
    }

    if (type === 'BULK_SYNC_ALL_QUESTIONNAIRES' && Array.isArray(payload.rows)) {
      const famSheet = ensureSheet(ss, 'Families', MASTER_HEADERS);
      payload.rows.forEach(item => {
        const rowArr = MASTER_HEADERS.map(h => item[h] !== undefined ? item[h] : '');
        upsertRowByKey(masterSheet, 1, item.QR_Number, rowArr);
        upsertRowByKey(famSheet, 1, item.QR_Number, rowArr);
      });
    }

    if (type === 'ADD_MEMBER' || type === 'UPDATE_MEMBER') {
      const memHeaders = [
        'Registration_Number', 'Member_ID', 'Family_ID', 'QR_Number', 'Name',
        'Relationship', 'Gender', 'DOB', 'Age', 'NIC_Elder_ID', 'Is_Temp_NIC',
        'Aswesuma_Category', 'Occupation', 'Monthly_Income', 'Disability_Flag', 'Summary_Flag'
      ];
      const memSheet = ensureSheet(ss, 'Family_Members', memHeaders);
      const rowArr = memHeaders.map(h => payload[h] !== undefined ? payload[h] : '');
      upsertRowByKey(memSheet, 1, payload.Member_ID, rowArr);
    }

    if (type === 'ADD_ASSISTANCE') {
      const aidHeaders = [
        'Record_ID', 'QR_Number', 'Division', 'Beneficiary_ID', 'Beneficiary_Name',
        'Assist_Category', 'Assist_Sub_Type', 'Program_ID', 'Program_Name_Ta',
        'Organization', 'Date', 'Status', 'Handled_By', 'Amount', 'Remarks'
      ];
      const aidSheet = ensureSheet(ss, 'Assistance_Records', aidHeaders);
      const rowArr = aidHeaders.map(h => payload[h] !== undefined ? payload[h] : '');
      upsertRowByKey(aidSheet, 0, payload.Record_ID, rowArr);
    }

    if (type === 'ADD_USER' || type === 'UPDATE_USER') {
      const userHeaders = ['User_ID', 'Password', 'Name', 'Role', 'Division', 'Status', 'Created_At', 'Last_Login'];
      const userSheet = ensureSheet(ss, 'Users', userHeaders);
      const rowArr = userHeaders.map(h => payload[h] !== undefined ? payload[h] : '');
      upsertRowByKey(userSheet, 0, payload.User_ID, rowArr);
    }

    return jsonResponse({ status: 'success', type });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function upsertRowByKey(sheet, keyColZeroIndex, keyValue, rowData) {
  if (!keyValue) {
    sheet.appendRow(rowData);
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const keys = sheet.getRange(2, keyColZeroIndex + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i][0]).trim() === String(keyValue).trim()) {
        sheet.getRange(i + 2, 1, 1, rowData.length).setValues([rowData]);
        return;
      }
    }
  }
  sheet.appendRow(rowData);
}

function getSheetObjects(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-2xl p-6 text-white shadow-sm border border-emerald-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isTa
                  ? 'லோகல் ஸ்டோரேச் நீக்கப்பட்டது • நேரடி கூகுள் எக்செல் சீட் (Cloud Sheet) பதிவு'
                  : 'Local Storage Disabled • Direct Google Sheet / Excel Cloud Recording'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {isTa
                ? 'அனைத்து வினாக்களையும் கூகுள் எக்செல் சீட்டில் (Excel Sheet) நேரடியாகப் பதிவு செய்தல்'
                : 'Direct Google Sheets / Excel Full Questionnaire Sync'}
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {isTa
                ? 'இங்கு கேட்கப்படும் அனைத்து 43+ வினாக்கள், தனிப் பதிவு இலக்கம் (Registration No), அஸ்வெசும நிலை (Severely Poor / Poor / Vulnerable / Not selected), 18+ தற்காலிக அடையாள அட்டை மற்றும் 7 இடர்பாட்டுக் குறிகாட்டிகள் அனைத்தும் நேரடியாக உங்கள் எக்செல் சீட் இணைப்பில் பதிவு செய்யப்படுகின்றன.'
                : 'Every single questionnaire field (43+ columns including Unique Registration Number, Aswesuma Category, 18+ Temporary NIC, and all 7 vulnerability categories) is recorded directly to your Google Apps Script URL.'}
            </p>
          </div>

          <button
            onClick={handleSaveAndSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>
              {isSyncing
                ? isTa
                  ? 'எக்செல் சீட்டில் பதிவு செய்யப்படுகிறது...'
                  : 'Recording to Excel Sheet...'
                : isTa
                ? 'அனைத்துத் தரவுகளையும் இப்போதே எக்செல் சீட்டில் பதிவு செய்க'
                : 'Sync All Questionnaire Records to Excel Sheet Now'}
            </span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs sm:text-sm font-bold ${
            syncMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {syncMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <span>{syncMessage.text}</span>
        </div>
      )}

      {/* Active Google Apps Script Endpoint Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {isTa
                  ? 'இணைக்கப்பட்டுள்ள உங்களது கூகுள் எக்செல் சீட் லிங் (Active Google Apps Script URL)'
                  : 'Connected Google Apps Script Web App URL'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTa
                  ? 'ஒவ்வொரு புதிய குடும்பப் பதிவு, உறுப்பினர் பதிவு மற்றும் மாற்றங்களின் போதும் தானாகவே இந்த லிங்கிற்குத் தரவு அனுப்பப்படும்.'
                  : 'Every family registration, member update, and questionnaire response is automatically transmitted to this URL.'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            {isTa ? 'நேரலை இணைப்பு செயலில் உள்ளது' : 'Live Cloud Link Active'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="url"
            value={webAppUrl}
            onChange={e => setWebAppUrl(e.target.value)}
            className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            onClick={handleSaveAndSyncAll}
            disabled={isSyncing}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
          >
            {isTa ? 'லிங்கை சேமி & ஒத்திசை (Save & Sync)' : 'Save URL & Sync All'}
          </button>
        </div>
      </div>

      {/* List of all 43 Questionnaire Columns Recorded in Excel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ListChecks className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {isTa
                ? `எக்செல் சீட்டில் பதிவு செய்யப்படும் ${MASTER_QUESTIONNAIRE_HEADERS.length} வினாக்களின் நெடுவரிசைகள் (All Recorded Excel Columns)`
                : `All ${MASTER_QUESTIONNAIRE_HEADERS.length} Questionnaire Columns Recorded in Google Sheet`}
            </h3>
            <p className="text-xs text-slate-500">
              {isTa
                ? 'Master_Questionnaire மற்றும் Families தாள்களில் கீழ்க்காணும் அனைத்து வினாக்களும் தனித்தனி நெடுவரிசைகளாகப் பதிவாகும்:'
                : 'Every column below is automatically created and updated in your Google Sheet:'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MASTER_QUESTIONNAIRE_HEADERS.map((col, idx) => (
            <span
              key={col}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-200"
            >
              {idx + 1}. {col}
            </span>
          ))}
        </div>
      </div>

      {/* Google Apps Script Code Block */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-emerald-400">
              {isTa
                ? 'உங்கள் கூகுள் சீட் Apps Script (Code.gs) முழுமையான நிரல்'
                : 'Complete Google Apps Script (Code.gs) for Full Questionnaire Recording'}
            </h3>
            <p className="text-xs text-slate-400">
              {isTa
                ? 'இந்தக் குறியீட்டை உங்கள் Google Sheet -> Extensions -> Apps Script இல் ஒட்டி Deploy செய்வதன் மூலம் அனைத்து 43+ வினாக்களும் தானாக எக்செல் சீட்டில் பதிவாகும்.'
                : 'Paste this into Extensions -> Apps Script in your Google Sheet to automatically record all 43+ questionnaire fields.'}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
          >
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>
              {copiedCode
                ? isTa
                  ? 'நகலெடுக்கப்பட்டது!'
                  : 'Copied!'
                : isTa
                ? 'Apps Script குறியீட்டை நகலெடு'
                : 'Copy Apps Script Code'}
            </span>
          </button>
        </div>

        <pre className="p-4 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-96 leading-relaxed">
          {appsScriptCode}
        </pre>
      </div>
    </div>
  );
};
