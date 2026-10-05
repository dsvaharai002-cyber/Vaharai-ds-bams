import React, { useState, useMemo } from 'react';
import { Family, FamilyMember, User, FamilyVulnerabilityProfile, AswesumaCategory } from '../types';
import { StorageService } from '../services/storageService';
import { Language } from '../utils/translations';
import {
  UserPlus,
  X,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Sparkles,
  GraduationCap,
  HeartPulse,
  DollarSign,
  Package,
  Building,
  Users2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AddMemberModalProps {
  family: Family;
  currentUser: User;
  currentLang?: Language;
  onClose: () => void;
  onMemberAdded: (member: FamilyMember) => void;
  onRequestTransfer?: (oldNIC: string, qrNumber: string) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  family,
  currentUser,
  currentLang = 'ta',
  onClose,
  onMemberAdded,
  onRequestTransfer
}) => {
  const isTa = currentLang === 'ta';

  const [formData, setFormData] = useState({
    Registration_Number: StorageService.generateUniqueRegistrationNumber('REG-MEM'),
    NIC_Elder_ID: '',
    Is_Temp_NIC: false,
    Aswesuma_Category: (family.Aswesuma_Category || 'Not selected') as AswesumaCategory,
    Name: '',
    Relationship: 'Spouse',
    DOB: '',
    Gender: 'Female' as FamilyMember['Gender'],
    Occupation: '',
    Monthly_Income: '',
    Education: 'G.C.E. O/L',
    Highland_Extent: '',
    Paddy_Extent: '',
    Land_BLR_Deed_No: '',
    Disability: 'No' as 'Yes' | 'No',
    Elderly: 'No' as 'Yes' | 'No'
  });

  const [error, setError] = useState<string | null>(null);
  const [conflictMember, setConflictMember] = useState<FamilyMember | null>(null);
  const [showVulnSection, setShowVulnSection] = useState(true);
  const [activeVulnTab, setActiveVulnTab] = useState<'all' | 'education' | 'health' | 'economic' | 'assets' | 'housing' | 'demography'>('all');
  const [vulnData, setVulnData] = useState<FamilyVulnerabilityProfile>(() => ({
    education_level: family.vulnerability?.education_level || '',
    non_schooling_children_count: family.vulnerability?.non_schooling_children_count || 0,
    chronic_illness_members: family.vulnerability?.chronic_illness_members || false,
    chronic_illness_details: family.vulnerability?.chronic_illness_details || '',
    disabled_members: family.vulnerability?.disabled_members || false,
    disabled_count: family.vulnerability?.disabled_count || 0,
    monthly_per_capita_income: family.vulnerability?.monthly_per_capita_income,
    monthly_per_capita_expenditure: family.vulnerability?.monthly_per_capita_expenditure,
    electricity_under_60_units: family.vulnerability?.electricity_under_60_units || false,
    no_house_land_ownership: family.vulnerability?.no_house_land_ownership || false,
    no_other_building_ownership: family.vulnerability?.no_other_building_ownership || false,
    no_cultivable_highland_half_acre: family.vulnerability?.no_cultivable_highland_half_acre || false,
    no_cultivable_paddy_one_acre: family.vulnerability?.no_cultivable_paddy_one_acre || false,
    no_mobility_asset: family.vulnerability?.no_mobility_asset || false,
    no_economic_activity_asset: family.vulnerability?.no_economic_activity_asset || false,
    no_livelihood_livestock_asset: family.vulnerability?.no_livelihood_livestock_asset || false,
    is_shanty_lineroom: family.vulnerability?.is_shanty_lineroom || false,
    no_permanent_wall_floor_roof: family.vulnerability?.no_permanent_wall_floor_roof || false,
    floor_area_under_500sqft: family.vulnerability?.floor_area_under_500sqft || false,
    no_clean_drinking_water: family.vulnerability?.no_clean_drinking_water || false,
    no_adequate_sanitation: family.vulnerability?.no_adequate_sanitation || false,
    no_electricity_access: family.vulnerability?.no_electricity_access || false,
    dependency_ratio_high: family.vulnerability?.dependency_ratio_high || false,
    is_single_parent: family.vulnerability?.is_single_parent || false
  }));

  // Requirement 06: Calculate age from DOB
  const calculatedAge = useMemo(() => {
    if (!formData.DOB) return null;
    const dob = new Date(formData.DOB);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  }, [formData.DOB]);

  const isAdult = calculatedAge !== null && calculatedAge >= 18;

  const handleNICChange = (val: string) => {
    setFormData(prev => ({ ...prev, NIC_Elder_ID: val }));
    setError(null);
    setConflictMember(null);

    // Requirement 08: NIC duplicate check
    if (val.trim().length >= 4) {
      const allMembers = StorageService.getMembers();
      const existing = allMembers.find(
        m => m.NIC_Elder_ID && m.NIC_Elder_ID.toLowerCase().trim() === val.toLowerCase().trim()
      );
      if (existing) {
        setConflictMember(existing);
        if (existing.QR_Number.toUpperCase() === family.QR_Number.toUpperCase()) {
          setError(
            isTa
              ? `இந்த அடையாள அட்டை எண் (${val}) ஏற்கனவே இக்குடும்பத்தில் (${existing.Name}) பதிவு செய்யப்பட்டுள்ளது.`
              : `This NIC is already registered in this family for: ${existing.Name}`
          );
        } else {
          setError(
            isTa
              ? `இந்த அடையாள அட்டை எண் (${val}) ஏற்கனவே வேறு குடும்பத்தில் (${existing.QR_Number} - ${existing.Name}) உள்ளது. ஒரே அடையாள அட்டை எண் 02 இடங்களில் வர முடியாது.`
              : `This NIC (${val}) is already linked to another QR (${existing.QR_Number} - ${existing.Name}). The same NIC cannot appear in two places.`
          );
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Requirement 06: DOB is mandatory
    if (!formData.DOB) {
      setError(
        isTa
          ? 'பிறந்த ஆண்டு திகதி கட்டாயமாகும். தயவுசெய்து பிறந்த திகதியைத் தெரிவுசெய்யவும்.'
          : 'Date of birth is mandatory. Please provide member date of birth.'
      );
      return;
    }

    // Requirement 02 & 06: If age >= 18 and no NIC is available, issue System Temporary NIC automatically
    let effectiveNic = formData.NIC_Elder_ID.trim();
    let effectiveIsTempNic = formData.Is_Temp_NIC;
    if (isAdult && !effectiveNic) {
      effectiveNic = StorageService.generateTemporaryNIC(family.Division_Name);
      effectiveIsTempNic = true;
    }

    try {
      const created = StorageService.addFamilyMember(currentUser, {
        Registration_Number: formData.Registration_Number,
        QR_Number: family.QR_Number,
        NIC_Elder_ID: effectiveNic,
        Is_Temp_NIC: effectiveIsTempNic,
        Aswesuma_Category: formData.Aswesuma_Category,
        Name: formData.Name.trim(),
        Relationship: formData.Relationship,
        DOB: formData.DOB,
        Gender: formData.Gender,
        Occupation: formData.Occupation,
        Monthly_Income: Number(formData.Monthly_Income) || 0,
        Education: formData.Education,
        Highland_Extent: formData.Highland_Extent.trim(),
        Paddy_Extent: formData.Paddy_Extent.trim(),
        Land_BLR_Deed_No: formData.Land_BLR_Deed_No.trim(),
        Disability: formData.Disability,
        Elderly: calculatedAge !== null && calculatedAge >= 60 ? 'Yes' : formData.Elderly
      });
      StorageService.updateFamily(currentUser, {
        Family_ID: family.Family_ID,
        Aswesuma_Category: formData.Aswesuma_Category,
        vulnerability: vulnData
      });
      onMemberAdded(created);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(isTa ? 'உறுப்பினரைப் பதிவு செய்வதில் பிழை ஏற்பட்டது.' : 'Failed to add member.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isTa ? 'குடும்ப உறுப்பினர் பதிவு' : 'Add Family Member'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {isTa ? 'குடும்ப QR எண்: ' : 'Family QR: '}
                <strong className="text-emerald-700">{family.QR_Number}</strong> • {family.Family_Name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold">{error}</p>
                {conflictMember && onRequestTransfer && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequestTransfer(formData.NIC_Elder_ID, family.QR_Number);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-900 underline hover:text-rose-700 cursor-pointer"
                  >
                    <span>{isTa ? 'இடமாற்றக் கோரிக்கையை முதன்மை நிர்வாகிக்கு சமர்ப்பிக்க' : 'Submit Transfer Request to Super Admin'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Unique Registration System Number */}
          <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-indigo-950">
              {isTa ? 'சிஸ்டம் தனிப் பதிவு இலக்கம்:' : 'System Unique Registration No:'}
            </span>
            <span className="font-mono font-black text-xs px-2.5 py-1 bg-white text-indigo-900 rounded border border-indigo-300">
              {formData.Registration_Number}
            </span>
          </div>

          {/* Member Name & Relationship */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isTa ? 'உறுப்பினர் முழுப் பெயர்' : 'Full Member Name'} <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={isTa ? 'உதா: சிவகுரு தவமலர்' : 'e.g. Sivaguru Thavamalar'}
                value={formData.Name}
                onChange={e => setFormData({ ...formData, Name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isTa ? 'குடும்பத் தலைவருடனான உறவு' : 'Relationship to Head'} <span className="text-rose-600">*</span>
              </label>
              <select
                value={formData.Relationship}
                onChange={e => setFormData({ ...formData, Relationship: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
              >
                <option value="Head of Family">{isTa ? 'குடும்பத் தலைவர் (Head of Family)' : 'Head of Family'}</option>
                <option value="Spouse">{isTa ? 'மனைவி / கணவர் (Spouse)' : 'Spouse'}</option>
                <option value="Son">{isTa ? 'மகன் (Son)' : 'Son'}</option>
                <option value="Daughter">{isTa ? 'மகள் (Daughter)' : 'Daughter'}</option>
                <option value="Father">{isTa ? 'தந்தை (Father)' : 'Father'}</option>
                <option value="Mother">{isTa ? 'தாய் (Mother)' : 'Mother'}</option>
                <option value="Brother">{isTa ? 'சகோதரன் (Brother)' : 'Brother'}</option>
                <option value="Sister">{isTa ? 'சகோதரி (Sister)' : 'Sister'}</option>
                <option value="Grandparent">{isTa ? 'பேரன் / பேத்தி / முதியோர்' : 'Grandparent'}</option>
                <option value="Other Relative">{isTa ? 'ஏனைய உறவினர்' : 'Other Relative'}</option>
              </select>
            </div>
          </div>

          {/* Requirement 01: Aswesuma Beneficiary Question */}
          <div>
            <label className="block text-xs font-bold text-emerald-900 mb-1">
              {isTa ? 'குறித்த நபர் அஸ்வெசும பயனாளியா? (Aswesuma Category)' : 'Is this person an Aswesuma Beneficiary?'}{' '}
              <span className="text-rose-600">*</span>
            </label>
            <select
              value={formData.Aswesuma_Category}
              onChange={e => setFormData({ ...formData, Aswesuma_Category: e.target.value as AswesumaCategory })}
              className="w-full px-3 py-2 text-xs font-bold border-2 border-emerald-400 rounded-lg bg-emerald-50/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              <option value="Severely Poor">Severely Poor (மிகவும் வறியவர்)</option>
              <option value="Poor">Poor (வறியவர்)</option>
              <option value="Vulnerable">Vulnerable (இடர்பாட்டுக்குள்ளானவர்)</option>
              <option value="Not selected">Not selected (தெரிவு செய்யப்படவில்லை)</option>
            </select>
          </div>

          {/* Requirement 06: Date of Birth is MANDATORY */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {isTa ? 'பிறந்த ஆண்டு / திகதி' : 'Date of Birth (DOB)'} <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.DOB}
                onChange={e => setFormData({ ...formData, DOB: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
              />
              {calculatedAge !== null && (
                <div className="mt-1 text-[11px] font-bold">
                  <span className={`px-2 py-0.5 rounded ${
                    isAdult ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {isTa ? `கணிக்கப்பட்ட வயது: ${calculatedAge} ஆண்டுகள்` : `Calculated Age: ${calculatedAge} yrs`}
                    {isAdult ? (isTa ? ' (18+ வயது)' : ' (18+ Adult)') : (isTa ? ' (18 வயதுக்குட்பட்டவர்)' : ' (Minor)')}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isTa ? 'பாலினம்' : 'Gender'}
              </label>
              <select
                value={formData.Gender}
                onChange={e => setFormData({ ...formData, Gender: e.target.value as FamilyMember['Gender'] })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
              >
                <option value="Female">{isTa ? 'பெண் (Female)' : 'Female'}</option>
                <option value="Male">{isTa ? 'ஆண் (Male)' : 'Male'}</option>
                <option value="Other">{isTa ? 'மற்றையோர் (Other)' : 'Other'}</option>
              </select>
            </div>
          </div>

          {/* Requirement 02, 06 & 08: National Identity Card (NIC) with System Temp ID for 18+ without NIC */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                {isTa ? 'தேசிய அடையாள அட்டை (NIC)' : 'National Identity Card (NIC)'}{' '}
                {isAdult ? (
                  <span className="text-rose-600 font-bold">*</span>
                ) : (
                  <span className="text-slate-400 font-normal">({isTa ? '18-க்குள் வெறுமையாக விடலாம்' : 'Optional for <18'})</span>
                )}
              </label>
              {isAdult && (
                <button
                  type="button"
                  onClick={() => {
                    const tempId = StorageService.generateTemporaryNIC(family.Division_Name);
                    setFormData(prev => ({
                      ...prev,
                      NIC_Elder_ID: tempId,
                      Is_Temp_NIC: true
                    }));
                    setError(null);
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                >
                  {isTa ? '+ NIC இல்லை (தற்காலிக இலக்கம் வழங்கு)' : '+ No NIC (Issue System Temp ID)'}
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder={
                isAdult
                  ? (isTa ? 'NIC எண் (இல்லையெனில் தற்காலிக இலக்கம் அழுத்தவும்)' : 'Enter NIC or click Issue Temp ID')
                  : (isTa ? '18 வயதுக்கு குறைந்தோருக்கு வெறுமையாக விடலாம்' : 'Leave blank for minor under 18')
              }
              value={formData.NIC_Elder_ID}
              onChange={e => {
                const val = e.target.value;
                setFormData(prev => ({ ...prev, Is_Temp_NIC: val.startsWith('TMP-NIC-') }));
                handleNICChange(val);
              }}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 font-mono ${
                formData.Is_Temp_NIC
                  ? 'border-amber-400 bg-amber-50/40 text-amber-900 font-bold focus:ring-amber-500'
                  : isAdult
                  ? 'border-emerald-400 bg-emerald-50/20 focus:ring-emerald-500'
                  : 'border-slate-300 focus:ring-slate-700'
              }`}
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              {formData.Is_Temp_NIC
                ? (isTa ? '✓ சிஸ்டத்தினால் வழங்கப்பட்ட தற்காலிக அடையாள இலக்கம்' : '✓ System Temporary ID assigned')
                : (isTa
                  ? '18+ வயதுடையோருக்கு தேசிய அடையாள அட்டை இல்லையெனில் சிஸ்டம் தற்காலிக இலக்கம் வழங்கும்.'
                  : 'System issues a Temporary ID if an 18+ adult does not have an NIC.')}
            </span>
          </div>

          {/* Requirement 07: Land details (Highland, Paddy Land, and BLR / Deed No) */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
              <MapPin className="w-4 h-4 text-amber-700" />
              <span>{isTa ? 'தனிநபருக்குரிய காணி விபரங்கள் (மேட்டுக்காணி, வயல்காணி & BLR / ஒப்பம்):' : 'Individual Land Ownership Records (Highland, Paddy & BLR / Deed):'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isTa ? 'மேட்டுக்காணி பரப்பு' : 'Highland Extent'}
                </label>
                <input
                  type="text"
                  placeholder={isTa ? 'உதா: 20 பேர்ச் / 0.5 ஏக்கர்' : 'e.g. 20 Perches / 0.5 Acre'}
                  value={formData.Highland_Extent}
                  onChange={e => setFormData({ ...formData, Highland_Extent: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isTa ? 'வயல்காணி பரப்பு' : 'Paddy Land Extent'}
                </label>
                <input
                  type="text"
                  placeholder={isTa ? 'உதா: 1 ஏக்கர் / 2 லாஹம்' : 'e.g. 1 Acre / 2 Laha'}
                  value={formData.Paddy_Extent}
                  onChange={e => setFormData({ ...formData, Paddy_Extent: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isTa ? 'பி.எல்.ஆர் / ஒப்ப / அனுமதி இலக்கம்' : 'BLR / Deed / Permit No'}
                </label>
                <input
                  type="text"
                  placeholder={isTa ? 'உதா: BLR-1234 அல்லது ஒப்பம் #567' : 'e.g. BLR-1234 or Deed #567'}
                  value={formData.Land_BLR_Deed_No}
                  onChange={e => setFormData({ ...formData, Land_BLR_Deed_No: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Occupation & Monthly Income */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isTa ? 'தொழில்' : 'Occupation'}
              </label>
              <input
                type="text"
                placeholder={isTa ? 'உதா: கடற்றொழில், விவசாயம், மாணவர்' : 'e.g. Fisherman, Farmer, Student'}
                value={formData.Occupation}
                onChange={e => setFormData({ ...formData, Occupation: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isTa ? 'மாத வருமானம் (LKR)' : 'Monthly Income (LKR)'}
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.Monthly_Income}
                onChange={e => setFormData({ ...formData, Monthly_Income: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isTa ? 'கல்வித் தகைமை' : 'Education Level'}
            </label>
            <input
              type="text"
              placeholder="e.g. Primary, Grade 9, G.C.E. O/L, G.C.E. A/L, Higher"
              value={formData.Education}
              onChange={e => setFormData({ ...formData, Education: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Disability & Elderly */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isTa ? 'விசேட தேவை / இயலாமை நிலை' : 'Disability Status'}
              </label>
              <select
                value={formData.Disability}
                onChange={e => setFormData({ ...formData, Disability: e.target.value as 'Yes' | 'No' })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="No">{isTa ? 'இயலாமை இல்லை' : 'No Disability'}</option>
                <option value="Yes">{isTa ? 'விசேட தேவையுடையோர்' : 'Person with Disability'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isTa ? 'முதியோர் வகை (60+)' : 'Elderly Category'}
              </label>
              <select
                value={formData.Elderly}
                onChange={e => setFormData({ ...formData, Elderly: e.target.value as 'Yes' | 'No' })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="No">{isTa ? '60 வயதுக்கு குறைவு' : 'Under 60 years'}</option>
                <option value="Yes">{isTa ? 'முதியோர் (60+ வயது)' : 'Elderly (60+ years)'}</option>
              </select>
            </div>
          </div>

          {/* Requirement 04: All 6 Additional Vulnerability Indicator Categories */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {isTa ? 'மேலதிக இடர்பாட்டுக் குறிகாட்டிகள் (6 வகைகள்)' : 'Additional Vulnerability Indicators (6 Categories)'}
                  </span>
                  <span className="text-[10px] text-emerald-800">
                    {isTa ? 'கல்வி, சுகாதாரம், பொருளாதாரம், சொத்துக்கள், வீட்டுவசதி & குடித்தொகை' : 'Education, Health, Economic, Assets, Housing & Demography'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVulnSection(!showVulnSection)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 rounded-lg cursor-pointer"
              >
                <span>{showVulnSection ? (isTa ? 'மறைக்க' : 'Hide') : (isTa ? 'விரிவாக்கு' : 'Expand')}</span>
                {showVulnSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showVulnSection && (
              <div className="space-y-3 pt-2 border-t border-emerald-200/70">
                <div className="flex flex-wrap gap-1 p-1 bg-white rounded-lg border border-emerald-200">
                  {[
                    { id: 'all', label: isTa ? 'அனைத்தும் (6)' : 'All (6)', icon: Sparkles },
                    { id: 'education', label: isTa ? 'கல்வி' : 'Education', icon: GraduationCap },
                    { id: 'health', label: isTa ? 'சுகாதாரம்' : 'Health', icon: HeartPulse },
                    { id: 'economic', label: isTa ? 'பொருளாதாரம்' : 'Economic', icon: DollarSign },
                    { id: 'assets', label: isTa ? 'சொத்துக்கள்' : 'Assets', icon: Package },
                    { id: 'housing', label: isTa ? 'வீட்டுவசதி' : 'Housing', icon: Building },
                    { id: 'demography', label: isTa ? 'குடித்தொகை' : 'Demography', icon: Users2 }
                  ].map(tab => {
                    const IconComp = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveVulnTab(tab.id as typeof activeVulnTab)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer ${
                          activeVulnTab === tab.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <IconComp className="w-3 h-3" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {(activeVulnTab === 'all' || activeVulnTab === 'education') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="font-bold text-emerald-800">1. {isTa ? 'கல்வி (Education)' : 'Education'}</div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {isTa ? 'பாடசாலை செல்லாத பிள்ளைகளின் எண்ணிக்கை' : 'Non-schooling children count'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={vulnData.non_schooling_children_count || 0}
                        onChange={e => setVulnData({ ...vulnData, non_schooling_children_count: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                )}

                {(activeVulnTab === 'all' || activeVulnTab === 'health') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="font-bold text-rose-700">2. {isTa ? 'சுகாதாரம் (Health)' : 'Health'}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vulnData.chronic_illness_members || false}
                        onChange={e => setVulnData({ ...vulnData, chronic_illness_members: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{isTa ? 'நாட்பட்ட / பாரதூரமான நோயினால் பாதிக்கப்பட்டவர்' : 'Member with chronic illness'}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vulnData.disabled_members || false}
                        onChange={e => setVulnData({ ...vulnData, disabled_members: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{isTa ? 'விசேட தேவையுடையோர் / இயலாமை கொண்டோர்' : 'Member with disability'}</span>
                    </label>
                  </div>
                )}

                {(activeVulnTab === 'all' || activeVulnTab === 'economic') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="font-bold text-amber-800">3. {isTa ? 'பொருளாதாரம் (Economic)' : 'Economic'}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vulnData.electricity_under_60_units || false}
                        onChange={e => setVulnData({ ...vulnData, electricity_under_60_units: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{isTa ? 'மாதாந்த மின்சாரப் பாவனை 60 அலகுகளுக்கு குறைவு' : 'Monthly electricity under 60 units'}</span>
                    </label>
                  </div>
                )}

                {(activeVulnTab === 'all' || activeVulnTab === 'assets') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="font-bold text-indigo-800">4. {isTa ? 'சொத்துக்கள் (Assets)' : 'Assets'}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vulnData.no_house_land_ownership || false}
                        onChange={e => setVulnData({ ...vulnData, no_house_land_ownership: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{isTa ? 'சொந்த வீடு / காணி அற்றது' : 'No house/land ownership'}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vulnData.no_livelihood_livestock_asset || false}
                        onChange={e => setVulnData({ ...vulnData, no_livelihood_livestock_asset: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{isTa ? 'கால்நடைச் சொத்துக்கள் அற்றது' : 'No livestock assets'}</span>
                    </label>
                  </div>
                )}

                {(activeVulnTab === 'all' || activeVulnTab === 'housing') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="font-bold text-sky-800">5. {isTa ? 'வீட்டுவசதி (Housing)' : 'Housing'}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vulnData.no_clean_drinking_water || false}
                        onChange={e => setVulnData({ ...vulnData, no_clean_drinking_water: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{isTa ? 'சுத்தமான குடிநீர் வசதி அற்றது' : 'No clean drinking water'}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vulnData.no_adequate_sanitation || false}
                        onChange={e => setVulnData({ ...vulnData, no_adequate_sanitation: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{isTa ? 'மலசலகூட வசதி அற்றது' : 'No sanitation / toilet'}</span>
                    </label>
                  </div>
                )}

                {(activeVulnTab === 'all' || activeVulnTab === 'demography') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="font-bold text-purple-800">6. {isTa ? 'குடித்தொகை (Demography)' : 'Demography'}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vulnData.dependency_ratio_high || false}
                        onChange={e => setVulnData({ ...vulnData, dependency_ratio_high: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{isTa ? 'அதிக தங்கியிருப்போர் விகிதம் (> 0.64)' : 'High dependency ratio (> 0.64)'}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vulnData.is_single_parent || false}
                        onChange={e => setVulnData({ ...vulnData, is_single_parent: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>{isTa ? 'தனிப் பெற்றோர் / பெண் தலைமைத்துவக் குடும்பம்' : 'Single parent / Female-headed'}</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {isTa ? 'ரத்து' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {isTa ? 'உறுப்பினரைப் பதிவு செய்க' : 'Register Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

