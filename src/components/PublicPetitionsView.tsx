import React, { useState, useMemo } from 'react';
import {
  PublicPetition,
  PetitionDepartment,
  PetitionStatus,
  PetitionType,
  GNDivision,
  User,
} from '../types';
import { Language, translations } from '../translations/i18n';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Compass,
  Printer,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Calendar,
  X,
  Eye,
  Trash2,
  Edit,
  ArrowRight,
  Send,
  Building,
} from 'lucide-react';
import { savePetitions, recordDeletedId } from '../services/storage';

interface PublicPetitionsViewProps {
  petitions: PublicPetition[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdatePetitions: (items: PublicPetition[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const DEPARTMENT_OPTIONS: {
  value: PetitionDepartment;
  labelTa: string;
  labelEn: string;
  icon: string;
}[] = [
  { value: 'LAND', labelTa: 'காணிப் பிரிவு (Land Branch)', labelEn: 'Land Branch', icon: '🗺️' },
  { value: 'ASWESUMA_SAMURDHI', labelTa: 'அஸ்வெசும & சமுர்த்தி (Aswesuma & Samurdhi)', labelEn: 'Aswesuma & Samurdhi', icon: '🌾' },
  { value: 'ELDERLY', labelTa: 'முதியோர் நலன்புரி (Elderly Welfare)', labelEn: 'Elderly Welfare', icon: '👴' },
  { value: 'DISABILITY', labelTa: 'மாற்றுத்திறனாளிகள் நலன்புரி (Disability Welfare)', labelEn: 'Disability Welfare', icon: '♿' },
  { value: 'MATERNITY', labelTa: 'கர்ப்பிணித் தாய்மார் & போசணை (Maternity & Nutrition)', labelEn: 'Maternity & Nutrition', icon: '👶' },
  { value: 'GRAMA_NILADHARI', labelTa: 'கிராம அலுவலர் நிர்வாகம் (Grama Niladhari Unit)', labelEn: 'Grama Niladhari Unit', icon: '🏛️' },
  { value: 'PLANNING', labelTa: 'திட்டமிடல் கிளை (Planning Branch)', labelEn: 'Planning Branch', icon: '📊' },
  { value: 'GENERAL_ADMIN', labelTa: 'பொது நிர்வாகம் / பிரதேச செயலாளர் (Divisional Secretary / Admin)', labelEn: 'Divisional Secretary / Admin', icon: '⚖️' },
];

export const PublicPetitionsView: React.FC<PublicPetitionsViewProps> = ({
  petitions,
  divisions,
  currentUser,
  lang,
  onUpdatePetitions,
  onAuditLog,
}) => {
  const t = translations[lang];

  // RBAC permissions
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isAdmin = currentUser.role === 'ADMIN 1' || currentUser.role === 'ADMIN 2' || isSuperAdmin;
  const isGramaNiladhari = currentUser.role === 'GRAMANIILATHARI';
  const isLandOfficer = currentUser.role === 'LAND_OFFICER';
  const isElderlyOfficer = currentUser.role === 'ELDERLY_OFFICER';
  const isMaternityOfficer = currentUser.role === 'MATERNITY_OFFICER' || currentUser.role === 'ECDO';
  const isDisabilityOfficer = currentUser.role === 'DISABILITY_OFFICER';

  // Determine officer's primary department
  const officerDefaultDepartment: PetitionDepartment | 'ALL' = useMemo(() => {
    if (isAdmin) return 'ALL';
    if (isLandOfficer) return 'LAND';
    if (isElderlyOfficer) return 'ELDERLY';
    if (isMaternityOfficer) return 'MATERNITY';
    if (isDisabilityOfficer) return 'DISABILITY';
    if (isGramaNiladhari) return 'ALL';
    return 'ALL';
  }, [isAdmin, isLandOfficer, isElderlyOfficer, isMaternityOfficer, isDisabilityOfficer, isGramaNiladhari]);

  // Filters State
  const [selectedDept, setSelectedDept] = useState<PetitionDepartment | 'ALL'>(officerDefaultDepartment);
  const [selectedDivision, setSelectedDivision] = useState<string>(isGramaNiladhari ? currentUser.division || '211' : 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<PetitionStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<PetitionType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPetitionForAction, setSelectedPetitionForAction] = useState<PublicPetition | null>(null);
  const [printingPetition, setPrintingPetition] = useState<PublicPetition | null>(null);

  // Form State for New Request / Complaint
  const [formType, setFormType] = useState<PetitionType>('REQUEST');
  const [formDept, setFormDept] = useState<PetitionDepartment>(
    officerDefaultDepartment !== 'ALL' ? officerDefaultDepartment : 'LAND'
  );
  const [formNic, setFormNic] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDivision, setFormDivision] = useState(isGramaNiladhari ? currentUser.division || '211' : '211');
  const [formPriority, setFormPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTokenNo, setFormTokenNo] = useState('');

  // Action / Status Update Form state
  const [actionStatus, setActionStatus] = useState<PetitionStatus>('INQUIRY');
  const [actionOfficer, setActionOfficer] = useState(currentUser.name);
  const [actionInquiryDate, setActionInquiryDate] = useState(new Date().toISOString().slice(0, 10));
  const [actionInquiryNotes, setActionInquiryNotes] = useState('');
  const [actionFieldDate, setActionFieldDate] = useState(new Date().toISOString().slice(0, 10));
  const [actionFieldOfficer, setActionFieldOfficer] = useState('');
  const [actionFieldFindings, setActionFieldFindings] = useState('');
  const [actionDecision, setActionDecision] = useState('');
  const [actionResolvedDate, setActionResolvedDate] = useState(new Date().toISOString().slice(0, 10));

  // Open Action Modal
  const handleOpenActionModal = (pet: PublicPetition) => {
    setSelectedPetitionForAction(pet);
    setActionStatus(pet.status === 'PENDING' ? 'INQUIRY' : pet.status);
    setActionOfficer(pet.assignedOfficer || currentUser.name);
    setActionInquiryDate(pet.inquiryDate || new Date().toISOString().slice(0, 10));
    setActionInquiryNotes(pet.inquiryNotes || '');
    setActionFieldDate(pet.fieldInspectionDate || new Date().toISOString().slice(0, 10));
    setActionFieldOfficer(pet.fieldInspectionOfficer || '');
    setActionFieldFindings(pet.fieldInspectionFindings || '');
    setActionDecision(pet.resolutionDecision || '');
    setActionResolvedDate(pet.resolvedDate || new Date().toISOString().slice(0, 10));
  };

  // Submit Action Update
  const handleSaveActionUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetitionForAction) return;

    const updated = petitions.map((p) => {
      if (p.id === selectedPetitionForAction.id) {
        return {
          ...p,
          status: actionStatus,
          assignedOfficer: actionOfficer.trim(),
          inquiryDate: actionStatus === 'INQUIRY' || actionInquiryNotes ? actionInquiryDate : p.inquiryDate,
          inquiryNotes: actionInquiryNotes.trim() || p.inquiryNotes,
          fieldInspectionDate: actionStatus === 'FIELD_INSPECTION' || actionFieldFindings ? actionFieldDate : p.fieldInspectionDate,
          fieldInspectionOfficer: actionFieldOfficer.trim() || p.fieldInspectionOfficer,
          fieldInspectionFindings: actionFieldFindings.trim() || p.fieldInspectionFindings,
          resolutionDecision: actionStatus === 'RESOLVED' || actionStatus === 'REJECTED' ? actionDecision.trim() : p.resolutionDecision,
          resolvedDate: actionStatus === 'RESOLVED' || actionStatus === 'REJECTED' ? actionResolvedDate : p.resolvedDate,
          resolvedBy: actionStatus === 'RESOLVED' || actionStatus === 'REJECTED' ? currentUser.name : p.resolvedBy,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    savePetitions(updated);
    onUpdatePetitions(updated);
    onAuditLog(
      'UPDATE_PETITION_STATUS',
      `Updated petition ${selectedPetitionForAction.id} to [${actionStatus}] by ${currentUser.name}`
    );
    setSelectedPetitionForAction(null);
  };

  // Delete petition
  const handleDeletePetition = (pet: PublicPetition) => {
    if (!isAdmin) {
      alert(lang === 'ta' ? 'அழிக்க அட்மின் அனுமதி தேவை.' : 'Admin permission required to delete.');
      return;
    }
    const confirmDelete = window.confirm(
      lang === 'ta'
        ? `"${pet.subject}" (${pet.id}) கோரிக்கை/முறைப்பாட்டை நிச்சயமாக அழிக்க விரும்புகிறீர்களா?`
        : `Delete petition ${pet.id}?`
    );
    if (!confirmDelete) return;

    recordDeletedId(pet.id, pet.citizenNic);
    const updated = petitions.filter((p) => p.id !== pet.id);
    savePetitions(updated);
    onUpdatePetitions(updated);
    onAuditLog('DELETE_PETITION', `Deleted petition ${pet.id} (${pet.subject})`);
  };

  // Save New Petition
  const handleSaveNewPetition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim() || !formNic.trim() || !formName.trim()) {
      alert(lang === 'ta' ? 'தலைப்பு, NIC மற்றும் பெயர் கட்டாயம் தேவை!' : 'Subject, NIC and Name are required!');
      return;
    }

    const prefix = formType === 'REQUEST' ? 'REQ' : 'CMP';
    const year = new Date().getFullYear();
    const newId = `${prefix}-${formDivision}-${year}-${String(petitions.length + 1).padStart(3, '0')}`;

    const newPetition: PublicPetition = {
      id: newId,
      tokenNumber: formTokenNo.trim() || undefined,
      citizenNic: formNic.trim().toUpperCase(),
      citizenName: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      divisionCode: formDivision,
      targetDepartment: formDept,
      requestType: formType,
      subject: formSubject.trim(),
      description: formDescription.trim(),
      submittedDate: new Date().toISOString().slice(0, 10),
      status: 'PENDING',
      priority: formPriority,
      assignedOfficer: currentUser.name,
      assignedOfficerRole: currentUser.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newPetition, ...petitions];
    savePetitions(updated);
    onUpdatePetitions(updated);
    onAuditLog(
      'REGISTER_PUBLIC_PETITION',
      `Registered ${formType} [${newId}] for ${newPetition.citizenName} in ${formDept}`
    );

    // Reset Form
    setFormSubject('');
    setFormDescription('');
    setFormNic('');
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormTokenNo('');
    setShowAddModal(false);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return petitions.filter((p) => {
      // Role enforcement: specific department officers can only see their department
      if (isLandOfficer && p.targetDepartment !== 'LAND') return false;
      if (isElderlyOfficer && p.targetDepartment !== 'ELDERLY') return false;
      if (isMaternityOfficer && p.targetDepartment !== 'MATERNITY') return false;
      if (isDisabilityOfficer && p.targetDepartment !== 'DISABILITY') return false;
      if (isGramaNiladhari && currentUser.division && p.divisionCode !== currentUser.division) return false;

      // User UI filters
      if (selectedDept !== 'ALL' && p.targetDepartment !== selectedDept) return false;
      if (selectedDivision !== 'ALL' && p.divisionCode !== selectedDivision) return false;
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
      if (selectedType !== 'ALL' && p.requestType !== selectedType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mId = p.id.toLowerCase().includes(q);
        const mNic = p.citizenNic.toLowerCase().includes(q);
        const mName = p.citizenName.toLowerCase().includes(q);
        const mSub = p.subject.toLowerCase().includes(q);
        const mPhone = p.phone?.includes(q);
        return mId || mNic || mName || mSub || mPhone;
      }

      return true;
    });
  }, [
    petitions,
    isLandOfficer,
    isElderlyOfficer,
    isMaternityOfficer,
    isDisabilityOfficer,
    isGramaNiladhari,
    currentUser,
    selectedDept,
    selectedDivision,
    selectedStatus,
    selectedType,
    searchQuery,
  ]);

  // Statistics
  const counts = useMemo(() => {
    return {
      total: petitions.length,
      pending: petitions.filter((p) => p.status === 'PENDING').length,
      inquiry: petitions.filter((p) => p.status === 'INQUIRY').length,
      field: petitions.filter((p) => p.status === 'FIELD_INSPECTION').length,
      resolved: petitions.filter((p) => p.status === 'RESOLVED').length,
    };
  }, [petitions]);

  return (
    <div className="space-y-6">
      {/* Official Top Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                {lang === 'ta' ? 'பொதுமக்கள் குறைகேள் & கோரிக்கைகள் பிரிவு' : 'Public Grievance Redress System'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                16 GN Divisions & Central DS
              </span>
            </div>
            <h1 className="text-lg font-black text-slate-900 mt-1">
              {lang === 'ta'
                ? 'பொதுமக்கள் கோரிக்கைகள் & முறைப்பாடுகள் முகாமைத்துவம்'
                : 'Public Requests, Petitions & Complaints Registry'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === 'ta'
                ? 'காணி, அஸ்வெசும, முதியோர், கர்ப்பிணி, மாற்றுத்திறனாளி உள்ளிட்ட அனைத்து பிரிவுகளுக்கான விசாரணை, கள ஆய்வு மற்றும் தீர்வு கண்காணிப்பு'
                : 'Comprehensive cross-departmental petitions tracking: Inquiries, Field Inspections, and Official Resolutions'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ta' ? 'அறிக்கை அச்சிடுக' : 'Print Register'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-700 hover:bg-amber-800 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ta' ? 'புதிய கோரிக்கை / முறைப்பாடு பதிவு' : 'Register New Petition'}</span>
          </button>
        </div>
      </div>

      {/* Status Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500">மொத்த பதிவுகள்</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{counts.total}</div>
          </div>
          <Building className="w-5 h-5 text-slate-400" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between bg-amber-50/40">
          <div>
            <div className="text-[11px] font-bold text-amber-800">நிலுவையில் (Pending)</div>
            <div className="text-lg font-black text-amber-900 mt-0.5">{counts.pending}</div>
          </div>
          <Clock className="w-5 h-5 text-amber-600" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs flex items-center justify-between bg-blue-50/40">
          <div>
            <div className="text-[11px] font-bold text-blue-800">விசாரணையில் (Inquiry)</div>
            <div className="text-lg font-black text-blue-900 mt-0.5">{counts.inquiry}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-blue-600" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs flex items-center justify-between bg-purple-50/40">
          <div>
            <div className="text-[11px] font-bold text-purple-800">கள ஆய்வு (Field Visit)</div>
            <div className="text-lg font-black text-purple-900 mt-0.5">{counts.field}</div>
          </div>
          <Compass className="w-5 h-5 text-purple-600" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between bg-emerald-50/40 col-span-2 sm:col-span-1">
          <div>
            <div className="text-[11px] font-bold text-emerald-800">தீர்க்கப்பட்டது (Resolved)</div>
            <div className="text-lg font-black text-emerald-900 mt-0.5">{counts.resolved}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={lang === 'ta' ? 'பதிவு எண், NIC, பெயர், தொலைபேசி அல்லது தலைப்பு...' : 'Search by ID, NIC, Name, Phone or Subject...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter (if authorized) */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value as any)}
            className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
          >
            <option value="ALL">{lang === 'ta' ? 'அனைத்து பிரிவுகளும் (All Depts)' : 'All Departments'}</option>
            {DEPARTMENT_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.icon} {lang === 'ta' ? d.labelTa : d.labelEn}
              </option>
            ))}
          </select>

          {/* Division Filter */}
          {!isGramaNiladhari && (
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">{t.allDivisions} (16 Divisions)</option>
              {divisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.nameTa}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
          >
            <option value="ALL">{lang === 'ta' ? 'அனைத்து நிலைகளும்' : 'All Statuses'}</option>
            <option value="PENDING">🟡 {lang === 'ta' ? 'நிலுவையில் (Pending)' : 'Pending'}</option>
            <option value="INQUIRY">🔵 {lang === 'ta' ? 'விசாரணையில் (Inquiry)' : 'Inquiry'}</option>
            <option value="FIELD_INSPECTION">🟣 {lang === 'ta' ? 'கள ஆய்வு (Field Inspection)' : 'Field Inspection'}</option>
            <option value="RESOLVED">🟢 {lang === 'ta' ? 'தீர்க்கப்பட்டது (Resolved)' : 'Resolved'}</option>
            <option value="REJECTED">🔴 {lang === 'ta' ? 'நிராகரிக்கப்பட்டது (Rejected)' : 'Rejected'}</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">{lang === 'ta' ? 'கோரிக்கை & முறைப்பாடு' : 'All Types'}</option>
            <option value="REQUEST">{lang === 'ta' ? 'கோரிக்கை (Request)' : 'Request'}</option>
            <option value="COMPLAINT">{lang === 'ta' ? 'முறைப்பாடு (Complaint)' : 'Complaint'}</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4">பதிவு எண் & திகதி</th>
                <th className="py-3 px-4">பிரஜை விபரம் (NIC & பெயர்)</th>
                <th className="py-3 px-4">பிரிவு & துறை</th>
                <th className="py-3 px-4">விடயம் & சுருக்கம்</th>
                <th className="py-3 px-4">நடப்பு நிலைமை</th>
                <th className="py-3 px-4">கள ஆய்வு / விசாரணை முடிவு</th>
                <th className="py-3 px-4 text-right">செயல்கள்</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">கோரிக்கைகள் அல்லது முறைப்பாடுகள் எதுவும் இல்லை</p>
                    <p className="text-[11px] mt-1">புதிய கோரிக்கையை பதிவு செய்ய மேலே உள்ள பொத்தானை அழுத்தவும்.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => {
                  const deptObj = DEPARTMENT_OPTIONS.find((d) => d.value === p.targetDepartment);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{p.id}</span>
                          {p.priority === 'URGENT' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-100 text-red-800 font-black">
                              அவசரம்
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{p.submittedDate}</span>
                        </div>
                        {p.tokenNumber && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold mt-1 inline-block">
                            டோக்கன்: {p.tokenNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.citizenName}</div>
                        <div className="font-mono text-[11px] font-semibold text-emerald-900 mt-0.5">
                          {p.citizenNic}
                        </div>
                        {p.phone && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            ☎️ {p.phone}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {p.divisionCode} - {divisions.find((d) => d.code === p.divisionCode)?.nameTa || p.divisionCode}
                        </div>
                        <div className="mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                            <span>{deptObj?.icon || '🏢'}</span>
                            <span>{lang === 'ta' ? deptObj?.labelTa : deptObj?.labelEn}</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={p.subject}>
                          {p.subject}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed" title={p.description}>
                          {p.description}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        {p.status === 'PENDING' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>நிலுவையில் (Pending)</span>
                          </span>
                        )}
                        {p.status === 'INQUIRY' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>விசாரணையில் (Inquiry)</span>
                          </span>
                        )}
                        {p.status === 'FIELD_INSPECTION' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1">
                            <Compass className="w-3 h-3" />
                            <span>கள ஆய்வு (Field Visit)</span>
                          </span>
                        )}
                        {p.status === 'RESOLVED' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>தீர்க்கப்பட்டது (Resolved)</span>
                          </span>
                        )}
                        {p.status === 'REJECTED' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1">
                            <X className="w-3 h-3" />
                            <span>நிராகரிக்கப்பட்டது (Rejected)</span>
                          </span>
                        )}
                        {p.assignedOfficer && (
                          <div className="text-[10px] text-slate-500 mt-1 font-medium">
                            பொறுப்பு: {p.assignedOfficer}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {p.status === 'RESOLVED' && p.resolutionDecision ? (
                          <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-1.5 rounded border border-emerald-200">
                            ✓ {p.resolutionDecision}
                            <div className="text-[9px] text-slate-500 mt-0.5">முடிவு திகதி: {p.resolvedDate}</div>
                          </div>
                        ) : p.status === 'FIELD_INSPECTION' && p.fieldInspectionFindings ? (
                          <div className="text-[11px] text-purple-900 bg-purple-50 p-1.5 rounded border border-purple-200">
                            🔍 {p.fieldInspectionFindings}
                            <div className="text-[9px] text-slate-500 mt-0.5">கள அலுவலர்: {p.fieldInspectionOfficer || p.assignedOfficer}</div>
                          </div>
                        ) : p.status === 'INQUIRY' && p.inquiryNotes ? (
                          <div className="text-[11px] text-blue-900 bg-blue-50 p-1.5 rounded border border-blue-200">
                            ⚖️ {p.inquiryNotes}
                            <div className="text-[9px] text-slate-500 mt-0.5">விசாரணை திகதி: {p.inquiryDate}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">நடவடிக்கை ஆரம்பிக்கப்படவில்லை</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setPrintingPetition(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold shadow-xs cursor-pointer"
                          title="பற்றுச்சீட்டு அச்சிடுக"
                        >
                          <Printer className="w-3.5 h-3.5 inline mr-1" />
                          <span>பற்றுச்சீட்டு</span>
                        </button>
                        <button
                          onClick={() => handleOpenActionModal(p)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shadow-xs cursor-pointer"
                        >
                          நடவடிக்கை / தீர்வு
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeletePetition(p)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-bold border border-rose-200 cursor-pointer"
                            title="அழிக்க"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register New Petition / Complaint */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 sm:p-4 flex justify-center items-start sm:items-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-amber-950 text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-300" />
                <h3 className="text-sm font-bold">
                  {lang === 'ta' ? 'புதிய பொதுமக்கள் கோரிக்கை / முறைப்பாடு பதிவு' : 'Register New Public Petition'}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPetition} className="overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">வகை (Petition Type) *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="REQUEST">📝 கோரிக்கை (Public Request)</option>
                    <option value="COMPLAINT">⚠️ முறைப்பாடு (Grievance / Complaint)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">முன்னுரிமை (Priority)</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="NORMAL">சாதாரண (Normal)</option>
                    <option value="HIGH">உயர் முன்னுரிமை (High)</option>
                    <option value="URGENT">🚨 அவசரம் (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">சம்பந்தப்பட்ட பிரிவு / துறை (Target Department) *</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800"
                >
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.icon} {lang === 'ta' ? d.labelTa : d.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">பிரஜையின் முழுப் பெயர் *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. சின்னப்பு விஜயகுமார்"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">தேசிய அடையாள அட்டை (NIC) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 891902697V"
                    value={formNic}
                    onChange={(e) => setFormNic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">கிராம அலுவலர் பிரிவு *</label>
                  <select
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    disabled={isGramaNiladhari}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {divisions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nameTa}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">தொலைபேசி இலக்கம்</label>
                  <input
                    type="text"
                    placeholder="077xxxxxxx"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">டோக்கன் எண் (விருப்பத்தெரிவு)</label>
                  <input
                    type="text"
                    placeholder="e.g. T-102"
                    value={formTokenNo}
                    onChange={(e) => setFormTokenNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">முகவரி</label>
                <input
                  type="text"
                  placeholder="வீட்டு முகவரி"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">கோரிக்கை / முறைப்பாட்டின் தலைப்பு *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. அரச விவசாய காணி எல்லை சர்ச்சை தொடர்பான கள ஆய்வு கோரிக்கை"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">முழுமையான விபரம் *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="பிரச்சினை, கோரப்படும் பரிகாரம் அல்லது விசாரணைக்கான காரணங்களை தெளிவாக உள்ளிடவும்..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>பதிவு செய்க</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Action / Inquiry / Field Inspection / Resolution */}
      {selectedPetitionForAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 sm:p-4 flex justify-center items-start sm:items-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-slate-900 text-white rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-400" />
                  <span>நடவடிக்கை & தீர்வு முகாமைத்துவம் ({selectedPetitionForAction.id})</span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {selectedPetitionForAction.citizenName} ({selectedPetitionForAction.citizenNic})
                </p>
              </div>
              <button onClick={() => setSelectedPetitionForAction(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActionUpdate} className="overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-slate-900">{selectedPetitionForAction.subject}</div>
                <div className="text-slate-600 text-[11px] mt-1">{selectedPetitionForAction.description}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">தற்போதைய நிலை (Status Decision) *</label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-sm"
                >
                  <option value="PENDING">🟡 நிலுவையில் (Pending)</option>
                  <option value="INQUIRY">🔵 விசாரணைக்கு உட்படுத்தப்பட்டுள்ளது (Inquiry Scheduled)</option>
                  <option value="FIELD_INSPECTION">🟣 கள ஆய்வு மேற்கொள்ளப்படுகிறது (Field Inspection)</option>
                  <option value="RESOLVED">🟢 தீர்க்கப்பட்டு முடிவு எட்டப்பட்டது (Resolved)</option>
                  <option value="REJECTED">🔴 நிராகரிக்கப்பட்டது (Rejected)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">பொறுப்பான உத்தியோகத்தர் (Assigned Officer)</label>
                <input
                  type="text"
                  value={actionOfficer}
                  onChange={(e) => setActionOfficer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Inquiry Details Box */}
              {(actionStatus === 'INQUIRY' || actionStatus === 'FIELD_INSPECTION' || actionStatus === 'RESOLVED') && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <div className="font-bold text-blue-950 flex items-center gap-1.5">
                    <span>⚖️</span>
                    <span>விசாரணை விபரங்கள் (Inquiry Notes)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-blue-900 font-medium">விசாரணை திகதி</label>
                      <input
                        type="date"
                        value={actionInquiryDate}
                        onChange={(e) => setActionInquiryDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-300 rounded-lg bg-white font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-blue-900 font-medium">விசாரணை குறிப்பு / அழைப்பு முடிவு</label>
                    <textarea
                      rows={2}
                      placeholder="விசாரணையில் கூறப்பட்ட விபரங்கள், சமர்ப்பிக்கப்பட்ட ஆவணங்கள்..."
                      value={actionInquiryNotes}
                      onChange={(e) => setActionInquiryNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-blue-300 rounded-lg bg-white text-xs"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Field Inspection Details Box */}
              {(actionStatus === 'FIELD_INSPECTION' || actionStatus === 'RESOLVED') && (
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                  <div className="font-bold text-purple-950 flex items-center gap-1.5">
                    <span>🔍</span>
                    <span>கள ஆய்வு அறிக்கைகள் (Field Inspection Findings)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-purple-900 font-medium">கள ஆய்வு திகதி</label>
                      <input
                        type="date"
                        value={actionFieldDate}
                        onChange={(e) => setActionFieldDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-purple-900 font-medium">கள ஆய்வு உத்தியோகத்தர்</label>
                      <input
                        type="text"
                        placeholder="e.g. கள உத்தியோகத்தர் / GN"
                        value={actionFieldOfficer}
                        onChange={(e) => setActionFieldOfficer(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-purple-900 font-medium">கள ஆய்வின் முடிவுகள் & அவதானிப்புகள்</label>
                    <textarea
                      rows={2}
                      placeholder="நேரில் சென்று பார்வையிட்ட நிலைமை, எல்லை அளவு, குடும்ப நிலைமை..."
                      value={actionFieldFindings}
                      onChange={(e) => setActionFieldFindings(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white text-xs"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Final Resolution Box */}
              {(actionStatus === 'RESOLVED' || actionStatus === 'REJECTED') && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>இறுதி முடிவு / தீர்வு (Resolution Decision)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-emerald-900 font-medium">தீர்வு திகதி</label>
                    <input
                      type="date"
                      value={actionResolvedDate}
                      onChange={(e) => setActionResolvedDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-emerald-900 font-medium">பிரதேச செயலகத்தின் உத்தியோகபூர்வ முடிவு</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="பிரஜைக்கு வழங்கப்பட்ட உத்தியோகபூர்வ தீர்வு அல்லது பரிந்துரை..."
                      value={actionDecision}
                      onChange={(e) => setActionDecision(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white text-xs font-semibold"
                    ></textarea>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPetitionForAction(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  சேமித்து புதுப்பிக்க
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {printingPetition && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 flex justify-center items-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div id="printable-petition-receipt" className="space-y-4 bg-white p-4">
              <div className="text-center border-b pb-3 border-slate-300">
                <div className="text-[11px] font-bold text-slate-700">இலங்கை ஜனநாயக சோசலிசக் குடியரசு</div>
                <div className="font-black text-sm text-slate-950 mt-0.5">
                  கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகம்
                </div>
                <div className="text-xs font-bold text-amber-900 mt-1">
                  பொதுமக்கள் கோரிக்கை / முறைப்பாடு பற்றுச்சீட்டு (Petition Receipt)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-b pb-3 border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">பதிவு இலக்கம்:</span>
                  <div className="font-mono font-bold text-slate-950">{printingPetition.id}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">பதிவு செய்த திகதி:</span>
                  <div className="font-mono text-slate-950">{printingPetition.submittedDate}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">பிரஜையின் பெயர்:</span>
                  <div className="font-bold text-slate-950">{printingPetition.citizenName}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">அடையாள அட்டை (NIC):</span>
                  <div className="font-mono font-bold text-slate-950">{printingPetition.citizenNic}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">கிராம அலுவலர் பிரிவு:</span>
                  <div className="font-bold text-slate-950">{printingPetition.divisionCode}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">துறை / பிரிவு:</span>
                  <div className="font-bold text-slate-950">{printingPetition.targetDepartment}</div>
                </div>
              </div>

              <div className="text-xs">
                <div className="font-bold text-slate-900">விடயம்: {printingPetition.subject}</div>
                <div className="text-slate-600 mt-1 text-[11px] leading-relaxed">{printingPetition.description}</div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="font-bold text-slate-800">
                  தற்போதைய நிலை: <span className="text-amber-800">{printingPetition.status}</span>
                </div>
                {printingPetition.resolutionDecision && (
                  <div className="mt-1 text-[11px] text-emerald-800 font-semibold">
                    முடிவு: {printingPetition.resolutionDecision}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
                உங்கள் கோரிக்கையின் நிலையை அறிய மேற்படி பதிவு இலக்கத்துடன் பிரதேச செயலக கருமபீடத்தை தொடர்பு கொள்ளவும்.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 mt-4 no-print">
              <button
                onClick={() => setPrintingPetition(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                மூடுக
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>அச்சிடுக</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
