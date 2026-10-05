import React, { useState } from 'react';
import { AuditLog, User } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import { History, Search, Download } from 'lucide-react';

interface AuditLogViewProps {
  currentUser: User;
  currentLang?: Language;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  currentUser,
  currentLang = 'en'
}) => {
  const t = TRANSLATIONS[currentLang];
  const isTa = currentLang === 'ta';
  const [logs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const filteredLogs = logs.filter(l => {
    if (selectedAction !== 'ALL' && l.Action !== selectedAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.User_Name.toLowerCase().includes(q) ||
        l.User_ID.toLowerCase().includes(q) ||
        l.Action.toLowerCase().includes(q) ||
        l.Table_Name.toLowerCase().includes(q) ||
        l.Record_ID.toLowerCase().includes(q) ||
        l.New_Value.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    const csv = StorageService.exportSheetAsCsv('Audit_Log');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Log_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actionTypes = Array.from(new Set(logs.map(l => l.Action)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            {t.auditTrailTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isTa
              ? 'அனைத்து குடும்பப் பதிவுகள், உதவி வழங்கல்கள் மற்றும் உத்தியோகத்தர் நடவடிக்கைகளின் முழுமையான வரலாற்றுப் பதிவுகள்.'
              : 'Immutable transaction records of all registrations, aid disbursements, and administrative approvals.'}
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t.exportCsv}</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isTa ? 'பயனர், நடவடிக்கை அல்லது விபரம் கொண்டு தேடுக...' : 'Search by user, action, table, or record ID...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="sm:col-span-4">
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer focus:outline-none"
            >
              <option value="ALL">{isTa ? 'அனைத்து நடவடிக்கைகளும்' : 'All Action Types'}</option>
              {actionTypes.map(act => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 font-mono">{isTa ? 'பதிவு எண்' : 'Log ID'}</th>
                <th className="px-3.5 py-3">{isTa ? 'நேரம்' : 'Timestamp'}</th>
                <th className="px-3.5 py-3 font-mono">{t.userId}</th>
                <th className="px-3.5 py-3">{isTa ? 'பயனர்' : 'User'}</th>
                <th className="px-3.5 py-3">{isTa ? 'நடவடிக்கை' : 'Action'}</th>
                <th className="px-3.5 py-3">{isTa ? 'அட்டவணை' : 'Table'}</th>
                <th className="px-3.5 py-3 font-mono">{isTa ? 'பதிவு ID' : 'Record ID'}</th>
                <th className="px-3.5 py-3">{isTa ? 'விபரம்' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-sans text-xs">
                    {isTa ? 'கணக்காய்வுப் பதிவுகள் எதுவும் இல்லை.' : 'No audit records found.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(l => (
                  <tr key={l.Log_ID} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 text-slate-500 font-medium">{l.Log_ID}</td>
                    <td className="px-3.5 py-2.5 text-slate-600 font-sans text-xs whitespace-nowrap">{l.Timestamp}</td>
                    <td className="px-3.5 py-2.5 text-emerald-700 font-bold">{l.User_ID}</td>
                    <td className="px-3.5 py-2.5 font-sans text-xs text-slate-900">{l.User_Name}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="font-sans px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {l.Action}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600 font-sans">{l.Table_Name}</td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-800">{l.Record_ID}</td>
                    <td className="px-3.5 py-2.5 text-slate-600 font-sans text-[11px] truncate max-w-xs">
                      {l.New_Value}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
