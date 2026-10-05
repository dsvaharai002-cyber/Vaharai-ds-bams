import React, { useState } from 'react';
import { User, Family, FamilyMember } from '../types';
import { StorageService } from '../services/storageService';
import { FamilyDetailModal } from './FamilyDetailModal';
import { Language } from '../utils/translations';
import {
  HeartHandshake,
  Search,
  Download,
  Eye,
  Building,
  Phone,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  Edit3,
  Accessibility
} from 'lucide-react';

interface DisabilityRegistryViewProps {
  currentUser: User;
  currentLang?: Language;
  onRecordAssistance?: (family: Family) => void;
  onRequestTransfer?: (oldNIC: string, qrNumber: string) => void;
}

export const DisabilityRegistryView: React.FC<DisabilityRegistryViewProps> = ({
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
  const [filterTab, setFilterTab] = useState<'ALL' | 'Receiving' | 'Eligible_Pending' | 'Device_Needed'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeDossierFamily, setActiveDossierFamily] = useState<Family | null>(null);
  const [editingMember, setEditingMember] = useState<{
    member: FamilyMember;
    family: Family;
    disabilityType: string;
    allowanceStatus: string;
    deviceNeeded: string;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const rawList = StorageService.getDisabilityRegistry(
    currentUser,
    filterTab === 'Device_Needed' ? 'ALL' : filterTab
  );

  const filteredList = rawList.filter(item => {
    if (isGnOfficer && item.family.Division_Name.toLowerCase() !== currentUser.Division.toLowerCase()) {
      return false;
    }
    if (selectedDivision !== 'ALL' && item.family.Division_Name.toLowerCase() !== selectedDivision.toLowerCase()) {
      return false;
    }
    if (filterTab === 'Device_Needed' && (!item.deviceNeeded || item.deviceNeeded === 'General Assistance')) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchQR = item.family.QR_Number.toLowerCase().includes(q);
      const matchName = item.member.Name.toLowerCase().includes(q);
      const matchNIC = item.member.NIC_Elder_ID.toLowerCase().includes(q);
      const matchType = item.disabilityType.toLowerCase().includes(q);
      const matchDevice = item.deviceNeeded.toLowerCase().includes(q);
      const matchAddress = item.family.Address.toLowerCase().includes(q);
      return matchQR || matchName || matchNIC || matchType || matchDevice || matchAddress;
    }
    return true;
  });

  const allDisabled = StorageService.getDisabilityRegistry(currentUser, 'ALL');
  const totalCount = allDisabled.length;
  const receivingCount = allDisabled.filter(d => d.allowanceStatus === 'Receiving').length;
  const eligibleCount = allDisabled.filter(d => d.allowanceStatus === 'Eligible_Pending').length;
  const deviceNeededCount = allDisabled.filter(d => d.deviceNeeded && d.deviceNeeded !== 'General Assistance').length;

  const handleExportCsv = () => {
    const csv = StorageService.exportDisabilityRegistryCsv(currentUser);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Vaharai_Disability_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveDisabilityDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      StorageService.updateFamilyMember(currentUser, {
        Member_ID: editingMember.member.Member_ID,
        Disability_Type: editingMember.disabilityType,
        Disability_Allowance: editingMember.allowanceStatus as FamilyMember['Disability_Allowance'],
        Disability_Device_Needed: editingMember.deviceNeeded
      });
      setEditingMember(null);
      setRefreshKey(prev => prev + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update disability record');
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
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              ♿
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isTa ? 'விசேட தேவையுடையோர் பதிவேடு' : 'Persons with Disabilities Registry'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {isTa
                  ? 'விசேட தேவையுடையோருக்கான உபகரணத் தேவைகள், கொடுப்பனவு மற்றும் குடும்ப QR விபரங்கள்'
                  : 'QR-centered disability welfare tracker, monthly allowances & assistive device needs'}
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
            {isTa ? 'CSV பதிவிறக்குக' : 'Export Disability CSV'}
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
            {totalCount} {isTa ? 'நபர்கள்' : 'individuals'}
          </span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {isTa ? 'மொத்த விசேட தேவையுடையோர்' : 'Total Persons with Disability'}
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-md">
              <Accessibility className="w-4 h-4" />
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

        <div className="bg-white p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800">
              {isTa ? 'உபகரணம் தேவைப்படுவோர்' : 'Device Needed'}
            </span>
            <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-md">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-2 font-mono">{deviceNeededCount}</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">{isTa ? 'குடும்ப QR எண்' : 'Family QR'}</th>
                <th className="py-3 px-4">{isTa ? 'பயனாளி & அடையாள அட்டை' : 'Beneficiary & NIC'}</th>
                <th className="py-3 px-4 text-center">{isTa ? 'வயது' : 'Age'}</th>
                <th className="py-3 px-4">{isTa ? 'இயலாமை வகை' : 'Disability Type'}</th>
                <th className="py-3 px-4">{isTa ? 'தேவைப்படும் உபகரணம்' : 'Assistive Device Needed'}</th>
                <th className="py-3 px-4">{isTa ? 'கொடுப்பனவு நிலை' : 'Allowance Status'}</th>
                <th className="py-3 px-4">{isTa ? 'கிராம அலுவலர் பிரிவு' : 'GN Division'}</th>
                <th className="py-3 px-4 text-right no-print">{isTa ? 'செயற்பாடுகள்' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Accessibility className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">{isTa ? 'விபரங்கள் எதுவும் கிடைக்கவில்லை' : 'No records found'}</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const { member, family, computedAge, disabilityType, allowanceStatus, deviceNeeded } = item;
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
                        <div className="text-[11px] text-slate-500 font-mono">
                          {member.NIC_Elder_ID} • {member.Relationship}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-xs">
                          {computedAge > 0 ? `${computedAge}` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-900 font-medium">{disabilityType}</span>
                      </td>
                      <td className="py-3 px-4">
                        {deviceNeeded && deviceNeeded !== 'General Assistance' ? (
                          <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 font-semibold px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                            <span>{deviceNeeded}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
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
                      <td className="py-3 px-4 text-right no-print">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setEditingMember({
                                member,
                                family,
                                disabilityType,
                                allowanceStatus,
                                deviceNeeded
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
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
              {isTa ? 'விசேட தேவை விபரம் திருத்தம்' : 'Update Disability Record'}
            </h3>
            <form onSubmit={handleSaveDisabilityDetails} className="space-y-4 text-xs mt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isTa ? 'இயலாமை வகை' : 'Disability Type'}
                </label>
                <select
                  value={editingMember.disabilityType}
                  onChange={(e) => setEditingMember({ ...editingMember, disabilityType: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Physical / Mobility Impairment">உடலியக்க இயலாமை (Physical / Mobility)</option>
                  <option value="Visual Impairment">பார்வைக் குறைபாடு (Visual Impairment)</option>
                  <option value="Hearing & Speech Impairment">செவிப்புலன் & பேச்சு குறைபாடு</option>
                  <option value="Intellectual / Mental Disability">புலனறிவுக் குறைபாடு (Intellectual)</option>
                  <option value="Multiple Disabilities">பல்வகை இயலாமை (Multiple)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isTa ? 'தேவைப்படும் உபகரணம்' : 'Assistive Device Needed'}
                </label>
                <input
                  type="text"
                  value={editingMember.deviceNeeded}
                  onChange={(e) => setEditingMember({ ...editingMember, deviceNeeded: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  placeholder="e.g. சக்கர நாற்காலி (Wheelchair)"
                />
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
                  className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
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
