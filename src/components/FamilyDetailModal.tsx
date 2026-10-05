import React, { useState } from 'react';
import { Family, FamilyMember, Need, AssistanceRecord, User, FamilyVulnerabilityProfile } from '../types';
import { StorageService } from '../services/storageService';
import { AddMemberModal } from './AddMemberModal';
import { PrintableQrCard } from './PrintableQrCard';
import {
  X,
  Users,
  Gift,
  ListTodo,
  QrCode,
  UserPlus,
  Plus,
  AlertTriangle,
  Building,
  Phone,
  MapPin,
  Check,
  Sparkles,
  GraduationCap,
  HeartPulse,
  DollarSign,
  Package,
  Users2,
  Edit3,
  Save
} from 'lucide-react';
import { TRANSLATIONS, Language } from '../utils/translations';

interface FamilyDetailModalProps {
  family: Family;
  currentUser: User;
  currentLang?: Language;
  onClose: () => void;
  onFamilyUpdated?: () => void;
  onDataChanged?: () => void;
  onRecordAssistance?: (family: Family) => void;
  onRequestTransfer?: (oldNIC: string, qrNumber: string) => void;
}

export const FamilyDetailModal: React.FC<FamilyDetailModalProps> = ({
  family,
  currentUser,
  currentLang = 'en',
  onClose,
  onFamilyUpdated,
  onDataChanged,
  onRecordAssistance,
  onRequestTransfer
}) => {
  const t = TRANSLATIONS[currentLang];
  const [activeTab, setActiveTab] = useState<'members' | 'assistance' | 'needs' | 'vulnerability'>('members');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showPrintCard, setShowPrintCard] = useState(false);
  const [showAddNeed, setShowAddNeed] = useState(false);

  const data = StorageService.getFamily(currentUser, family.QR_Number);
  const [members, setMembers] = useState<FamilyMember[]>(data.members);
  const [needs, setNeeds] = useState<Need[]>(data.needs);
  const assistance: AssistanceRecord[] = data.assistance;

  const [editingVuln, setEditingVuln] = useState(false);
  const [vulnState, setVulnState] = useState<FamilyVulnerabilityProfile>(family.vulnerability || {});

  const [needForm, setNeedForm] = useState({
    Need_Type: 'Housing Repair',
    Description: '',
    Priority: 'High' as Need['Priority'],
    Remarks: ''
  });

  const notifyChange = () => {
    if (onFamilyUpdated) onFamilyUpdated();
    if (onDataChanged) onDataChanged();
  };

  const handleMemberAdded = (newMember: FamilyMember) => {
    setMembers(prev => [...prev, newMember]);
    notifyChange();
  };

  const handleCreateNeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!needForm.Description.trim()) return;
    try {
      const created = StorageService.addNeed(currentUser, {
        QR_Number: family.QR_Number,
        Need_Type: needForm.Need_Type,
        Description: needForm.Description,
        Priority: needForm.Priority,
        Remarks: needForm.Remarks
      });
      setNeeds(prev => [created, ...prev]);
      setShowAddNeed(false);
      setNeedForm({
        Need_Type: 'Housing Repair',
        Description: '',
        Priority: 'High',
        Remarks: ''
      });
      notifyChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNeedStatus = (needId: string, status: Need['Status']) => {
    try {
      const updated = StorageService.updateNeedStatus(currentUser, needId, status);
      setNeeds(prev => prev.map(n => n.Need_ID === needId ? updated : n));
      notifyChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveVulnerability = () => {
    try {
      const updated = StorageService.updateFamily(currentUser, {
        Family_ID: family.Family_ID,
        vulnerability: vulnState
      });
      family.vulnerability = updated.vulnerability;
      setEditingVuln(false);
      notifyChange();
    } catch (err) {
      console.error(err);
    }
  };

  const totalAssistanceAmount = assistance.reduce((sum, a) => sum + (a.Amount || 0), 0);
  const isHighAssistance = assistance.length >= 3;

  const activeVuln = editingVuln ? vulnState : (family.vulnerability || vulnState);
  const flaggedCount = [
    Boolean(activeVuln.education_level && activeVuln.education_level === 'No formal education'),
    (activeVuln.non_schooling_children_count || 0) > 0,
    activeVuln.chronic_illness_members,
    activeVuln.disabled_members,
    activeVuln.electricity_under_60_units,
    activeVuln.no_house_land_ownership,
    activeVuln.no_other_building_ownership,
    activeVuln.no_cultivable_highland_half_acre,
    activeVuln.no_cultivable_paddy_one_acre,
    activeVuln.no_mobility_asset,
    activeVuln.no_economic_activity_asset,
    activeVuln.no_livelihood_livestock_asset,
    activeVuln.is_shanty_lineroom,
    activeVuln.no_permanent_wall_floor_roof,
    activeVuln.floor_area_under_500sqft,
    activeVuln.no_clean_drinking_water,
    activeVuln.no_adequate_sanitation,
    activeVuln.no_electricity_access,
    activeVuln.dependency_ratio_high,
    activeVuln.is_single_parent
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                {family.QR_Number}
              </span>
              {family.Registration_Number && (
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 rounded">
                  Reg#: {family.Registration_Number}
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono">ID: {family.Family_ID}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                family.Priority_Level === 'Critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                family.Priority_Level === 'High' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-slate-700 text-slate-300'
              }`}>
                {family.Priority_Level}
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-bold bg-teal-500/25 text-teal-200 border border-teal-400/40">
                Aswesuma: {family.Aswesuma_Category || 'Not selected'}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">{family.Family_Name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {family.Division_Name} ({family.Division_ID})
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {family.Address || 'No address registered'}
              </span>
              {family.Telephone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {family.Telephone}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintCard(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{t.printCard}</span>
            </button>
            {onRecordAssistance && (
              <button
                onClick={() => {
                  onClose();
                  onRecordAssistance(family);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{t.deliverAid}</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* High Assistance Warning Banner */}
        {isHighAssistance && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <p>
                <span className="font-bold">{t.repeatedAlertTitle}:</span> {family.Family_Name} has received{' '}
                <span className="font-mono font-bold">{assistance.length}</span> assistance disbursements totaling{' '}
                <span className="font-mono font-bold">LKR {totalAssistanceAmount.toLocaleString()}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Demographics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">{t.familySize}</span>
            <span className="font-semibold text-slate-900 font-mono text-sm">{members.length || family.Family_Size} Members</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">{t.monthlyIncome}</span>
            <span className="font-semibold text-slate-900 font-mono text-sm">
              LKR {family.Monthly_Income ? family.Monthly_Income.toLocaleString() : '0'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">{t.housingStatus}</span>
            <span className="font-semibold text-slate-900 text-sm">{family.Housing_Status}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">{currentLang === 'ta' ? 'அஸ்வெசும நிலை' : 'Aswesuma Status'}</span>
            <select
              value={family.Aswesuma_Category || 'Not selected'}
              onChange={e => {
                const nextCat = e.target.value as Family['Aswesuma_Category'];
                StorageService.updateFamily(currentUser, {
                  Family_ID: family.Family_ID,
                  Aswesuma_Category: nextCat
                });
                family.Aswesuma_Category = nextCat;
                notifyChange();
              }}
              className="mt-0.5 px-2 py-0.5 text-xs font-bold border border-emerald-300 rounded bg-white text-emerald-900 cursor-pointer"
            >
              <option value="Severely Poor">Severely Poor</option>
              <option value="Poor">Poor</option>
              <option value="Vulnerable">Vulnerable</option>
              <option value="Not selected">Not selected</option>
            </select>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">{t.totalAssistance}</span>
            <span className="font-semibold text-emerald-700 font-mono text-sm">
              LKR {totalAssistanceAmount.toLocaleString()} ({assistance.length})
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-200 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'members'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{currentLang === 'ta' ? 'உறுப்பினர்கள்' : 'Members'} ({members.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('assistance')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'assistance'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>{currentLang === 'ta' ? 'உதவி வழங்கல்' : 'Assistance'} ({assistance.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('needs')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'needs'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>{currentLang === 'ta' ? 'தேவைகள்' : 'Needs'} ({needs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('vulnerability')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'vulnerability'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{t.vulnerabilityAssessment}</span>
            {flaggedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                {flaggedCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {currentLang === 'ta' ? 'பதிவு செய்யப்பட்ட உறுப்பினர்கள்' : 'Registered Family Members'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {currentLang === 'ta' ? 'தேசிய அடையாள அட்டை சரிபார்க்கப்பட்டது.' : 'National ID / Elder ID is cross-verified across all divisions.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t.addMember}</span>
                </button>
              </div>

              {members.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No members registered yet under this family.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">{t.fullName}</th>
                        <th className="px-3 py-2.5">{t.relationship}</th>
                        <th className="px-3 py-2.5 font-mono">{t.nic}</th>
                        <th className="px-3 py-2.5">{t.dob}</th>
                        <th className="px-3 py-2.5">{currentLang === 'ta' ? 'காணி விபரம் (மேட்டு / வயல் / BLR)' : 'Land (Highland / Paddy / BLR)'}</th>
                        <th className="px-3 py-2.5">{t.occupation}</th>
                        <th className="px-3 py-2.5 text-right font-mono">{t.income}</th>
                        <th className="px-3 py-2.5">{t.vulnerability}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {members.map(m => (
                        <tr key={m.Member_ID} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            {m.Name}
                            <div className="text-[10px] text-slate-400">{m.Gender}</div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{m.Relationship}</td>
                          <td className="px-3 py-2.5 font-mono font-medium text-slate-800">
                            {m.NIC_Elder_ID || <span className="text-[10px] text-slate-400 italic">{currentLang === 'ta' ? '18-க்குள்' : '<18 Minor'}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 font-mono">
                            {m.DOB || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 text-[11px]">
                            {m.Highland_Extent || m.Paddy_Extent || m.Land_BLR_Deed_No ? (
                              <div className="space-y-0.5">
                                {m.Highland_Extent && <div><span className="text-slate-500">{currentLang === 'ta' ? 'மேட்டு:' : 'Highland:'}</span> <strong>{m.Highland_Extent}</strong></div>}
                                {m.Paddy_Extent && <div><span className="text-slate-500">{currentLang === 'ta' ? 'வயல்:' : 'Paddy:'}</span> <strong>{m.Paddy_Extent}</strong></div>}
                                {m.Land_BLR_Deed_No && <div className="font-mono text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded inline-block border border-amber-200">BLR/Deed: {m.Land_BLR_Deed_No}</div>}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">{m.Occupation || '-'}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            {m.Monthly_Income ? `LKR ${m.Monthly_Income.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1 flex-wrap">
                              {m.Disability === 'Yes' && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] px-1.5 py-0.5 rounded">
                                  Disabled
                                </span>
                              )}
                              {m.Elderly === 'Yes' && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded">
                                  Elderly
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assistance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {currentLang === 'ta' ? 'உதவி வழங்கல் வரலாறு' : 'Assistance History'}
                  </h4>
                </div>
              </div>

              {assistance.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Gift className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No assistance records logged yet for this family.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 font-mono">{t.date}</th>
                        <th className="px-3 py-2.5">{t.program}</th>
                        <th className="px-3 py-2.5">{t.type}</th>
                        <th className="px-3 py-2.5 text-right font-mono">{t.amount}</th>
                        <th className="px-3 py-2.5">{t.quantity}</th>
                        <th className="px-3 py-2.5">{t.officer}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {assistance.map(a => (
                        <tr key={a.Assistance_ID} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2.5 font-mono text-slate-600">{a.Assistance_Date}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">{a.Program_Name}</td>
                          <td className="px-3 py-2.5 text-slate-700">{a.Assistance_Type}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-900">
                            {a.Amount ? `LKR ${a.Amount.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {a.Quantity ? `${a.Quantity} ${a.Unit || ''}` : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{a.Provided_By}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'needs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {currentLang === 'ta' ? 'அடையாளம் கண்ட தேவைகள்' : 'Identified Family Needs'}
                  </h4>
                </div>
                <button
                  onClick={() => setShowAddNeed(!showAddNeed)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddNeed ? t.cancel : t.logNeed}</span>
                </button>
              </div>

              {showAddNeed && (
                <form onSubmit={handleCreateNeed} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Need Type</label>
                      <input
                        type="text"
                        required
                        value={needForm.Need_Type}
                        onChange={e => setNeedForm({ ...needForm, Need_Type: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t.priority}</label>
                      <select
                        value={needForm.Priority}
                        onChange={e => setNeedForm({ ...needForm, Priority: e.target.value as Need['Priority'] })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description</label>
                    <textarea
                      required
                      rows={2}
                      value={needForm.Description}
                      onChange={e => setNeedForm({ ...needForm, Description: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddNeed(false)}
                      className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer"
                    >
                      {t.save}
                    </button>
                  </div>
                </form>
              )}

              {needs.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <ListTodo className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No specific needs logged for this family.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {needs.map(n => (
                    <div key={n.Need_ID} className="p-3.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{n.Need_Type}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              n.Priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                              n.Priority === 'High' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {n.Priority}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              n.Status === 'Fulfilled' ? 'bg-emerald-100 text-emerald-800' :
                              n.Status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {n.Status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700">{n.Description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {n.Status !== 'Fulfilled' && (
                            <button
                              onClick={() => handleUpdateNeedStatus(n.Need_ID, 'Fulfilled')}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>{t.fulfill}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vulnerability' && (
            <div className="space-y-5 text-xs">
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{t.vulnerabilityAssessment}</h4>
                    <p className="text-xs text-emerald-800">{t.optionalIndicatorsNotice}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-mono text-emerald-800">
                    {flaggedCount} / 20 {currentLang === 'ta' ? 'குறிகாட்டிகள்' : 'Indicators'}
                  </span>
                  {editingVuln ? (
                    <button
                      type="button"
                      onClick={handleSaveVulnerability}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-2xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{currentLang === 'ta' ? 'சேமிக்க' : 'Save Indicators'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingVuln(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold shadow-2xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{currentLang === 'ta' ? 'திருத்துக' : 'Edit Indicators'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Education */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <GraduationCap className="w-4 h-4" />
                    <span>1. {t.vulnEducation}</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{t.educationLevel}</label>
                    <select
                      disabled={!editingVuln}
                      value={activeVuln.education_level || ''}
                      onChange={e => setVulnState({ ...vulnState, education_level: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
                    >
                      <option value="">{currentLang === 'ta' ? 'குறிப்பிடப்படவில்லை' : 'Not Specified'}</option>
                      <option value="No formal education">{currentLang === 'ta' ? 'முறையான கல்வியில்லை' : 'No formal education'}</option>
                      <option value="Primary (Grade 1-5)">{currentLang === 'ta' ? 'ஆரம்பக் கல்வி (தரம் 1-5)' : 'Primary (Grade 1-5)'}</option>
                      <option value="Secondary (Grade 6-11)">{currentLang === 'ta' ? 'இடைநிலைக் கல்வி (தரம் 6-11)' : 'Secondary (Grade 6-11)'}</option>
                      <option value="G.C.E. O/L">G.C.E. O/L</option>
                      <option value="G.C.E. A/L">G.C.E. A/L</option>
                      <option value="Higher Education">{currentLang === 'ta' ? 'பல்கலைக்கழகம் / உயர் கல்வி' : 'Higher Education'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {currentLang === 'ta' ? 'பாடசாலை செல்லாத பிள்ளைகள்' : 'Non-schooling children count'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={!editingVuln}
                      value={activeVuln.non_schooling_children_count || 0}
                      onChange={e => setVulnState({ ...vulnState, non_schooling_children_count: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* 2. Health */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
                  <div className="font-bold text-rose-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <HeartPulse className="w-4 h-4" />
                    <span>2. {t.vulnHealth}</span>
                  </div>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      disabled={!editingVuln}
                      checked={activeVuln.chronic_illness_members || false}
                      onChange={e => setVulnState({ ...vulnState, chronic_illness_members: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>{currentLang === 'ta' ? 'நாட்பட்ட / பாரதூரமான நோயாளர் உள்ளமை' : 'Members with chronic illness'}</span>
                  </label>
                  <input
                    type="text"
                    disabled={!editingVuln}
                    placeholder={currentLang === 'ta' ? 'நோய் விபரம்...' : 'Illness details...'}
                    value={activeVuln.chronic_illness_details || ''}
                    onChange={e => setVulnState({ ...vulnState, chronic_illness_details: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg disabled:bg-slate-50"
                  />
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      disabled={!editingVuln}
                      checked={activeVuln.disabled_members || false}
                      onChange={e => setVulnState({ ...vulnState, disabled_members: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>{currentLang === 'ta' ? 'விசேட தேவையுடையோர் / இயலாமை கொண்டோர்' : 'Persons with disabilities'}</span>
                  </label>
                </div>

                {/* 3. Economic */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
                  <div className="font-bold text-amber-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>3. {t.vulnEconomic}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {currentLang === 'ta' ? 'ஆளொன்றுக்கான வருமானம்' : 'Per-Capita Income'}
                      </label>
                      <input
                        type="number"
                        disabled={!editingVuln}
                        value={activeVuln.monthly_per_capita_income || ''}
                        onChange={e => setVulnState({ ...vulnState, monthly_per_capita_income: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {currentLang === 'ta' ? 'ஆளொன்றுக்கான செலவு' : 'Per-Capita Expense'}
                      </label>
                      <input
                        type="number"
                        disabled={!editingVuln}
                        value={activeVuln.monthly_per_capita_expenditure || ''}
                        onChange={e => setVulnState({ ...vulnState, monthly_per_capita_expenditure: Number(e.target.value) || undefined })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      disabled={!editingVuln}
                      checked={activeVuln.electricity_under_60_units || false}
                      onChange={e => setVulnState({ ...vulnState, electricity_under_60_units: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>{currentLang === 'ta' ? 'மின்சாரப் பாவனை 60 அலகுகளுக்கு குறைவு' : 'Electricity under 60 units'}</span>
                  </label>
                </div>

                {/* 4. Assets */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-indigo-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <Package className="w-4 h-4" />
                    <span>4. {t.vulnAssets}</span>
                  </div>
                  {[
                    { key: 'no_house_land_ownership', ta: 'சொந்த வீடு / காணி அற்றது', en: 'No house/land ownership' },
                    { key: 'no_cultivable_highland_half_acre', ta: '0.5 ஏக்கர் மேட்டுக்காணி அற்றது', en: 'No 0.5+ acre highland' },
                    { key: 'no_cultivable_paddy_one_acre', ta: '1 ஏக்கர் வயல்காணி அற்றது', en: 'No 1.0+ acre paddy land' },
                    { key: 'no_mobility_asset', ta: 'மோட்டார் வாகனம் / இயந்திரம் அற்றது', en: 'No mobility asset' },
                    { key: 'no_livelihood_livestock_asset', ta: 'கால்நடைச் சொத்துக்கள் அற்றது', en: 'No livestock assets' }
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <input
                        type="checkbox"
                        disabled={!editingVuln}
                        checked={Boolean((activeVuln as Record<string, unknown>)[item.key])}
                        onChange={e => setVulnState({ ...vulnState, [item.key]: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{currentLang === 'ta' ? item.ta : item.en}</span>
                    </label>
                  ))}
                </div>

                {/* 5. Housing */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-sky-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <Building className="w-4 h-4" />
                    <span>5. {t.vulnHousing}</span>
                  </div>
                  {[
                    { key: 'is_shanty_lineroom', ta: 'குடிசை / தற்காலிக வதிவிடம்', en: 'Shanty / Temporary shelter' },
                    { key: 'no_permanent_wall_floor_roof', ta: 'நிரந்தர சுவர் / தரை / கூரை அற்றது', en: 'Lacks permanent wall/floor/roof' },
                    { key: 'no_clean_drinking_water', ta: 'சுத்தமான குடிநீர் / கிணறு அற்றது', en: 'No clean drinking water' },
                    { key: 'no_adequate_sanitation', ta: 'மலசலகூட வசதி அற்றது', en: 'No sanitation / toilet' },
                    { key: 'no_electricity_access', ta: 'மின்சார வசதி அற்றது', en: 'No electricity access' }
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <input
                        type="checkbox"
                        disabled={!editingVuln}
                        checked={Boolean((activeVuln as Record<string, unknown>)[item.key])}
                        onChange={e => setVulnState({ ...vulnState, [item.key]: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{currentLang === 'ta' ? item.ta : item.en}</span>
                    </label>
                  ))}
                </div>

                {/* 6. Demography */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-purple-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <Users2 className="w-4 h-4" />
                    <span>6. {t.vulnDemography}</span>
                  </div>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      disabled={!editingVuln}
                      checked={activeVuln.dependency_ratio_high || false}
                      onChange={e => setVulnState({ ...vulnState, dependency_ratio_high: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>{currentLang === 'ta' ? 'அதிக தங்கியிருப்போர் விகிதம் (> 0.64)' : 'High dependency ratio (> 0.64)'}</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      disabled={!editingVuln}
                      checked={activeVuln.is_single_parent || false}
                      onChange={e => setVulnState({ ...vulnState, is_single_parent: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>{currentLang === 'ta' ? 'தனிப் பெற்றோர் / பெண் தலைமைத்துவக் குடும்பம்' : 'Single parent / Female-headed'}</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span className="font-mono">Created by: {family.Created_By} on {family.Created_At.substring(0, 10)}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md shadow-2xs cursor-pointer"
          >
            {t.closeDossier}
          </button>
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          family={family}
          currentUser={currentUser}
          currentLang={currentLang}
          onClose={() => setShowAddMember(false)}
          onMemberAdded={handleMemberAdded}
          onRequestTransfer={onRequestTransfer}
        />
      )}
      {showPrintCard && (
        <PrintableQrCard
          family={family}
          members={members}
          onClose={() => setShowPrintCard(false)}
        />
      )}
    </div>
  );
};
