import React from 'react';
import { User, Family, HighAssistanceFamily } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import { DashboardWidget } from './DashboardWidget';
import { AppLogo } from './AppLogo';
import {
  Users,
  Gift,
  Home,
  ListTodo,
  TrendingUp,
  Building,
  QrCode,
  ShieldAlert,
  ArrowRight,
  Plus,
  UserCheck,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: User;
  onNavigate: (tab: string) => void;
  onSelectFamily: (family: Family) => void;
  onOpenScanner: () => void;
  currentLang: Language;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onNavigate,
  onSelectFamily,
  onOpenScanner,
  currentLang
}) => {
  const t = TRANSLATIONS[currentLang];
  const isTa = currentLang === 'ta';
  const isGnOfficer = currentUser.Role === 'GN Officer' || currentUser.Role === 'GN_Officer';
  const { stats, highAssistance, divisionBreakdown } = StorageService.getDashboard(currentUser);
  const families = StorageService.getFilteredFamilies(currentUser);
  const assistanceList = StorageService.getFilteredAssistance(currentUser);
  const totalAmountDisbursed = assistanceList.reduce((sum, a) => sum + (a.Amount || 0), 0);
  const assistedPercent = stats.families > 0
    ? Math.round((stats.assistedFamilies / stats.families) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner with Scoping */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <AppLogo size="lg" className="shrink-0 ring-2 ring-emerald-500/50" />
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                {t.divisionSecretariat} • {t.district}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {isGnOfficer
                  ? (isTa ? `${currentUser.Division} கிராம சேவகர் பிரிவு` : `${currentUser.Division} GN Division`)
                  : t.appTitle}
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {isGnOfficer
                  ? (isTa
                      ? `உங்கள் ${currentUser.Division} கிராம சேவகர் பிரிவின் குடும்பப் பதிவுகள், இடர்பாட்டு நிலை மற்றும் உதவி வழங்கல் விபரங்கள் மட்டுமே காண்பிக்கப்படுகின்றன.`
                      : `Managing household vulnerability, aid distribution, and beneficiary records exclusively for ${currentUser.Division} GN Division.`)
                  : t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('ai_report')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isTa ? 'ஏஐ முன்னுரிமை அறிக்கை (AI Report)' : 'AI Strategic Report'}</span>
            </button>

            <button
              onClick={onOpenScanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>{t.verifyQR}</span>
            </button>

            <button
              onClick={() => onNavigate('registry')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.registerFamily}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Scoping Notice */}
      {isGnOfficer && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>{t.divisionScopedNotice}</strong> {currentUser.Division}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
            {currentUser.Name}
          </span>
        </div>
      )}

      {/* Primary KPI Metric Cards (Strictly Scoped by Division) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Families */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">{t.totalFamilies}</span>
            <Home className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.families}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {isTa ? 'பதிவுசெய்த குடும்பங்கள்' : 'Registered in Registry'}
          </span>
        </div>

        {/* Total Beneficiaries */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">{t.totalMembers}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.members}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">{t.individualsLogged}</span>
        </div>

        {/* Assisted Families */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">{t.assistedFamilies}</span>
            <Gift className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {stats.assistedFamilies}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block font-mono">
            {assistedPercent}% {t.covered}
          </span>
        </div>

        {/* Unassisted Families */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">{t.unassistedFamilies}</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {stats.unassistedFamilies}
          </div>
          <span className="text-[11px] text-amber-700 mt-1 block">{t.priorityTargetPool}</span>
        </div>

        {/* Total Aid Disbursements */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">{t.totalAssistance}</span>
            <Gift className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.assistanceRecords}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block font-mono">
            LKR {(totalAmountDisbursed / 1000).toFixed(0)}k {t.totalDisbursed}
          </span>
        </div>

        {/* Open Needs */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">{t.openNeeds}</span>
            <ListTodo className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono tabular-nums">
            {stats.needs}
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block">{t.awaitingPrograms}</span>
        </div>
      </div>

      {/* Village Assistance Distribution Chart Widget */}
      <DashboardWidget
        currentUser={currentUser}
        currentLang={currentLang}
        onSelectFamily={onSelectFamily}
        onNavigate={onNavigate}
      />

      {/* Repeated Assistance Alert Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.repeatedAlertTitle}</h3>
              <p className="text-xs text-slate-500">{t.repeatedAlertDesc}</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-mono">
            {highAssistance.length} {isTa ? 'குடும்பங்கள்' : 'Household(s)'}
          </span>
        </div>

        {highAssistance.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            {isTa
              ? 'எந்தக் குடும்பமும் 3 அல்லது அதற்கு மேற்பட்ட முறை உதவி பெறவில்லை.'
              : 'No families currently have 3 or more assistance records. Aid distribution is balanced.'}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 font-mono">{t.qrNumber}</th>
                  <th className="px-3.5 py-2.5">{t.familyName}</th>
                  <th className="px-3.5 py-2.5">{t.division}</th>
                  <th className="px-3.5 py-2.5 text-center font-mono">{isTa ? 'உதவி எண்ணிக்கை' : 'Assistance Count'}</th>
                  <th className="px-3.5 py-2.5 text-right font-mono">{isTa ? 'மொத்த உதவித் தொகை (LKR)' : 'Total Received (LKR)'}</th>
                  <th className="px-3.5 py-2.5 font-mono">{isTa ? 'கடைசி திகதி' : 'Last Date'}</th>
                  <th className="px-3.5 py-2.5 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {highAssistance.map((row: HighAssistanceFamily) => (
                  <tr key={row.QR_Number} className="hover:bg-slate-50/80">
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                      {row.QR_Number}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                      {row.Family_Name}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-700">
                      {row.Division_Name}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="px-2 py-0.5 font-mono font-bold text-xs bg-amber-100 text-amber-900 rounded">
                        {row.Assistance_Count} {isTa ? 'முறை' : 'times'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                      LKR {row.Total_Amount.toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-600">
                      {row.Last_Assistance_Date || '-'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        onClick={() => {
                          const fam = families.find(f => f.QR_Number.toUpperCase() === row.QR_Number.toUpperCase());
                          if (fam) onSelectFamily(fam);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-emerald-700 underline cursor-pointer"
                      >
                        <span>{t.auditHistory}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
