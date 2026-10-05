import React, { useState } from 'react';
import { Family, User, FamilyVulnerabilityProfile, AswesumaCategory } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import {
  Home,
  X,
  AlertCircle,
  GraduationCap,
  HeartPulse,
  DollarSign,
  Package,
  Building,
  Users2,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface RegisterFamilyModalProps {
  currentUser: User;
  currentLang?: Language;
  onClose: () => void;
  onFamilyCreated: (family: Family) => void;
}

export const RegisterFamilyModal: React.FC<RegisterFamilyModalProps> = ({
  currentUser,
  currentLang = 'en',
  onClose,
  onFamilyCreated
}) => {
  const t = TRANSLATIONS[currentLang];
  const divisions = StorageService.getDivisions();
  const isGnOfficer = currentUser.Role === 'GN Officer' || currentUser.Role === 'GN_Officer' || currentUser.Division !== 'ALL';
  const defaultDiv = isGnOfficer ? currentUser.Division : divisions[0]?.Division_Name || 'Panichchankerni';

  const getSuggestedQR = (divName: string) => {
    const div = divisions.find(d => d.Division_Name === divName);
    const code = div ? div.Division_Name.substring(0, 3).toUpperCase() : 'VHR';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `VHR-${code}-${randomSuffix}`;
  };

  const [formData, setFormData] = useState({
    Registration_Number: StorageService.generateUniqueRegistrationNumber('REG-VHR'),
    QR_Number: getSuggestedQR(defaultDiv),
    Division_Name: defaultDiv,
    Family_Name: '',
    Head_DOB: '',
    Head_NIC: '',
    Is_Temp_NIC: false,
    Aswesuma_Category: 'Not selected' as AswesumaCategory,
    Head_Gender: 'Male' as 'Male' | 'Female' | 'Other',
    Head_Occupation: '',
    Highland_Extent: '',
    Paddy_Extent: '',
    Land_BLR_Deed_No: '',
    Address: '',
    Telephone: '',
    Family_Size: '4',
    Monthly_Income: '25000',
    Housing_Status: 'Semi-permanent' as Family['Housing_Status'],
    Priority_Level: 'High' as Family['Priority_Level'],
    is_female_headed: false,
    no_toilet: false,
    no_drinking_water_well: false,
    no_house: false
  });

  // Requirement 06: Calculate age from Head_DOB
  const calculatedHeadAge = React.useMemo(() => {
    if (!formData.Head_DOB) return null;
    const dob = new Date(formData.Head_DOB);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  }, [formData.Head_DOB]);

  const isHeadAdult = calculatedHeadAge !== null && calculatedHeadAge >= 18;

  const handleHeadNICChange = (val: string) => {
    setFormData(prev => ({ ...prev, Head_NIC: val }));
    setError(null);
    if (val.trim().length >= 4) {
      const allMembers = StorageService.getMembers();
      const existing = allMembers.find(
        m => m.NIC_Elder_ID && m.NIC_Elder_ID.trim().toLowerCase() === val.trim().toLowerCase()
      );
      if (existing) {
        setError(
          currentLang === 'ta'
            ? `இந்த தேசிய அடையாள அட்டை எண் (${val}) ஏற்கனவே ${existing.QR_Number} (${existing.Name}) பதிவில் உள்ளது. ஒரே அடையாள அட்டை இலக்கம் 02 இடங்களில் வர முடியாது.`
            : `This NIC (${val}) is already registered under ${existing.QR_Number} (${existing.Name}). Duplicate NIC is not allowed.`
        );
      }
    }
  };

  const [showOptionalVulnerability, setShowOptionalVulnerability] = useState(true);
  const [activeVulnTab, setActiveVulnTab] = useState<'all' | 'education' | 'health' | 'economic' | 'assets' | 'housing' | 'demography'>('all');
  const [vulnData, setVulnData] = useState<FamilyVulnerabilityProfile>({
    education_level: '',
    non_schooling_children_count: 0,
    chronic_illness_members: false,
    chronic_illness_details: '',
    disabled_members: false,
    disabled_count: 0,
    monthly_per_capita_income: undefined,
    monthly_per_capita_expenditure: undefined,
    electricity_under_60_units: false,
    no_house_land_ownership: false,
    no_other_building_ownership: false,
    no_cultivable_highland_half_acre: false,
    no_cultivable_paddy_one_acre: false,
    no_mobility_asset: false,
    no_economic_activity_asset: false,
    no_livelihood_livestock_asset: false,
    is_shanty_lineroom: false,
    no_permanent_wall_floor_roof: false,
    floor_area_under_500sqft: false,
    no_clean_drinking_water: false,
    no_adequate_sanitation: false,
    no_electricity_access: false,
    dependency_ratio_high: false,
    is_single_parent: false
  });

  const [error, setError] = useState<string | null>(null);

  const handleDivisionChange = (divName: string) => {
    setFormData(prev => ({
      ...prev,
      Division_Name: divName,
      QR_Number: getSuggestedQR(divName)
    }));
  };

  const flaggedCount = [
    Boolean(vulnData.education_level && vulnData.education_level === 'No formal education'),
    (vulnData.non_schooling_children_count || 0) > 0,
    vulnData.chronic_illness_members,
    vulnData.disabled_members,
    vulnData.electricity_under_60_units,
    vulnData.no_house_land_ownership,
    vulnData.no_other_building_ownership,
    vulnData.no_cultivable_highland_half_acre,
    vulnData.no_cultivable_paddy_one_acre,
    vulnData.no_mobility_asset,
    vulnData.no_economic_activity_asset,
    vulnData.no_livelihood_livestock_asset,
    vulnData.is_shanty_lineroom,
    vulnData.no_permanent_wall_floor_roof,
    vulnData.floor_area_under_500sqft,
    vulnData.no_clean_drinking_water,
    vulnData.no_adequate_sanitation,
    vulnData.no_electricity_access,
    vulnData.dependency_ratio_high,
    vulnData.is_single_parent
  ].filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Requirement 06: DOB is mandatory
    if (!formData.Head_DOB) {
      setError(
        currentLang === 'ta'
          ? 'பிறந்த ஆண்டு திகதி கட்டாயமாகும். தயவுசெய்து பிறந்த திகதியைத் தெரிவுசெய்யவும்.'
          : 'Date of birth is mandatory.'
      );
      return;
    }

    // Requirement 02 & 06: If age >= 18 and no NIC is entered, either use generated Temp NIC or auto-generate System Temporary NIC
    let effectiveHeadNic = formData.Head_NIC.trim();
    let effectiveIsTempNic = formData.Is_Temp_NIC;
    if (isHeadAdult && !effectiveHeadNic) {
      effectiveHeadNic = StorageService.generateTemporaryNIC(formData.Division_Name);
      effectiveIsTempNic = true;
    }

    // Requirement 08: NIC cannot appear in two places
    if (effectiveHeadNic) {
      const allMembers = StorageService.getMembers();
      const existing = allMembers.find(
        m => m.NIC_Elder_ID && m.NIC_Elder_ID.trim().toLowerCase() === effectiveHeadNic.toLowerCase()
      );
      if (existing) {
        setError(
          currentLang === 'ta'
            ? `இந்த அடையாள அட்டை எண் (${effectiveHeadNic}) ஏற்கனவே ${existing.QR_Number} (${existing.Name}) பதிவில் உள்ளது. ஒரே அடையாள அட்டை இலக்கம் 02 இடங்களில் வர முடியாது.`
            : `This NIC (${effectiveHeadNic}) is already registered under ${existing.QR_Number} (${existing.Name}). Duplicate NIC is not allowed.`
        );
        return;
      }
    }

    try {
      const headSnapshot = {
        Registration_Number: formData.Registration_Number,
        NIC_Elder_ID: effectiveHeadNic,
        Is_Temp_NIC: effectiveIsTempNic,
        Aswesuma_Category: formData.Aswesuma_Category,
        Name: formData.Family_Name.trim(),
        DOB: formData.Head_DOB,
        Calculated_Age: calculatedHeadAge ?? undefined,
        Gender: formData.Head_Gender,
        Occupation: formData.Head_Occupation.trim() || 'Self-employed',
        Education: vulnData.education_level || 'G.C.E. O/L',
        Highland_Extent: formData.Highland_Extent.trim(),
        Paddy_Extent: formData.Paddy_Extent.trim(),
        Land_BLR_Deed_No: formData.Land_BLR_Deed_No.trim(),
        Disability: (vulnData.disabled_members ? 'Yes' : 'No') as 'Yes' | 'No'
      };

      const created = StorageService.addFamily(currentUser, {
        Registration_Number: formData.Registration_Number,
        QR_Number: formData.QR_Number,
        Family_Name: formData.Family_Name,
        Division_Name: formData.Division_Name,
        Address: formData.Address,
        Telephone: formData.Telephone,
        Family_Size: Number(formData.Family_Size) || 1,
        Monthly_Income: Number(formData.Monthly_Income) || 0,
        Housing_Status: formData.Housing_Status,
        Priority_Level: formData.Priority_Level,
        Aswesuma_Category: formData.Aswesuma_Category,
        vulnerability: vulnData,
        is_female_headed: formData.is_female_headed || formData.Head_Gender === 'Female',
        no_toilet: formData.no_toilet,
        no_drinking_water_well: formData.no_drinking_water_well,
        no_house: formData.no_house,
        headMemberSnapshot: headSnapshot
      });

      // Automatically register Head of Household in Family_Members with DOB, NIC/Temp NIC, Aswesuma, and Land Details
      StorageService.addFamilyMember(currentUser, {
        Registration_Number: formData.Registration_Number,
        QR_Number: created.QR_Number,
        NIC_Elder_ID: effectiveHeadNic,
        Is_Temp_NIC: effectiveIsTempNic,
        Aswesuma_Category: formData.Aswesuma_Category,
        Name: formData.Family_Name.trim(),
        Relationship: 'Head of Family',
        DOB: formData.Head_DOB,
        Gender: formData.Head_Gender,
        Occupation: formData.Head_Occupation.trim() || 'Self-employed',
        Monthly_Income: Number(formData.Monthly_Income) || 0,
        Education: vulnData.education_level || 'G.C.E. O/L',
        Highland_Extent: formData.Highland_Extent.trim(),
        Paddy_Extent: formData.Paddy_Extent.trim(),
        Land_BLR_Deed_No: formData.Land_BLR_Deed_No.trim(),
        Disability: vulnData.disabled_members ? 'Yes' : 'No',
        Elderly: calculatedHeadAge !== null && calculatedHeadAge >= 60 ? 'Yes' : 'No'
      });

      onFamilyCreated(created);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(currentLang === 'ta' ? 'குடும்பத்தைப் பதிவுசெய்வதில் பிழை ஏற்பட்டது.' : 'Failed to register family.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {currentLang === 'ta' ? 'புதிய பயனாளிக் குடும்பப் பதிவு' : 'Register Beneficiary Family'}
              </h3>
              <p className="text-xs text-slate-500">
                {currentLang === 'ta' ? 'அடிப்படை குடும்பத் தகவல்கள் & இடர்பாட்டுக் குறிகாட்டிகள்' : 'Core registry and optional socio-economic indicators'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
              1. {currentLang === 'ta' ? 'அடிப்படை குடும்ப விபரம் & தனிப் பதிவு இலக்கம்' : 'Core Household Details & Unique System ID'}
            </h4>

            {/* Requirement 02: Unique System Registration Number for every registration */}
            <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-indigo-950 block">
                  {currentLang === 'ta' ? 'சிஸ்டம் தனிப் பதிவு இலக்கம் (Unique Registration System No):' : 'System Unique Registration Number:'}
                </span>
                <span className="text-[10px] text-indigo-700">
                  {currentLang === 'ta' ? 'ஒவ்வொரு பதிவிற்கும் சிஸ்டத்தின் மூலம் வழங்கப்படும் தனித்துவ இலக்கம்' : 'Automatically generated unique serial number for this registration'}
                </span>
              </div>
              <span className="font-mono font-black text-xs px-3 py-1.5 bg-white text-indigo-900 rounded-md border border-indigo-300 shadow-2xs">
                {formData.Registration_Number}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.qrNumber} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.QR_Number}
                  onChange={e => setFormData({ ...formData, QR_Number: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-800 bg-emerald-50/30"
                  placeholder="VHR-XXX-000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.gnDivision} <span className="text-rose-600">*</span>
                </label>
                <select
                  disabled={isGnOfficer}
                  value={formData.Division_Name}
                  onChange={e => handleDivisionChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-600 cursor-pointer"
                >
                  {divisions.map(d => (
                    <option key={d.GN_Code || d.Division_ID} value={d.Division_Name}>
                      {d.GN_Code ? `${d.GN_Code} - ` : ''}{currentLang === 'ta' && d.Tamil_Name ? d.Tamil_Name : d.Division_Name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {currentLang === 'ta' ? 'குடும்பத்தின் பெயர் / தலைவர்' : 'Family Name / Head of Household'} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={currentLang === 'ta' ? 'உதா: சிவகுரு குடும்பம் (அல்லது குடும்பத் தலைவர் பெயர்)' : 'e.g. Sivaguru Family (or Household Head Name)'}
                  value={formData.Family_Name}
                  onChange={e => setFormData({ ...formData, Family_Name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Requirement 01: Aswesuma Beneficiary Question with 4 required dropdown options */}
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  {currentLang === 'ta'
                    ? 'குறித்த நபர் அஸ்வெசும பயனாளியா? (Aswesuma)'
                    : 'Is this person an Aswesuma Beneficiary?'}{' '}
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
            </div>

            {/* Requirement 02 & 06: Mandatory DOB & Conditional 18+ NIC with System Temporary NIC option */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === 'ta' ? 'பிறந்த ஆண்டு / திகதி' : 'Date of Birth (DOB)'} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.Head_DOB}
                  onChange={e => setFormData({ ...formData, Head_DOB: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                {calculatedHeadAge !== null && (
                  <div className="mt-1 text-[11px] font-bold">
                    <span className={`px-2 py-0.5 rounded ${
                      isHeadAdult ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {currentLang === 'ta' ? `வயது: ${calculatedHeadAge} ஆண்டுகள்` : `Age: ${calculatedHeadAge} yrs`}
                      {isHeadAdult ? (currentLang === 'ta' ? ' (18+ வயது)' : ' (18+ Adult)') : (currentLang === 'ta' ? ' (18 வயதுக்குட்பட்டவர்)' : ' (Minor)')}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {currentLang === 'ta' ? 'தேசிய அடையாள அட்டை (NIC)' : 'National Identity Card (NIC)'}{' '}
                    {isHeadAdult ? (
                      <span className="text-rose-600 font-bold">*</span>
                    ) : (
                      <span className="text-slate-400 font-normal">({currentLang === 'ta' ? '18-க்குள் வெறுமையாக விடலாம்' : 'Optional <18'})</span>
                    )}
                  </label>
                  {isHeadAdult && (
                    <button
                      type="button"
                      onClick={() => {
                        const tempId = StorageService.generateTemporaryNIC(formData.Division_Name);
                        setFormData(prev => ({
                          ...prev,
                          Head_NIC: tempId,
                          Is_Temp_NIC: true
                        }));
                        setError(null);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                      title={currentLang === 'ta' ? 'தேசிய அடையாள அட்டை இல்லை என்றால் தற்காலிக இலக்கம் வழங்குக' : 'Issue System Temporary ID if no NIC'}
                    >
                      {currentLang === 'ta' ? '+ NIC இல்லை (தற்காலிக இலக்கம்)' : '+ No NIC (Issue Temp ID)'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={
                    isHeadAdult
                      ? (currentLang === 'ta' ? 'NIC எண் (இல்லையெனில் தற்காலிக இலக்கம் அழுத்தவும்)' : 'Enter NIC or click Issue Temp ID')
                      : (currentLang === 'ta' ? '18 வயதுக்கு குறைந்தவர்களுக்கு தேவையில்லை' : 'Leave empty for under 18')
                  }
                  value={formData.Head_NIC}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, Is_Temp_NIC: val.startsWith('TMP-NIC-') }));
                    handleHeadNICChange(val);
                  }}
                  className={`w-full px-3 py-2 text-xs border rounded-lg bg-white focus:outline-none focus:ring-2 font-mono ${
                    formData.Is_Temp_NIC
                      ? 'border-amber-400 bg-amber-50/40 text-amber-900 font-bold focus:ring-amber-500'
                      : isHeadAdult
                      ? 'border-emerald-400 focus:ring-emerald-500'
                      : 'border-slate-300 focus:ring-slate-700'
                  }`}
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {formData.Is_Temp_NIC
                    ? (currentLang === 'ta' ? '✓ சிஸ்டத்தினால் வழங்கப்பட்ட தற்காலிக அடையாள இலக்கம்' : '✓ System-generated Temporary ID assigned')
                    : (currentLang === 'ta' ? '18+ வயதுடையோருக்கு NIC இல்லையெனில் சிஸ்டம் தற்காலிக இலக்கம் வழங்கும்.' : 'System issues a Temporary ID if 18+ adult has no NIC.')}
                </span>
              </div>
            </div>

            {/* Requirement 07: Land Ownership Records (Highland, Paddy Land & BLR/Deed No) */}
            <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2.5">
              <div className="text-xs font-bold text-amber-950">
                {currentLang === 'ta'
                  ? 'காணி விபரங்கள் (மேட்டுக்காணி, வயல்காணி & பி.எல்.ஆர் / ஒப்ப இலக்கம்):'
                  : 'Land Ownership Details (Highland, Paddy Land & BLR / Deed Number):'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {currentLang === 'ta' ? 'மேட்டுக்காணி பரப்பு' : 'Highland Extent'}
                  </label>
                  <input
                    type="text"
                    placeholder={currentLang === 'ta' ? 'உதா: 20 பேர்ச் / 0.5 ஏக்கர்' : 'e.g. 20 Perches'}
                    value={formData.Highland_Extent}
                    onChange={e => setFormData({ ...formData, Highland_Extent: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {currentLang === 'ta' ? 'வயல்காணி பரப்பு' : 'Paddy Land Extent'}
                  </label>
                  <input
                    type="text"
                    placeholder={currentLang === 'ta' ? 'உதா: 1 ஏக்கர் / 2 லாஹம்' : 'e.g. 1 Acre'}
                    value={formData.Paddy_Extent}
                    onChange={e => setFormData({ ...formData, Paddy_Extent: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {currentLang === 'ta' ? 'பி.எல்.ஆர் / ஒப்ப இலக்கம்' : 'BLR / Deed / Permit No'}
                  </label>
                  <input
                    type="text"
                    placeholder={currentLang === 'ta' ? 'உதா: BLR-1234 / ஒப்பம் #56' : 'e.g. BLR-1234'}
                    value={formData.Land_BLR_Deed_No}
                    onChange={e => setFormData({ ...formData, Land_BLR_Deed_No: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {currentLang === 'ta' ? 'வதிவிட முகவரி' : 'Residential Address'}
                </label>
                <input
                  type="text"
                  placeholder={currentLang === 'ta' ? 'வட்டாரம் 03, கடற்கரை வீதி' : 'e.g. Ward 03, Beach Road'}
                  value={formData.Address}
                  onChange={e => setFormData({ ...formData, Address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {currentLang === 'ta' ? 'தொலைபேசி எண்' : 'Contact Telephone'}
                </label>
                <input
                  type="tel"
                  placeholder="+94 7X XXX XXXX"
                  value={formData.Telephone}
                  onChange={e => setFormData({ ...formData, Telephone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {currentLang === 'ta' ? 'குடும்ப அளவு' : 'Family Size'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.Family_Size}
                  onChange={e => setFormData({ ...formData, Family_Size: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {currentLang === 'ta' ? 'மாத வருமானம் (LKR)' : 'Monthly Income'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={formData.Monthly_Income}
                  onChange={e => setFormData({ ...formData, Monthly_Income: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.priority}
                </label>
                <select
                  value={formData.Priority_Level}
                  onChange={e => setFormData({ ...formData, Priority_Level: e.target.value as Family['Priority_Level'] })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
                >
                  <option value="Critical">{currentLang === 'ta' ? 'மிக அவசரம் (Critical)' : 'Critical'}</option>
                  <option value="High">{currentLang === 'ta' ? 'அதி முன்னுரிமை (High)' : 'High'}</option>
                  <option value="Medium">{currentLang === 'ta' ? 'நடுத்தர முன்னுரிமை (Medium)' : 'Medium'}</option>
                  <option value="Normal">{currentLang === 'ta' ? 'சாதாரண (Normal)' : 'Normal'}</option>
                </select>
              </div>
            </div>

            {/* Quick check boxes for key vulnerabilities */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_female_headed}
                  onChange={e => setFormData({ ...formData, is_female_headed: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="text-[11px] font-semibold text-slate-800">👩 {currentLang === 'ta' ? 'பெண் தலைமை' : 'Female Headed'}</span>
              </label>
              <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.no_toilet}
                  onChange={e => setFormData({ ...formData, no_toilet: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="text-[11px] font-semibold text-slate-800">🚻 {currentLang === 'ta' ? 'மலசலகூடமில்லை' : 'No Toilet'}</span>
              </label>
              <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.no_drinking_water_well}
                  onChange={e => setFormData({ ...formData, no_drinking_water_well: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="text-[11px] font-semibold text-slate-800">💧 {currentLang === 'ta' ? 'குடிநீரில்லை' : 'No Well'}</span>
              </label>
              <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.no_house}
                  onChange={e => setFormData({ ...formData, no_house: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="text-[11px] font-semibold text-slate-800">🏚️ {currentLang === 'ta' ? 'வீடற்றவர்' : 'No House'}</span>
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {t.vulnerabilityAssessment}
                    </span>
                    <span className="text-[11px] text-emerald-800 font-medium">
                      {t.optionalIndicatorsNotice}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {flaggedCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono">
                      {flaggedCount} {currentLang === 'ta' ? 'குறிகாட்டிகள்' : 'flags'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowOptionalVulnerability(!showOptionalVulnerability)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>{showOptionalVulnerability ? (currentLang === 'ta' ? 'மறைக்க' : 'Hide') : (currentLang === 'ta' ? 'விரிவாக்கு' : 'Expand')}</span>
                    {showOptionalVulnerability ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {showOptionalVulnerability && (
                <div className="mt-4 pt-3 border-t border-emerald-200/70 space-y-4">
                  <div className="flex flex-wrap gap-1.5 p-1 bg-white rounded-lg border border-emerald-200">
                    <button
                      type="button"
                      onClick={() => setActiveVulnTab('all')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                        activeVulnTab === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{currentLang === 'ta' ? 'அனைத்தும் (6)' : 'All (6)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVulnTab('education')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                        activeVulnTab === 'education' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{t.vulnEducation}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVulnTab('health')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                        activeVulnTab === 'health' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>{t.vulnHealth}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVulnTab('economic')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                        activeVulnTab === 'economic' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{t.vulnEconomic}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVulnTab('assets')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                        activeVulnTab === 'assets' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{t.vulnAssets}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVulnTab('housing')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                        activeVulnTab === 'housing' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5" />
                      <span>{t.vulnHousing}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVulnTab('demography')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                        activeVulnTab === 'demography' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users2 className="w-3.5 h-3.5" />
                      <span>{t.vulnDemography}</span>
                    </button>
                  </div>

                  {(activeVulnTab === 'all' || activeVulnTab === 'education') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3.5 text-xs">
                      <div className="font-bold text-emerald-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <GraduationCap className="w-4 h-4" />
                        <span>1. {t.vulnEducation}</span>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">{t.educationLevel}</label>
                        <select
                          value={vulnData.education_level || ''}
                          onChange={e => setVulnData({ ...vulnData, education_level: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="">{currentLang === 'ta' ? 'தெரிவுசெய்க' : 'Select'}</option>
                          <option value="No formal education">{currentLang === 'ta' ? 'முறையான கல்வியில்லை (No formal education)' : 'No formal education'}</option>
                          <option value="Primary (Grade 1-5)">{currentLang === 'ta' ? 'ஆரம்பக் கல்வி (தரம் 1-5)' : 'Primary (Grade 1-5)'}</option>
                          <option value="Secondary (Grade 6-11)">{currentLang === 'ta' ? 'இடைநிலைக் கல்வி (தரம் 6-11)' : 'Secondary (Grade 6-11)'}</option>
                          <option value="G.C.E. O/L">{currentLang === 'ta' ? 'க.பொ.த சாதாரண தரம் (G.C.E. O/L)' : 'G.C.E. O/L'}</option>
                          <option value="G.C.E. A/L">{currentLang === 'ta' ? 'க.பொ.த உயர்தரம் (G.C.E. A/L)' : 'G.C.E. A/L'}</option>
                          <option value="Higher Education">{currentLang === 'ta' ? 'பல்கலைக்கழகம் / உயர் கல்வி' : 'Higher Education / Degree'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {currentLang === 'ta' ? 'பாடசாலை செல்லாத பிள்ளைகளின் எண்ணிக்கை' : 'Number of non-schooling children'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={vulnData.non_schooling_children_count || 0}
                          onChange={e => setVulnData({ ...vulnData, non_schooling_children_count: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {(activeVulnTab === 'all' || activeVulnTab === 'health') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <div className="font-bold text-rose-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <HeartPulse className="w-4 h-4" />
                        <span>2. {t.vulnHealth}</span>
                      </div>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.chronic_illness_members || false}
                          onChange={e => setVulnData({ ...vulnData, chronic_illness_members: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span className="font-semibold text-slate-800">
                          {currentLang === 'ta' ? 'நாட்பட்ட / பாரதூரமான நோயினால் பாதிக்கப்பட்ட உறுப்பினர்கள் உள்ளமை' : 'Household has members with chronic or critical illness'}
                        </span>
                      </label>
                      {vulnData.chronic_illness_members && (
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {currentLang === 'ta' ? 'நோய் விபரம் / சிகிச்சை விபரம்' : 'Illness / Treatment details'}
                          </label>
                          <input
                            type="text"
                            placeholder={currentLang === 'ta' ? 'உதா: சிறுநீரக நோய், புற்றுநோய், இருதய நோய்' : 'e.g. Chronic Kidney Disease, Cancer, Heart Disease'}
                            value={vulnData.chronic_illness_details || ''}
                            onChange={e => setVulnData({ ...vulnData, chronic_illness_details: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.disabled_members || false}
                          onChange={e => setVulnData({ ...vulnData, disabled_members: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span className="font-semibold text-slate-800">
                          {currentLang === 'ta' ? 'குடும்பத்தில் விசேட தேவையுடையோர் / இயலாமை கொண்ட நபர்கள் உள்ளமை' : 'Household has persons with disabilities'}
                        </span>
                      </label>
                      {vulnData.disabled_members && (
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {currentLang === 'ta' ? 'இயலாமை கொண்ட நபர்களின் எண்ணிக்கை' : 'Number of disabled members'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={vulnData.disabled_count || 1}
                            onChange={e => setVulnData({ ...vulnData, disabled_count: Number(e.target.value) || 1 })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {(activeVulnTab === 'all' || activeVulnTab === 'economic') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <div className="font-bold text-amber-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <DollarSign className="w-4 h-4" />
                        <span>3. {t.vulnEconomic}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {currentLang === 'ta' ? 'மாதாந்த ஆளொன்றுக்கான வருமானம் (LKR)' : 'Monthly Per-Capita Income (LKR)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 5000"
                            value={vulnData.monthly_per_capita_income || ''}
                            onChange={e => setVulnData({ ...vulnData, monthly_per_capita_income: Number(e.target.value) || undefined })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {currentLang === 'ta' ? 'மாதாந்த ஆளொன்றுக்கான செலவீனம் (LKR)' : 'Monthly Per-Capita Expenditure (LKR)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 6500"
                            value={vulnData.monthly_per_capita_expenditure || ''}
                            onChange={e => setVulnData({ ...vulnData, monthly_per_capita_expenditure: Number(e.target.value) || undefined })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.electricity_under_60_units || false}
                          onChange={e => setVulnData({ ...vulnData, electricity_under_60_units: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span className="font-semibold text-slate-800">
                          {currentLang === 'ta' ? 'மாதாந்த மின்சாரப் பாவனை 60 அலகுகளுக்கு (Units) குறைவாக இருத்தல்' : 'Monthly electricity consumption is under 60 units'}
                        </span>
                      </label>
                    </div>
                  )}

                  {(activeVulnTab === 'all' || activeVulnTab === 'assets') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-indigo-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Package className="w-4 h-4" />
                        <span>4. {t.vulnAssets}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold mb-1">
                        {currentLang === 'ta' ? 'சொத்துக்கள் இன்மை நிலையைக் குறிக்கவும் (Check if lacking assets):' : 'Indicate lack of assets:'}
                      </div>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_house_land_ownership || false}
                          onChange={e => setVulnData({ ...vulnData, no_house_land_ownership: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'வதிவிடக் காணி அல்லது சொந்த வீட்டு உரிமை அற்றது' : 'No residential house or land ownership'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_other_building_ownership || false}
                          onChange={e => setVulnData({ ...vulnData, no_other_building_ownership: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'வேறு எந்த வணிக / குடியிருப்பு கட்டட உரிமையும் அற்றது' : 'No other building / commercial asset ownership'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_cultivable_highland_half_acre || false}
                          onChange={e => setVulnData({ ...vulnData, no_cultivable_highland_half_acre: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'அரை ஏக்கருக்கு மேற்பட்ட பயிர் செய்யக்கூடிய மேட்டுக்காணி அற்றது' : 'No cultivable highland of 0.5 acre or more'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_cultivable_paddy_one_acre || false}
                          onChange={e => setVulnData({ ...vulnData, no_cultivable_paddy_one_acre: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'ஒரு ஏக்கருக்கு மேற்பட்ட பயிர் செய்யக்கூடிய வயல்காணி அற்றது' : 'No cultivable paddy land of 1.0 acre or more'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_mobility_asset || false}
                          onChange={e => setVulnData({ ...vulnData, no_mobility_asset: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'போக்குவரத்து / மோட்டார் வாகனம் அல்லது உழவு இயந்திரம் அற்றது' : 'No vehicle / motorcycle / tractor asset'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_economic_activity_asset || false}
                          onChange={e => setVulnData({ ...vulnData, no_economic_activity_asset: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'பொருளாதார வருமானம் ஈட்டும் இயந்திரங்கள் / உபகரணங்கள் அற்றது' : 'No machinery or income-generating economic equipment'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_livelihood_livestock_asset || false}
                          onChange={e => setVulnData({ ...vulnData, no_livelihood_livestock_asset: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'வாழ்வாதார கால்நடைகள் (மாடு, ஆடு போன்றவை) அற்றது' : 'No livestock or cattle assets'}</span>
                      </label>
                    </div>
                  )}

                  {(activeVulnTab === 'all' || activeVulnTab === 'housing') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-sky-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Building className="w-4 h-4" />
                        <span>5. {t.vulnHousing}</span>
                      </div>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.is_shanty_lineroom || false}
                          onChange={e => setVulnData({ ...vulnData, is_shanty_lineroom: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'குடிசை / வரிசை அறை / தற்காலிக வதிவிடம்' : 'Shanty / Lineroom / Temporary shelter'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_permanent_wall_floor_roof || false}
                          onChange={e => setVulnData({ ...vulnData, no_permanent_wall_floor_roof: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'நிரந்தர சுவர், நிரந்தர தரை மற்றும் கூரை அற்ற வீடு' : 'Lacks permanent wall, floor, or roof'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.floor_area_under_500sqft || false}
                          onChange={e => setVulnData({ ...vulnData, floor_area_under_500sqft: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'வீட்டின் மொத்தத் தரைப் பரப்பளவு 500 சதுர அடிக்குக் குறைவு' : 'Floor area is less than 500 sq. ft.'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_clean_drinking_water || false}
                          onChange={e => setVulnData({ ...vulnData, no_clean_drinking_water: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'சுத்தமான குடிநீர் வசதி அல்லது கிணறு அற்றது' : 'No access to clean drinking water or well'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_adequate_sanitation || false}
                          onChange={e => setVulnData({ ...vulnData, no_adequate_sanitation: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'சுகாதாரமான மலசலகூட வசதி அற்றது' : 'No access to adequate sanitation / toilet'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.no_electricity_access || false}
                          onChange={e => setVulnData({ ...vulnData, no_electricity_access: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'மின்சார இணைப்பு வசதி அற்றது' : 'No electricity access'}</span>
                      </label>
                    </div>
                  )}

                  {(activeVulnTab === 'all' || activeVulnTab === 'demography') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-purple-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Users2 className="w-4 h-4" />
                        <span>6. {t.vulnDemography}</span>
                      </div>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.dependency_ratio_high || false}
                          onChange={e => setVulnData({ ...vulnData, dependency_ratio_high: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'அதிக தங்கியிருப்போர் விகிதம் (சிறுவர்கள் & முதியோர் விகிதம் > 0.64)' : 'High dependency ratio (children & elderly ratio > 0.64)'}</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vulnData.is_single_parent || false}
                          onChange={e => setVulnData({ ...vulnData, is_single_parent: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>{currentLang === 'ta' ? 'தனிப் பெற்றோர் அல்லது பெண் தலைமைத்துவக் குடும்பம்' : 'Single parent or female-headed household'}</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {currentLang === 'ta' ? 'குடும்பத்தை சேமிக்க' : 'Save Family Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
