import React, { useState, useMemo } from 'react';
import { User, Family, AssistanceRecord, AssistanceProgram } from '../types';
import { StorageService } from '../services/storageService';
import { Language } from '../utils/translations';
import {
  BarChart3,
  TrendingUp,
  Download,
  Search,
  ChevronRight,
  Info,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  AlertCircle,
  Coins,
  Users,
  Building2,
  Gift
} from 'lucide-react';

export type MetricType = 'amount' | 'count' | 'families' | 'coverage';
export type ChartOrientation = 'vertical' | 'horizontal';
export type SortOrder = 'desc' | 'asc' | 'alpha';

export interface VillageAllocationData {
  divisionId: string;
  divisionName: string;
  tamilName?: string;
  totalFamilies: number;
  assistedFamilies: number;
  unassistedFamilies: number;
  coveragePercent: number;
  assistanceCount: number;
  totalAmount: number;
  isUserDivision: boolean;
  programBreakdown: Record<string, { count: number; amount: number }>;
  typeBreakdown: Record<string, { count: number; amount: number }>;
  recentRecords: AssistanceRecord[];
}

export interface DashboardWidgetProps {
  currentUser: User;
  currentLang: Language;
  onSelectFamily?: (family: Family) => void;
  onNavigate?: (tab: string) => void;
  className?: string;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  currentUser,
  currentLang,
  onSelectFamily,
  onNavigate,
  className = ''
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('amount');
  const [orientation, setOrientation] = useState<ChartOrientation>('vertical');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredVillage, setHoveredVillage] = useState<VillageAllocationData | null>(null);
  const [activeVillageModal, setActiveVillageModal] = useState<VillageAllocationData | null>(null);

  const divisions = StorageService.getDivisions();
  const allFamilies = StorageService.getFilteredFamilies(currentUser);
  const allAssistance = StorageService.getFilteredAssistance(currentUser);
  const programs = StorageService.getPrograms();

  const isGnOfficer = currentUser.Role === 'GN Officer' || currentUser.Role === 'GN_Officer';

  const villageDataList: VillageAllocationData[] = useMemo(() => {
    return divisions
      .filter(d => StorageService.canAccessDivision(currentUser, d.Division_Name))
      .map(div => {
        const divFamilies = allFamilies.filter(
          f => f.Division_Name.toLowerCase() === div.Division_Name.toLowerCase()
        );
        const divFamilyQRs = new Set(divFamilies.map(f => f.QR_Number.toUpperCase()));

        const divAssistance = allAssistance.filter(a => {
          const matchQR = divFamilyQRs.has(a.QR_Number.toUpperCase());
          const matchProgram = selectedProgram === 'ALL' || a.Program_ID === selectedProgram;
          return matchQR && matchProgram;
        });

        const assistedQRSet = new Set(divAssistance.map(a => a.QR_Number.toUpperCase()));
        const assistedCount = assistedQRSet.size;
        const totalAmount = divAssistance.reduce((sum, a) => sum + (a.Amount || 0), 0);
        const coverage = divFamilies.length > 0 ? Math.round((assistedCount / divFamilies.length) * 100) : 0;

        const programBreakdown: Record<string, { count: number; amount: number }> = {};
        const typeBreakdown: Record<string, { count: number; amount: number }> = {};

        divAssistance.forEach(a => {
          const pName = a.Program_Name || 'General Aid';
          if (!programBreakdown[pName]) programBreakdown[pName] = { count: 0, amount: 0 };
          programBreakdown[pName].count += 1;
          programBreakdown[pName].amount += (a.Amount || 0);

          const tName = a.Assistance_Type || 'Other';
          if (!typeBreakdown[tName]) typeBreakdown[tName] = { count: 0, amount: 0 };
          typeBreakdown[tName].count += 1;
          typeBreakdown[tName].amount += (a.Amount || 0);
        });

        const recentRecords = [...divAssistance]
          .sort((a, b) => (b.Assistance_Date || '').localeCompare(a.Assistance_Date || ''))
          .slice(0, 4);

        return {
          divisionId: div.Division_ID,
          divisionName: div.Division_Name,
          tamilName: div.Tamil_Name,
          totalFamilies: divFamilies.length,
          assistedFamilies: assistedCount,
          unassistedFamilies: Math.max(0, divFamilies.length - assistedCount),
          coveragePercent: coverage,
          assistanceCount: divAssistance.length,
          totalAmount,
          isUserDivision: currentUser.Division === div.Division_Name,
          programBreakdown,
          typeBreakdown,
          recentRecords
        };
      });
  }, [divisions, allFamilies, allAssistance, currentUser, selectedProgram]);

  const totals = useMemo(() => {
    const totalDisbursed = villageDataList.reduce((sum, v) => sum + v.totalAmount, 0);
    const totalRecords = villageDataList.reduce((sum, v) => sum + v.assistanceCount, 0);
    const totalAssistedFamilies = villageDataList.reduce((sum, v) => sum + v.assistedFamilies, 0);
    const totalRegisteredFamilies = villageDataList.reduce((sum, v) => sum + v.totalFamilies, 0);
    const overallCoverage = totalRegisteredFamilies > 0 ? Math.round((totalAssistedFamilies / totalRegisteredFamilies) * 100) : 0;

    const sortedByAmount = [...villageDataList].sort((a, b) => b.totalAmount - a.totalAmount);
    const topVillage = sortedByAmount.length > 0 && sortedByAmount[0].totalAmount > 0 ? sortedByAmount[0] : null;

    return {
      totalDisbursed,
      totalRecords,
      totalAssistedFamilies,
      totalRegisteredFamilies,
      overallCoverage,
      topVillage
    };
  }, [villageDataList]);

  const processedVillages = useMemo(() => {
    let list = [...villageDataList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v =>
        v.divisionName.toLowerCase().includes(q) ||
        (v.tamilName && v.tamilName.toLowerCase().includes(q)) ||
        v.divisionId.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortOrder === 'alpha') return a.divisionName.localeCompare(b.divisionName);
      let valA = 0;
      let valB = 0;
      if (selectedMetric === 'amount') { valA = a.totalAmount; valB = b.totalAmount; }
      else if (selectedMetric === 'count') { valA = a.assistanceCount; valB = b.assistanceCount; }
      else if (selectedMetric === 'families') { valA = a.assistedFamilies; valB = b.assistedFamilies; }
      else if (selectedMetric === 'coverage') { valA = a.coveragePercent; valB = b.coveragePercent; }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
    return list;
  }, [villageDataList, searchQuery, sortOrder, selectedMetric]);

  const maxValue = useMemo(() => {
    let max = 0;
    processedVillages.forEach(v => {
      let val = 0;
      if (selectedMetric === 'amount') val = v.totalAmount;
      else if (selectedMetric === 'count') val = v.assistanceCount;
      else if (selectedMetric === 'families') val = v.assistedFamilies;
      else if (selectedMetric === 'coverage') val = v.coveragePercent;
      if (val > max) max = val;
    });
    if (selectedMetric === 'coverage') return 100;
    return max > 0 ? max : (selectedMetric === 'amount' ? 50000 : 10);
  }, [processedVillages, selectedMetric]);

  const isTa = currentLang === 'ta';

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {isTa ? 'கிராம உதவி வழங்கல் பகிர்வு & வள ஒதுக்கீடு' : 'Village Assistance Distribution & Resource Allocation'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            {isTa
              ? 'வாகரைப் பிரிவின் கிராம வாரியான நிதி வழங்கல் மற்றும் நலன்புரிப் பகிர்வு விபரங்கள்'
              : 'Visualized allocation of welfare aid, monetary disbursements, and coverage across Vaharai villages'}
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0 overflow-x-auto">
          <button
            onClick={() => setSelectedMetric('amount')}
            className={`px-2.5 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
              selectedMetric === 'amount' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            {isTa ? 'வழங்கிய தொகை (LKR)' : 'Disbursed Amount'}
          </button>
          <button
            onClick={() => setSelectedMetric('count')}
            className={`px-2.5 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
              selectedMetric === 'count' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            {isTa ? 'உதவி எண்ணிக்கை' : 'Aid Count'}
          </button>
          <button
            onClick={() => setSelectedMetric('coverage')}
            className={`px-2.5 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
              selectedMetric === 'coverage' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            {isTa ? 'நிறைவு விகிதம் (%)' : 'Coverage Rate (%)'}
          </button>
        </div>
      </div>

      {/* Horizontal Ranked Bars */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {processedVillages.map((v, idx) => {
          let val = 0;
          if (selectedMetric === 'amount') val = v.totalAmount;
          else if (selectedMetric === 'count') val = v.assistanceCount;
          else if (selectedMetric === 'coverage') val = v.coveragePercent;

          const percentOfMax = maxValue > 0 ? Math.min(100, Math.round((val / maxValue) * 100)) : 0;
          const isUser = v.isUserDivision;

          return (
            <div
              key={v.divisionId}
              className={`p-2.5 rounded-lg border transition-all ${
                isUser ? 'bg-sky-50/70 border-sky-300 ring-1 ring-sky-300' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-400 w-5">#{idx + 1}</span>
                  <span className="font-bold text-slate-900">{v.divisionName}</span>
                  {isUser && (
                    <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded">
                      {isTa ? 'உங்கள் பிரிவு' : 'Your Division'}
                    </span>
                  )}
                </div>
                <div className="font-mono font-bold text-slate-900 text-xs">
                  {selectedMetric === 'amount' ? `LKR ${val.toLocaleString()}` : selectedMetric === 'coverage' ? `${val}%` : `${val}`}
                </div>
              </div>

              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isUser ? 'bg-sky-600' : val > 0 ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  style={{ width: `${Math.max(percentOfMax, val > 0 ? 3 : 0)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono">
                <span>{v.assistedFamilies} / {v.totalFamilies} {isTa ? 'குடும்பங்கள்' : 'families'}</span>
                <span>{v.assistanceCount} {isTa ? 'உதவிகள்' : 'aid events'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default DashboardWidget;
