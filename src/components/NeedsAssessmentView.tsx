import React, { useState } from 'react';
import { Need, User, Family } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import {
  ListTodo,
  Search,
  Filter,
  Check,
  Plus,
  X,
  CreditCard,
  Gift,
  Building,
  AlertCircle
} from 'lucide-react';

interface NeedsAssessmentViewProps {
  currentUser: User;
  currentLang?: Language;
  onSelectFamily: (family: Family) => void;
}

export const NeedsAssessmentView: React.FC<NeedsAssessmentViewProps> = ({
  currentUser,
  currentLang = 'en',
  onSelectFamily
}) => {
  const t = TRANSLATIONS[currentLang];
  const isTa = currentLang === 'ta';
  const families = StorageService.getFilteredFamilies(currentUser);
  const [needs, setNeeds] = useState<Need[]>(() => StorageService.getFilteredNeeds(currentUser));
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 8 Official Public Assistance & Service Schemes
  const publicServicesCatalog = [
    {
      id: 'srv_certificates_nic',
      name: isTa
        ? '1. பிறப்பு, இறப்பு, திருமணச் சான்றிதழ் & NIC விண்ணப்பங்கள்'
        : '1. Birth, Death, Marriage Certificates & NIC Applications',
      defaultNeed: isTa ? 'பிறப்பு, இறப்பு, திருமணச் சான்றிதழ் பிரதிகள் & NIC விண்ணப்பம்' : 'Birth/Death/Marriage certificate copies & NIC application'
    },
    {
      id: 'srv_gn_certificates',
      name: isTa
        ? '2. வதிவிடச் சான்றிதழ் & வருமானச் சான்றிதழ் (கிராம அலுவலர்)'
        : '2. Residence & Income Certificates (Grama Niladhari)',
      defaultNeed: isTa ? 'கிராம அலுவலர் மூலமான வதிவிடச் சான்றிதழ் மற்றும் வருமானச் சான்றிதழ்' : 'Residence and income certificates via Grama Niladhari'
    },
    {
      id: 'srv_land_permits',
      name: isTa
        ? '3. அரச காணிப் பகிர்வு, காணி அனுமதிப்பத்திரம் & உரிமங்கள் (Deeds)'
        : '3. State Land Alienation, Land Permits & Deeds',
      defaultNeed: isTa ? 'அரச காணிப் பகிர்வு, காணி அனுமதிப்பத்திரம் மற்றும் காணி உரிமம் (Land Deeds)' : 'State land alienation, land permits and deeds'
    },
    {
      id: 'srv_aswesuma_welfare',
      name: isTa
        ? '4. அஸ்வெசும, முதியோர்/மாற்றுத்திறனாளி கொடுப்பனவு & நிவாரணம்'
        : '4. Aswesuma, Elderly, Disability Allowances & Relief',
      defaultNeed: isTa ? 'அஸ்வெசும, முதியோர்/மாற்றுத்திறனாளிக் கொடுப்பனவு மற்றும் அவசரகால நிவாரணம்' : 'Aswesuma, elderly/disability allowances and relief aid'
    },
    {
      id: 'srv_business_trade',
      name: isTa
        ? '5. வணிகப் பெயர் பதிவு & வர்த்தக உரிமங்கள் (Trade Licenses)'
        : '5. Business Name Registration & Trade Licenses',
      defaultNeed: isTa ? 'வணிகப் பெயர் பதிவு மற்றும் வர்த்தக உரிமங்கள் (Trade Licenses)' : 'Business names registration and trade licenses'
    },
    {
      id: 'srv_vehicle_revenue',
      name: isTa
        ? '6. மோட்டார் வாகன வருமான வரி அனுமதிப்பத்திரம் (Revenue License)'
        : '6. Motor Vehicle Revenue License',
      defaultNeed: isTa ? 'மோட்டார் வாகனங்களுக்கான வருமான வரி அனுமதிப்பத்திரம் (Revenue License)' : 'Vehicle Revenue License issuance'
    },
    {
      id: 'srv_pension_services',
      name: isTa
        ? '7. ஓய்வுபெற்ற அரச ஊழியர் ஓய்வூதியக் கொடுப்பனவு ஆவணங்கள்'
        : '7. Pensions Administration for Retired Civil Servants',
      defaultNeed: isTa ? 'ஓய்வுபெற்ற அரச ஊழியர்களுக்கான ஓய்வூதியக் கொடுப்பனவு ஆவணங்கள்' : 'Pension payment documentation for retired civil servants'
    },
    {
      id: 'srv_building_permits',
      name: isTa
        ? '8. கட்டட திட்ட அனுமதி & ஒப்புதல் (குடியிருப்பு/வணிகம்)'
        : '8. Building Planning Permits & Approvals (Residential/Commercial)',
      defaultNeed: isTa ? 'குடியிருப்பு மற்றும் வணிகக் கட்டடங்களுக்கான திட்ட அனுமதி மற்றும் ஒப்புதல்' : 'Planning permits and approvals for residential & commercial buildings'
    }
  ];

  // Modal State for Adding Need Request
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formQR, setFormQR] = useState('');
  const [formNeedType, setFormNeedType] = useState(publicServicesCatalog[0].defaultNeed);
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<Need['Priority']>('Medium');
  const [formRemarks, setFormRemarks] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const refreshNeeds = () => {
    setNeeds(StorageService.getFilteredNeeds(currentUser));
  };

  const handleUpdateStatus = (needId: string, status: Need['Status']) => {
    StorageService.updateNeedStatus(currentUser, needId, status);
    refreshNeeds();
  };

  const handleCreateNeed = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formQR.trim()) {
      setModalError(isTa ? 'குடும்ப QR எண்ணை உள்ளிடவும் அல்லது தெரிவுசெய்யவும்.' : 'Please enter or select a Family QR number.');
      return;
    }
    if (!formDescription.trim()) {
      setModalError(isTa ? 'தேவை விபரங்களை உள்ளிடவும்.' : 'Please enter requirement details.');
      return;
    }

    try {
      StorageService.addNeed(currentUser, {
        QR_Number: formQR.trim().toUpperCase(),
        Need_Type: formNeedType,
        Description: formDescription.trim(),
        Priority: formPriority,
        Remarks: formRemarks.trim()
      });
      refreshNeeds();
      setIsAddModalOpen(false);
      setFormQR('');
      setFormDescription('');
      setFormRemarks('');
    } catch (err: any) {
      setModalError(err.message || (isTa ? 'பதிவு செய்வதில் பிழை ஏற்பட்டது.' : 'Failed to record need.'));
    }
  };

  const filteredNeeds = needs.filter(n => {
    if (filterStatus !== 'ALL' && n.Status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && n.Priority !== filterPriority) return false;
    if (filterCategory !== 'ALL' && !n.Need_Type.toLowerCase().includes(filterCategory.toLowerCase())) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.QR_Number.toLowerCase().includes(q) ||
        n.Need_Type.toLowerCase().includes(q) ||
        n.Description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusLabel = (status: string) => {
    if (isTa) {
      if (status === 'Pending') return 'நிலுவையில்';
      if (status === 'In Progress') return 'நடைமுறையில்';
      if (status === 'Fulfilled') return 'நிறைவுற்றது';
    }
    return status;
  };

  const getPriorityLabel = (priority: string) => {
    if (isTa) {
      if (priority === 'Urgent') return 'மிக அவசரம் (Urgent)';
      if (priority === 'High') return 'அதி முன்னுரிமை (High)';
      if (priority === 'Medium') return 'நடுத்தர முன்னுரிமை';
      if (priority === 'Low') return 'சாதாரண முன்னுரிமை';
    }
    return priority;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-emerald-600" />
            {t.needsAssessmentTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {currentUser.Role === 'GN_Officer' || currentUser.Role === 'GN Officer'
              ? `${t.showingDivisions}: ${currentUser.Division} (${filteredNeeds.length} ${isTa ? 'தேவைகள்' : 'needs'})`
              : `${t.allDivisionsScope} (${filteredNeeds.length} ${isTa ? 'தேவைகள்' : 'needs'})`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Need / Service Demand Button */}
          <button
            onClick={() => {
              setModalError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isTa ? '+ தேவைகளை கோரல் / பதிவு செய்க' : '+ Log Community Need / Request'}</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isTa ? 'QR எண் அல்லது தேவையைத் தேடுக...' : 'Search by QR number, need type, or details...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Public Assistance / Service Filter (Requirement) */}
          <div className="sm:col-span-3">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer focus:outline-none"
            >
              <option value="ALL">{isTa ? 'அனைத்து 08 சேவைகளும்' : 'All 8 Public Services'}</option>
              {publicServicesCatalog.map(srv => (
                <option key={srv.id} value={srv.defaultNeed}>
                  {srv.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer focus:outline-none"
            >
              <option value="ALL">{isTa ? 'அனைத்து நிலைகளும்' : 'All Statuses'}</option>
              <option value="Pending">{getStatusLabel('Pending')}</option>
              <option value="In Progress">{getStatusLabel('In Progress')}</option>
              <option value="Fulfilled">{getStatusLabel('Fulfilled')}</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer focus:outline-none"
            >
              <option value="ALL">{isTa ? 'அனைத்து முன்னுரிமைகளும்' : 'All Priorities'}</option>
              <option value="Urgent">{getPriorityLabel('Urgent')}</option>
              <option value="High">{getPriorityLabel('High')}</option>
              <option value="Medium">{getPriorityLabel('Medium')}</option>
              <option value="Low">{getPriorityLabel('Low')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Needs Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNeeds.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-xl text-slate-400">
            <ListTodo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">
              {isTa ? 'தேவைகள் எதுவும் இல்லை.' : 'No community needs matching this filter.'}
            </p>
          </div>
        ) : (
          filteredNeeds.map(need => {
            const family = families.find(f => f.QR_Number.toUpperCase() === need.QR_Number.toUpperCase());
            return (
              <div
                key={need.Need_ID}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-emerald-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 block leading-snug">
                      {need.Need_Type}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                      need.Priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                      need.Priority === 'High' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {getPriorityLabel(need.Priority)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {need.Description}
                  </p>
                  {need.Remarks && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                      {isTa ? 'குறிப்பு:' : 'Note:'} {need.Remarks}
                    </p>
                  )}
                </div>
                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      {family ? (
                        <button
                          onClick={() => onSelectFamily(family)}
                          className="font-mono font-bold text-slate-900 hover:text-emerald-700 hover:underline block cursor-pointer"
                        >
                          {need.QR_Number} • {family.Family_Name}
                        </button>
                      ) : (
                        <span className="font-mono text-slate-700 font-bold">{need.QR_Number}</span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {family ? family.Division_Name : 'Vaharai'} • {need.Assessment_Date}
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      need.Status === 'Fulfilled' ? 'bg-emerald-100 text-emerald-800' :
                      need.Status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {getStatusLabel(need.Status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    {need.Status !== 'Fulfilled' && (
                      <button
                        onClick={() => handleUpdateStatus(need.Need_ID, 'Fulfilled')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>{isTa ? 'நிறைவு' : 'Fulfill'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Log New Need / Public Assistance Demand */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {isTa ? 'புதிய தேவையை கோரல் / பதிவு செய்தல்' : 'Log Community Need / Public Service Request'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNeed} className="p-5 overflow-y-auto space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Family QR */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  {isTa ? 'குடும்ப QR எண் அல்லது குடும்பத்தைத் தெரிவு செய்க: *' : 'Family QR Number or Select Household: *'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formQR}
                    onChange={e => setFormQR(e.target.value.toUpperCase())}
                    placeholder="e.g. VHR-PCK-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <select
                    onChange={e => setFormQR(e.target.value)}
                    value=""
                    className="px-2 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs cursor-pointer text-slate-700"
                  >
                    <option value="" disabled>{isTa ? 'பட்டியலிருந்து தெரிவு' : 'Pick Family'}</option>
                    {families.map(f => (
                      <option key={f.Family_ID} value={f.QR_Number}>
                        {f.QR_Number} - {f.Family_Name} ({f.Division_Name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Public Assistance / Service Dropdown (Requirement: மக்களுக்கான உதவி ரொப்டவுனில் சுருக்கமாக சேர்) */}
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1.5">
                <label className="block font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-emerald-700" />
                  <span>{isTa ? 'மக்களுக்கான உதவி / தேவை வகை (ரொப்டவுன்): *' : 'Public Assistance / Need Category (Dropdown): *'}</span>
                </label>
                <select
                  value={formNeedType}
                  onChange={e => setFormNeedType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                >
                  {publicServicesCatalog.map(srv => (
                    <option key={srv.id} value={srv.defaultNeed}>
                      {srv.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  {isTa ? 'கோரப்படும் தேவை / உதவி விபரம் *' : 'Requirement Details / Narrative *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder={isTa ? 'கோரப்படும் உதவி அல்லது ஆவணத்தின் விபரங்களை உள்ளிடவும்...' : 'Describe the identified need or required service...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    {isTa ? 'முன்னுரிமை நிலை:' : 'Priority Level:'}
                  </label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as Need['Priority'])}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                  >
                    <option value="Urgent">{getPriorityLabel('Urgent')}</option>
                    <option value="High">{getPriorityLabel('High')}</option>
                    <option value="Medium">{getPriorityLabel('Medium')}</option>
                    <option value="Low">{getPriorityLabel('Low')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    {isTa ? 'குறிப்புரை (விரும்பினால்):' : 'Remarks / Reference:'}
                  </label>
                  <input
                    type="text"
                    value={formRemarks}
                    onChange={e => setFormRemarks(e.target.value)}
                    placeholder={isTa ? 'ஆவண இலக்கம் / குறிப்பு' : 'File reference or remarks'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  {isTa ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {isTa ? 'தேவையைச் சேமி' : 'Save Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeedsAssessmentView;
