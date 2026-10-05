import React, { useState } from 'react';
import { User, Family, FamilyMember } from '../types';
import { StorageService } from '../services/storageService';
import { FamilyDetailModal } from './FamilyDetailModal';
import { PrintableQrCard } from './PrintableQrCard';
import { Language } from '../utils/translations';
import {
  UserCheck,
  Search,
  Filter,
  Download,
  Eye,
  QrCode,
  Building,
  Phone,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  Edit3
} from 'lucide-react';

interface ElderlyRegistryViewProps {
  currentUser: User;
  currentLang?: Language;
  onRecordAssistance?: (family: Family) => void;
  onRequestTransfer?: (oldNIC: string, qrNumber: string) => void;
}

export const ElderlyRegistryView: React.FC<ElderlyRegistryViewProps> = ({
  currentUser,
  currentLang = 'ta',
  onRecordAssistance,
  onRequestTransfer
}) => {
  const isTa = currentLang === 'ta';
  const isGnOfficer = currentUser.Role === 'GN Officer' || currentUser.Role === 'GN_Officer';
  const divisions = StorageService.getDivisions();
  const [selectedDivision, setSelectedDivision] = useState<string>(
    currentUser.Division !== 'ALL' ? currentUser.Division : 'ALL'
  );
  const [filterTab, setFilterTab] = useState<'ALL' | 'Receiving' | 'Eligible_Pending' | '70_Plus'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeDossierFamily, setActiveDossierFamily] = useState<Family | null>(null);
  const [activePrintFamily, setActivePrintFamily] = useState<Family | null>(null);
  const [editingMember, setEditingMember] = useState<{
    member: FamilyMember;
    family: Family;
    allowanceStatus: string;
    amount: number;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const rawList = StorageService.getElderlyRegistry(currentUser, filterTab);

  const filteredList = rawList.filter(item => {
    if (isGnOfficer && item.family.Division_Name.toLowerCase() !== currentUser.Division.toLowerCase()) {
      return false;
    }
    if (selectedDivision !== 'ALL' && item.family.Division_Name.toLowerCase() !== selectedDivision.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchQR = item.family.QR_Number.toLowerCase().includes(q);
      const matchName = item.member.Name.toLowerCase().includes(q);
      const matchNIC = item.member.NIC_Elder_ID.toLowerCase().includes(q);
      const matchAddress = item.family.Address.toLowerCase().includes(q);
      const matchPhone = item.family.Telephone.toLowerCase().includes(q);
      return matchQR || matchName || matchNIC || matchAddress || matchPhone;
    }
    return true;
  });

  const allElderly = StorageService.getElderlyRegistry(currentUser, 'ALL');
  const totalCount = allElderly.length;
  const receivingCount = allElderly.filter(e => e.allowanceStatus === 'Receiving').length;
  const eligibleCount = allElderly.filter(e => e.allowanceStatus === 'Eligible_Pending').length;
  const age70PlusCount = allElderly.filter(e => e.is70Plus).length;

  const handleExportCsv = () => {
    const csv = StorageService.exportElderlyRegistryCsv(currentUser);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Vaharai_Elderly_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveAllowanceStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      StorageService.updateFamilyMember(currentUser, {
        Member_ID: editingMember.member.Member_ID,
        Elderly_Allowance: editingMember.allowanceStatus as FamilyMember['Elderly_Allowance'],
        Elderly_Allowance_Amount: Number(editingMember.amount) || 0
      });
      setEditingMember(null);
      setRefreshKey(prev => prev + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update allowance status');
    }
  };

  const getDivisionTamilName = (divName: string) => {
    const div = divisions.find(d => d.Division_Name === divName);
    return isTa && div?.Tamil_Name ? div.Tamil_Name : divName;
  };

  return (
    <div key={refreshKey} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              👴
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isTa ? 'முதியோர் நல்வாழ்வு & கொடுப்பனவுப் பதிவேடு' : 'Elderly Registry & Welfare Allowance'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {isTa
                  ? 'தேசிய அடையாள அட்டை (NIC) மூலம் வயது தானியங்கி கணக்கீடு, 70+ மற்றும் 60+ கொடுப்பனவு விபரங்கள்'
                  : 'NIC-based automated age calculation, allowance eligibility & Family QR integration'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5" />
            {isTa ? 'அறிக்கை அச்சிடு' : 'Print Report'}
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer no-print"
          >
            <Download className="w-3.5 h-3.5" />
            {isTa ? 'முதியோர் CSV பதிவிறக்குக' : 'Export Elderly CSV'}
          </button>
        </div>
      </div>

      {isGnOfficer && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>{isTa ? 'கிராம அலுவலர் பிரிவு: ' : 'Division: '}</strong> {currentUser.Division}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
            {totalCount} {isTa ? 'முதியோர்கள்' : 'seniors'}
          </span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {isTa ? 'மொத்த முதியோர்கள் (60+)' : 'Total Seniors (60+)'}
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-md">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{totalCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">
              {isTa ? 'கொடுப்பனவு பெறுவோர்' : 'Receiving Allowance'}
            </span>
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">{receivingCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">
              {isTa ? 'தகுதியுடையோர் (நிலுவை)' : 'Eligible - Pending'}
            </span>
            <span className="p-1.5 bg-amber-100 text-amber-800 rounded-md">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono">{eligibleCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200/80 bg-purple-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800">
              {isTa ? 'முன்னுரிமை 70+ வயதினர்' : 'Age 70+ (Priority)'}
            </span>
            <span className="p-1.5 bg-purple-100 text-purple-800 rounded-md">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2 font-mono">{age70PlusCount}</div>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 no-print">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isTa ? `அனைத்து முதியோரும் (${totalCount})` : `All Elderly (${totalCount})`}
          </button>
          <button
            onClick={() => setFilterTab('Receiving')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'Receiving' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isTa ? `கொடுப்பனவு பெறுவோர் (${receivingCount})` : `Receiving (${receivingCount})`}
          </button>
          <button
            onClick={() => setFilterTab('Eligible_Pending')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'Eligible_Pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {isTa ? `தகுதியுடையோர் (${eligibleCount})` : `Eligible (${eligibleCount})`}
          </button>
          <button
            onClick={() => setFilterTab('70_Plus')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === '70_Plus' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-800 border border-purple-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isTa ? `70 வயதுக்கு மேற்பட்டோர் (${age70PlusCount})` : `Age 70+ (${age70PlusCount})`}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={isTa ? 'குடும்ப QR, பெயர், NIC எண் கொண்டு தேடுக...' : 'Search by Family QR, Member name, NIC number...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>
          <div className="md:col-span-4">
            <div className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white">
              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={isGnOfficer ? currentUser.Division : selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                disabled={isGnOfficer}
                className="w-full text-xs text-slate-700 bg-transparent focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
              >
                {!isGnOfficer && (
                  <option value="ALL">{isTa ? 'அனைத்து கிராம சேவகர் பிரிவுகளும் (16)' : 'All 16 GN Divisions'}</option>
                )}
                {divisions.map((d) => (
                  <option key={d.GN_Code || d.Division_ID} value={d.Division_Name}>
                    {d.GN_Code ? `${d.GN_Code} - ` : ''}{isTa && d.Tamil_Name ? d.Tamil_Name : d.Division_Name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">{isTa ? 'குடும்ப QR எண்' : 'Family QR'}</th>
                <th className="py-3 px-4">{isTa ? 'முதியோரின் பெயர் & உறவு' : 'Senior Name & Relation'}</th>
                <th className="py-3 px-4">{isTa ? 'தேசிய அடையாள அட்டை (NIC)' : 'NIC Number'}</th>
                <th className="py-3 px-4 text-center">{isTa ? 'கணிக்கப்பட்ட வயது' : 'Calculated Age'}</th>
                <th className="py-3 px-4">{isTa ? 'கொடுப்பனவு நிலை' : 'Allowance Status'}</th>
                <th className="py-3 px-4">{isTa ? 'கிராம அலுவலர் பிரிவு' : 'GN Division'}</th>
                <th className="py-3 px-4">{isTa ? 'முகவரி & தொடர்பு' : 'Address & Contact'}</th>
                <th className="py-3 px-4 text-right no-print">{isTa ? 'செயற்பாடுகள்' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">{isTa ? 'முதியோர் விபரங்கள் எதுவும் கிடைக்கவில்லை' : 'No elderly records found'}</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const { member, family, computedAge, allowanceStatus, is70Plus } = item;
                  return (
                    <tr key={member.Member_ID} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setActiveDossierFamily(family)}
                          className="font-mono text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200 transition-colors cursor-pointer text-left block"
                        >
                          {family.QR_Number}
                        </button>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[130px] mt-0.5">
                          {family.Family_Name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{member.Name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{member.Relationship}</span>
                          <span>•</span>
                          <span>{member.Gender === 'Female' ? 'பெண்' : 'ஆண்'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="text-slate-800 font-medium">{member.NIC_Elder_ID}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className={`inline-flex flex-col items-center px-2 py-0.5 rounded-lg border font-mono ${
                          is70Plus ? 'bg-purple-50 text-purple-900 border-purple-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}>
                          <span className="text-xs font-bold">{computedAge} {isTa ? 'வயது' : 'yrs'}</span>
                          <span className="text-[9px] font-semibold text-slate-500">
                            {is70Plus ? (isTa ? '70+ தகுதி' : '70+ Tier') : (isTa ? '60-69 வயது' : 'Senior')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {allowanceStatus === 'Receiving' ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isTa ? 'பெறுகிறார்' : 'Receiving'}</span>
                          </div>
                        ) : allowanceStatus === 'Eligible_Pending' ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{isTa ? 'தகுதியுடையவர்' : 'Eligible'}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {isTa ? 'தகுதியற்றவர்' : 'Not Eligible'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">
                          {getDivisionTamilName(family.Division_Name)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-600 truncate max-w-xs">{family.Address}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {family.Telephone || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right no-print">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setEditingMember({
                                member,
                                family,
                                allowanceStatus,
                                amount: member.Elderly_Allowance_Amount || 3000
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setActiveDossierFamily(family)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {isTa ? 'முதியோர் கொடுப்பனவு நிலை மாற்றம்' : 'Update Elderly Allowance Status'}
            </h3>
            <form onSubmit={handleSaveAllowanceStatus} className="space-y-4 text-xs mt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isTa ? 'கொடுப்பனவு நிலை' : 'Allowance Status'}
                </label>
                <select
                  value={editingMember.allowanceStatus}
                  onChange={(e) => setEditingMember({ ...editingMember, allowanceStatus: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Receiving">{isTa ? 'பெறுகிறார் (Receiving)' : 'Receiving'}</option>
                  <option value="Eligible_Pending">{isTa ? 'தகுதியுடையவர் (Eligible - Pending)' : 'Eligible - Pending'}</option>
                  <option value="Not_Eligible">{isTa ? 'தகுதியற்றவர் (Not Eligible)' : 'Not Eligible'}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {isTa ? 'ரத்து செய்' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
                >
                  {isTa ? 'சேமிக்க' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeDossierFamily && (
        <FamilyDetailModal
          family={activeDossierFamily}
          currentUser={currentUser}
          currentLang={currentLang}
          onClose={() => setActiveDossierFamily(null)}
          onDataChanged={() => setRefreshKey(prev => prev + 1)}
          onRequestTransfer={onRequestTransfer}
        />
      )}
    </div>
  );
};
