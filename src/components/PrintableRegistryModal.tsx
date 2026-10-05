import React, { useState, useMemo } from 'react';
import { Family, User } from '../types';
import { StorageService } from '../services/storageService';
import { Language } from '../utils/translations';
import {
  Printer,
  X,
  Filter,
  Download,
  Calendar,
  Building,
  FileText,
  RotateCcw,
  Layers,
  CheckSquare
} from 'lucide-react';
import { AppLogo } from './AppLogo';

interface PrintableRegistryModalProps {
  initialFamilies: Family[];
  currentUser: User;
  currentLang: Language;
  onClose: () => void;
}

export const PrintableRegistryModal: React.FC<PrintableRegistryModalProps> = ({
  currentUser,
  currentLang,
  onClose
}) => {
  const isTa = currentLang === 'ta';

  // Requirement 02: Admin and Data Entry / Assistance Officer have full authority to filter all questions and print by GS Division.
  // Not provided to Grama Niladhari (GN Officer).
  const canFilterAndPrintByDivision =
    currentUser.Role === 'Super Admin' ||
    currentUser.Role === 'Super_Admin' ||
    currentUser.Role === 'Data Entry Officer' ||
    currentUser.Role === 'Data_Entry_Officer' ||
    currentUser.Role === 'Assistance Officer' ||
    currentUser.Role === 'Assistance_Officer';

  const divisions = StorageService.getDivisions();
  const allMembers = StorageService.getMembers();
  const allAssistance = StorageService.getAssistance();

  const [selectedDivision, setSelectedDivision] = useState<string>(
    canFilterAndPrintByDivision ? 'ALL' : currentUser.Division
  );
  const [groupByDivisionPrint, setGroupByDivisionPrint] = useState<boolean>(true);
  const [selectedAswesuma, setSelectedAswesuma] = useState<string>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [customReportTitle, setCustomReportTitle] = useState<string>(
    isTa
      ? 'கிராம அலுவலர் பிரிவு ரீதியான பயனாளிகள் வினாக்கொத்து & இடர்பாட்டுப் பதிவேடு'
      : 'GS Division Wise Beneficiary Questionnaire & Vulnerability Registry'
  );

  // All questions asked in registration mapped as filterable options
  const topicOptions = [
    { value: 'ALL', label: isTa ? 'அனைத்து வினா வகைகளும் (All Categories)' : 'All Questionnaire Categories' },
    // Aswesuma & Identity
    { value: 'aswesuma_severely_poor', label: isTa ? 'அஸ்வெசும: மிகவும் வறியவர் (Severely Poor)' : 'Aswesuma: Severely Poor' },
    { value: 'aswesuma_poor', label: isTa ? 'அஸ்வெசும: வறியவர் (Poor)' : 'Aswesuma: Poor' },
    { value: 'aswesuma_vulnerable', label: isTa ? 'அஸ்வெசும: இடர்பாட்டுக்குள்ளானவர் (Vulnerable)' : 'Aswesuma: Vulnerable' },
    { value: 'aswesuma_not_selected', label: isTa ? 'அஸ்வெசும: தெரிவு செய்யப்படவில்லை (Not selected)' : 'Aswesuma: Not selected' },
    { value: 'temp_nic', label: isTa ? '18+ NIC இன்றி சிஸ்டம் தற்காலிக இலக்கம் பெற்றோர்' : '18+ Issued System Temporary NIC' },
    // Education
    { value: 'edu_no_formal', label: isTa ? 'கல்வி: முறையான கல்வி அற்றவர்கள்' : 'Education: No Formal Education' },
    { value: 'non_schooling_children', label: isTa ? 'கல்வி: பாடசாலை செல்லாத பிள்ளைகள் உள்ள குடும்பங்கள்' : 'Education: Children Not Attending School' },
    // Health
    { value: 'chronic_illness', label: isTa ? 'சுகாதாரம்: தீராத / நீண்டகால நோய் உள்ளவர்கள்' : 'Health: Chronic Illness Members' },
    { value: 'has_disabled', label: isTa ? 'சுகாதாரம்: மாற்றுத்திறனாளிகளைக் கொண்ட குடும்பங்கள்' : 'Health: Families with Disabled Members' },
    // Economic
    { value: 'electricity_under_60', label: isTa ? 'பொருளாதாரம்: மாதம் 60 அலகுக்குட்பட்ட மின்சார பாவனை' : 'Economic: Electricity Under 60 Units' },
    { value: 'low_income_20k', label: isTa ? 'பொருளாதாரம்: மாத வருமானம் LKR 20,000-க்கு குறைவானவை' : 'Economic: Monthly Income Under LKR 20,000' },
    // Assets & Land
    { value: 'no_house_land_ownership', label: isTa ? 'சொத்து: சொந்த வீடு / காணி உறுதி அற்றவை' : 'Assets: No House or Land Ownership' },
    { value: 'no_other_building', label: isTa ? 'சொத்து: வேறு கட்டிட உரிமை அற்றவை' : 'Assets: No Other Building Ownership' },
    { value: 'no_highland_half_acre', label: isTa ? 'சொத்து: 0.5 ஏக்கர் மேட்டுக்காணி அற்றவை' : 'Assets: No 0.5 Acre Highland' },
    { value: 'no_paddy_one_acre', label: isTa ? 'சொத்து: 1 ஏக்கர் வயல்காணி அற்றவை' : 'Assets: No 1 Acre Paddy Land' },
    { value: 'no_mobility_asset', label: isTa ? 'சொத்து: வாகன வசதி அற்றவை' : 'Assets: No Mobility / Vehicle Asset' },
    { value: 'no_economic_asset', label: isTa ? 'சொத்து: தொழில் உபகரண சொத்து அற்றவை' : 'Assets: No Economic Activity Equipment' },
    { value: 'no_livestock_asset', label: isTa ? 'சொத்து: கால்நடை / வாழ்வாதார சொத்து அற்றவை' : 'Assets: No Livestock Asset' },
    { value: 'has_land', label: isTa ? 'காணி: மேட்டுக்காணி / வயல்காணி / BLR உடையவை' : 'Land: Has Highland / Paddy / BLR Deed' },
    // Housing
    { value: 'no_house', label: isTa ? 'வீடு: வீடற்றவை / தற்காலிக குடிசை' : 'Housing: Homeless / Temporary Hut' },
    { value: 'is_shanty_lineroom', label: isTa ? 'வீடு: குடிசை அல்லது லயன் அறை' : 'Housing: Shanty / Line Room' },
    { value: 'no_permanent_structure', label: isTa ? 'வீடு: நிரந்தர சுவர் / தரை / கூரை அற்றவை' : 'Housing: No Permanent Wall/Floor/Roof' },
    { value: 'floor_under_500sqft', label: isTa ? 'வீடு: 500 சதுர அடிக்கு குறைவான பரப்பளவு' : 'Housing: Floor Area Under 500 sq.ft' },
    { value: 'no_water', label: isTa ? 'வீடு: சுத்தமான குடிநீர் / கிணறு அற்றவை' : 'Housing: No Clean Drinking Water / Well' },
    { value: 'no_toilet', label: isTa ? 'வீடு: மலசலகூட வசதி அற்றவை' : 'Housing: No Toilet / Sanitation' },
    { value: 'no_electricity', label: isTa ? 'வீடு: மின்சார இணைப்பு அற்றவை' : 'Housing: No Electricity Access' },
    // Demography
    { value: 'female_headed', label: isTa ? 'குடும்ப அமைப்பு: பெண் தலைமைத்துவக் குடும்பங்கள்' : 'Demography: Female-Headed Households' },
    { value: 'is_single_parent', label: isTa ? 'குடும்ப அமைப்பு: ஒற்றைப் பெற்றோர் குடும்பங்கள்' : 'Demography: Single Parent Households' },
    { value: 'dependency_high', label: isTa ? 'குடும்ப அமைப்பு: தங்கிவாழ்வோர் விகிதம் அதிகம் (>0.64)' : 'Demography: High Dependency Ratio (>0.64)' },
    { value: 'has_elderly', label: isTa ? 'குடும்ப அமைப்பு: முதியோர்களைக் கொண்டவை (60+)' : 'Demography: Families with Elderly (60+)' },
    // Assistance
    { value: 'assisted', label: isTa ? 'உதவி: இதுவரை உதவி பெற்ற குடும்பங்கள்' : 'Aid: Assisted Families' },
    { value: 'unassisted', label: isTa ? 'உதவி: இதுவரை எந்த உதவியும் பெறாத குடும்பங்கள்' : 'Aid: Unassisted Families' }
  ];

  // Multi-checkbox chips so Admin / Data Entry Officer can combine multiple questions at once
  const multiQuestionChips = [
    { id: 'female_headed', label: isTa ? 'பெண் தலைமை' : 'Female Headed' },
    { id: 'no_toilet', label: isTa ? 'மலசலகூடமில்லை' : 'No Toilet' },
    { id: 'no_water', label: isTa ? 'குடிநீரில்லை' : 'No Water' },
    { id: 'no_house', label: isTa ? 'வீடற்றவர்' : 'No House' },
    { id: 'non_schooling_children', label: isTa ? 'பாடசாலை செல்லாப் பிள்ளைகள்' : 'Out-of-School Children' },
    { id: 'chronic_illness', label: isTa ? 'தீராத நோய்' : 'Chronic Illness' },
    { id: 'has_disabled', label: isTa ? 'மாற்றுத்திறனாளி' : 'Disabled' },
    { id: 'has_elderly', label: isTa ? 'முதியோர் (60+)' : 'Elderly (60+)' },
    { id: 'no_house_land_ownership', label: isTa ? 'காணி/வீடு உறுதி இல்லை' : 'No Land/House Deed' },
    { id: 'is_single_parent', label: isTa ? 'ஒற்றைப் பெற்றோர்' : 'Single Parent' },
    { id: 'temp_nic', label: isTa ? 'தற்காலிக NIC (18+)' : 'Temp NIC (18+)' },
    { id: 'unassisted', label: isTa ? 'உதவி பெறாதவர்' : 'Unassisted' }
  ];

  const toggleIndicatorChip = (id: string) => {
    setSelectedIndicators(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const checkFamilyMatchesCriterion = (f: Family, criterion: string): boolean => {
    const famMembers = allMembers.filter(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
    const famAid = allAssistance.filter(a => a.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
    const v = f.vulnerability || {};

    const isFemaleHead =
      f.is_female_headed ||
      v.is_single_parent ||
      famMembers.some(m => (m.Relationship === 'Head of Family' || m.Relationship.includes('Head')) && m.Gender === 'Female');
    const hasNoToilet = Boolean(f.no_toilet || v.no_adequate_sanitation);
    const hasNoWater = Boolean(f.no_drinking_water_well || v.no_clean_drinking_water);
    const hasNoHouse = Boolean(
      f.no_house ||
        f.Housing_Status === 'Landless' ||
        f.Housing_Status === 'Temporary/Hut' ||
        v.no_house_land_ownership
    );
    const hasElderly = famMembers.some(m => m.Elderly === 'Yes' || (m.Calculated_Age && m.Calculated_Age >= 60));
    const hasDisabled = famMembers.some(m => m.Disability === 'Yes') || Boolean(v.disabled_members);
    const hasLand = famMembers.some(m => Boolean(m.Highland_Extent || m.Paddy_Extent || m.Land_BLR_Deed_No));
    const hasTempNic = famMembers.some(m => Boolean(m.Is_Temp_NIC || (m.NIC_Elder_ID && m.NIC_Elder_ID.startsWith('TMP-NIC-'))));

    switch (criterion) {
      case 'aswesuma_severely_poor':
        return f.Aswesuma_Category === 'Severely Poor';
      case 'aswesuma_poor':
        return f.Aswesuma_Category === 'Poor';
      case 'aswesuma_vulnerable':
        return f.Aswesuma_Category === 'Vulnerable';
      case 'aswesuma_not_selected':
        return !f.Aswesuma_Category || f.Aswesuma_Category === 'Not selected';
      case 'temp_nic':
        return hasTempNic;
      case 'edu_no_formal':
        return v.education_level === 'No formal education';
      case 'non_schooling_children':
        return (v.non_schooling_children_count || 0) > 0;
      case 'chronic_illness':
        return Boolean(v.chronic_illness_members);
      case 'has_disabled':
        return hasDisabled;
      case 'electricity_under_60':
        return Boolean(v.electricity_under_60_units);
      case 'low_income_20k':
        return (f.Monthly_Income || 0) < 20000;
      case 'no_house_land_ownership':
        return Boolean(v.no_house_land_ownership);
      case 'no_other_building':
        return Boolean(v.no_other_building_ownership);
      case 'no_highland_half_acre':
        return Boolean(v.no_cultivable_highland_half_acre);
      case 'no_paddy_one_acre':
        return Boolean(v.no_cultivable_paddy_one_acre);
      case 'no_mobility_asset':
        return Boolean(v.no_mobility_asset);
      case 'no_economic_asset':
        return Boolean(v.no_economic_activity_asset);
      case 'no_livestock_asset':
        return Boolean(v.no_livelihood_livestock_asset);
      case 'has_land':
        return hasLand;
      case 'no_house':
        return hasNoHouse;
      case 'is_shanty_lineroom':
        return Boolean(v.is_shanty_lineroom);
      case 'no_permanent_structure':
        return Boolean(v.no_permanent_wall_floor_roof);
      case 'floor_under_500sqft':
        return Boolean(v.floor_area_under_500sqft);
      case 'no_water':
        return hasNoWater;
      case 'no_toilet':
        return hasNoToilet;
      case 'no_electricity':
        return Boolean(v.no_electricity_access);
      case 'female_headed':
        return isFemaleHead;
      case 'is_single_parent':
        return Boolean(v.is_single_parent);
      case 'dependency_high':
        return Boolean(v.dependency_ratio_high);
      case 'has_elderly':
        return hasElderly;
      case 'assisted':
        return famAid.length > 0;
      case 'unassisted':
        return famAid.length === 0;
      default:
        return true;
    }
  };

  const sourceFamilies = useMemo(() => {
    const all = StorageService.getFamilies();
    if (canFilterAndPrintByDivision) return all;
    return all.filter(
      f => f.Division_Name.toLowerCase().trim() === currentUser.Division.toLowerCase().trim()
    );
  }, [canFilterAndPrintByDivision, currentUser.Division]);

  const printableFamilies = useMemo(() => {
    return sourceFamilies.filter(f => {
      // 1. Division filter
      const effectiveDiv = canFilterAndPrintByDivision ? selectedDivision : currentUser.Division;
      if (effectiveDiv !== 'ALL' && f.Division_Name.toLowerCase().trim() !== effectiveDiv.toLowerCase().trim()) {
        return false;
      }

      // 2. Aswesuma Category filter
      if (selectedAswesuma !== 'ALL') {
        const famAswesuma = f.Aswesuma_Category || 'Not selected';
        if (famAswesuma !== selectedAswesuma) return false;
      }

      // 3. Priority filter
      if (selectedPriority !== 'ALL' && f.Priority_Level !== selectedPriority) {
        return false;
      }

      // 4. Date Range filter
      const createdDate = (f.Created_At || '').substring(0, 10);
      if (dateFrom && createdDate && createdDate < dateFrom) {
        return false;
      }
      if (dateTo && createdDate && createdDate > dateTo) {
        return false;
      }

      // 5. Primary Topic / Question filter
      if (selectedTopic !== 'ALL' && !checkFamilyMatchesCriterion(f, selectedTopic)) {
        return false;
      }

      // 6. Multi-indicator checkboxes (AND filter across all selected questions)
      if (selectedIndicators.length > 0) {
        for (const ind of selectedIndicators) {
          if (!checkFamilyMatchesCriterion(f, ind)) return false;
        }
      }

      // 7. Keyword search
      if (keywordFilter.trim()) {
        const q = keywordFilter.toLowerCase().trim();
        const famMembers = allMembers.filter(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
        const memberText = famMembers.map(m => `${m.Name} ${m.NIC_Elder_ID} ${m.Land_BLR_Deed_No || ''}`).join(' ').toLowerCase();
        const match =
          (f.Registration_Number || '').toLowerCase().includes(q) ||
          f.QR_Number.toLowerCase().includes(q) ||
          f.Family_Name.toLowerCase().includes(q) ||
          f.Address.toLowerCase().includes(q) ||
          f.Division_Name.toLowerCase().includes(q) ||
          (f.Aswesuma_Category || '').toLowerCase().includes(q) ||
          memberText.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    sourceFamilies,
    canFilterAndPrintByDivision,
    selectedDivision,
    currentUser.Division,
    selectedAswesuma,
    selectedPriority,
    dateFrom,
    dateTo,
    selectedTopic,
    selectedIndicators,
    keywordFilter,
    allMembers,
    allAssistance
  ]);

  // Group families by GS Division for division-by-division printing
  const groupedByDivision = useMemo(() => {
    const groups: { divisionName: string; tamilName?: string; gnCode?: string; families: Family[] }[] = [];
    divisions.forEach(div => {
      const divFams = printableFamilies.filter(
        f => f.Division_Name.toLowerCase().trim() === div.Division_Name.toLowerCase().trim()
      );
      if (divFams.length > 0) {
        groups.push({
          divisionName: div.Division_Name,
          tamilName: div.Tamil_Name,
          gnCode: div.GN_Code,
          families: divFams
        });
      }
    });
    return groups;
  }, [printableFamilies, divisions]);

  const stats = useMemo(() => {
    let totalMembers = 0;
    let totalIncome = 0;
    let totalAidAmount = 0;
    printableFamilies.forEach(f => {
      totalMembers += f.Family_Size || 0;
      totalIncome += f.Monthly_Income || 0;
      const famAid = allAssistance.filter(a => a.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
      totalAidAmount += famAid.reduce((acc, a) => acc + (a.Amount || 0), 0);
    });
    return {
      totalFamilies: printableFamilies.length,
      totalMembers,
      totalIncome,
      totalAidAmount
    };
  }, [printableFamilies, allAssistance]);

  const handleTriggerPrint = () => {
    window.print();
  };

  const handleDownloadFilteredCsv = () => {
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'Registration_Number',
      'QR_Number',
      'GN_Division',
      'Family_Head_Name',
      'Head_NIC_Or_Temp_ID',
      'Is_Temp_NIC',
      'Aswesuma_Category',
      'Address',
      'Telephone',
      'Family_Size',
      'Monthly_Income_LKR',
      'Highland_Extent',
      'Paddy_Extent',
      'BLR_Deed_No',
      'Education_Level',
      'Non_Schooling_Children',
      'Chronic_Illness',
      'Disabled_Members',
      'Female_Headed',
      'No_Toilet',
      'No_Water',
      'No_House',
      'Priority_Level',
      'Aid_Total_LKR',
      'Registration_Date'
    ];

    const rows = printableFamilies.map(f => {
      const famMembers = allMembers.filter(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
      const head = famMembers.find(m => m.Relationship === 'Head of Family' || m.Relationship.includes('Head')) || famMembers[0];
      const famAid = allAssistance.filter(a => a.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
      const aidSum = famAid.reduce((acc, a) => acc + (a.Amount || 0), 0);
      const highland = famMembers.map(m => m.Highland_Extent).filter(Boolean).join('; ') || '-';
      const paddy = famMembers.map(m => m.Paddy_Extent).filter(Boolean).join('; ') || '-';
      const blr = famMembers.map(m => m.Land_BLR_Deed_No).filter(Boolean).join('; ') || '-';
      const v = f.vulnerability || {};

      return [
        f.Registration_Number || `REG-${f.QR_Number}`,
        f.QR_Number,
        f.Division_Name,
        f.Family_Name,
        head ? head.NIC_Elder_ID : '',
        head?.Is_Temp_NIC ? 'YES (TEMP)' : 'NO',
        f.Aswesuma_Category || 'Not selected',
        f.Address,
        f.Telephone || '',
        f.Family_Size,
        f.Monthly_Income,
        highland,
        paddy,
        blr,
        v.education_level || head?.Education || '-',
        v.non_schooling_children_count || 0,
        v.chronic_illness_members ? 'YES' : 'NO',
        v.disabled_members || famMembers.some(m => m.Disability === 'Yes') ? 'YES' : 'NO',
        f.is_female_headed ? 'YES' : 'NO',
        f.no_toilet || v.no_adequate_sanitation ? 'YES' : 'NO',
        f.no_drinking_water_well || v.no_clean_drinking_water ? 'YES' : 'NO',
        f.no_house || v.no_house_land_ownership ? 'YES' : 'NO',
        f.Priority_Level,
        aidSum,
        (f.Created_At || '').substring(0, 10)
      ].map(escapeCsv).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const scopeName = canFilterAndPrintByDivision ? selectedDivision : currentUser.Division;
    link.setAttribute('download', `Vaharai_Filtered_Registry_${scopeName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSelectedDivision(canFilterAndPrintByDivision ? 'ALL' : currentUser.Division);
    setSelectedAswesuma('ALL');
    setSelectedTopic('ALL');
    setSelectedPriority('ALL');
    setSelectedIndicators([]);
    setDateFrom('');
    setDateTo('');
    setKeywordFilter('');
  };

  const currentDate = new Date().toLocaleDateString(isTa ? 'ta-LK' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const activeTopicLabel = topicOptions.find(t => t.value === selectedTopic)?.label || '';

  const renderFamilyTable = (list: Family[]) => (
    <div className="border border-slate-300 rounded overflow-hidden">
      <table className="w-full text-left text-[10px] sm:text-xs">
        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
          <tr>
            <th className="p-2 text-center w-8">#</th>
            <th className="p-2 font-mono">{isTa ? 'பதிவு இல / QR' : 'Reg# / QR'}</th>
            <th className="p-2">{isTa ? 'பிரிவு' : 'GN Division'}</th>
            <th className="p-2">{isTa ? 'குடும்பத் தலைவர் & NIC' : 'Family Head & NIC'}</th>
            <th className="p-2">{isTa ? 'அஸ்வெசும' : 'Aswesuma'}</th>
            <th className="p-2">{isTa ? 'காணி & இடர்பாட்டுக் குறிகாட்டிகள்' : 'Land & Vulnerability Indicators'}</th>
            <th className="p-2 text-center">{isTa ? 'உறுப்பினர்' : 'Size'}</th>
            <th className="p-2 text-right">{isTa ? 'வருமானம்' : 'Income'}</th>
            <th className="p-2 text-center">{isTa ? 'முன்னுரிமை' : 'Priority'}</th>
            <th className="p-2 text-right">{isTa ? 'பெற்ற உதவி' : 'Aid Total'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {list.map((f, idx) => {
            const famMembers = allMembers.filter(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
            const head = famMembers.find(m => m.Relationship === 'Head of Family' || m.Relationship.includes('Head')) || famMembers[0];
            const famAid = allAssistance.filter(a => a.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
            const aidSum = famAid.reduce((acc, a) => acc + (a.Amount || 0), 0);
            const highland = famMembers.map(m => m.Highland_Extent).filter(Boolean).join(', ');
            const paddy = famMembers.map(m => m.Paddy_Extent).filter(Boolean).join(', ');
            const blr = famMembers.map(m => m.Land_BLR_Deed_No).filter(Boolean).join(', ');
            const v = f.vulnerability || {};

            const flags: string[] = [];
            if (f.is_female_headed || v.is_single_parent) flags.push(isTa ? 'பெண் தலைமை' : 'Female Head');
            if (f.no_toilet || v.no_adequate_sanitation) flags.push(isTa ? 'மலசலகூடமில்லை' : 'No Toilet');
            if (f.no_drinking_water_well || v.no_clean_drinking_water) flags.push(isTa ? 'குடிநீரில்லை' : 'No Water');
            if (f.no_house || v.no_house_land_ownership) flags.push(isTa ? 'வீடற்றவர்' : 'No House');
            if ((v.non_schooling_children_count || 0) > 0) flags.push(isTa ? `பாடசாலை செல்லாதோர்: ${v.non_schooling_children_count}` : `Out-of-school: ${v.non_schooling_children_count}`);
            if (v.chronic_illness_members) flags.push(isTa ? 'தீராத நோய்' : 'Chronic Illness');
            if (v.disabled_members || famMembers.some(m => m.Disability === 'Yes')) flags.push(isTa ? 'மாற்றுத்திறனாளி' : 'Disabled');

            return (
              <tr key={f.Family_ID} className="break-inside-avoid hover:bg-slate-50/50">
                <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                <td className="p-2 font-mono whitespace-nowrap">
                  <div className="font-bold text-slate-900">{f.QR_Number}</div>
                  <div className="text-[9px] text-indigo-700 font-semibold">{f.Registration_Number || `REG-${f.QR_Number}`}</div>
                </td>
                <td className="p-2 text-slate-800 font-medium">{f.Division_Name}</td>
                <td className="p-2">
                  <div className="font-bold text-slate-900">{f.Family_Name}</div>
                  {head?.NIC_Elder_ID && (
                    <div className="font-mono text-[10px] text-slate-600">
                      NIC: {head.NIC_Elder_ID}{' '}
                      {head.Is_Temp_NIC && <span className="text-amber-800 font-bold">(தற்காலிக இலக்கம்)</span>}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500">{f.Address}</div>
                </td>
                <td className="p-2">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    f.Aswesuma_Category === 'Severely Poor'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : f.Aswesuma_Category === 'Poor'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : f.Aswesuma_Category === 'Vulnerable'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {f.Aswesuma_Category || 'Not selected'}
                  </span>
                </td>
                <td className="p-2 text-[10px] text-slate-700 space-y-0.5">
                  {(highland || paddy || blr) && (
                    <div>
                      {highland && <span>மேட்டு: {highland} </span>}
                      {paddy && <span>| வயல்: {paddy} </span>}
                      {blr && <span className="font-mono font-semibold">({blr})</span>}
                    </div>
                  )}
                  {flags.length > 0 ? (
                    <div className="text-rose-800 font-semibold">{flags.join(' • ')}</div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="p-2 text-center font-mono font-bold text-slate-900">{f.Family_Size}</td>
                <td className="p-2 text-right font-mono text-slate-800">{f.Monthly_Income.toLocaleString()}</td>
                <td className="p-2 text-center whitespace-nowrap font-bold">{f.Priority_Level}</td>
                <td className="p-2 text-right font-mono text-slate-800 font-semibold whitespace-nowrap">
                  {aidSum > 0 ? `LKR ${aidSum.toLocaleString()}` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-none sm:rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl h-full sm:max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-600/30 text-emerald-400 rounded-lg">
              <Printer className="w-5 h-5 text-emerald-400" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>
                  {isTa
                    ? 'அனைத்து வினாக்கள் வடிகட்டல் & கிராம அலுவலர் பிரிவு ரீதியாக அச்சிடும் வசதி'
                    : 'All-Questions Filter & GS Division Print Studio'}
                </span>
                <span className="text-xs font-mono font-normal text-emerald-400">
                  ({printableFamilies.length} {isTa ? 'குடும்பங்கள்' : 'Families'})
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                {isTa
                  ? 'முதன்மை நிர்வாகி (Super Admin) மற்றும் தகவல் பதிவு உத்தியோகத்தர் (Data Entry Officer) ஆகியோருக்கான விசேட பிரிவு ரீதியான அச்சு வசதி'
                  : 'Authorized for Super Admin & Data Entry Officer to filter all questionnaire indicators and print per GS Division'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setGroupByDivisionPrint(!groupByDivisionPrint)}
              className={`px-3 py-2 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                groupByDivisionPrint
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {isTa
                  ? groupByDivisionPrint
                    ? '✓ தனித்தனி GS பிரிவாகப் பிரித்து அச்சிடு'
                    : 'தனித்தனி GS பிரிவாகப் பிரிக்க'
                  : groupByDivisionPrint
                  ? '✓ Grouped by GS Division'
                  : 'Group by GS Division'}
              </span>
            </button>
            <button
              onClick={handleDownloadFilteredCsv}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isTa ? 'CSV (Excel) பதிவிறக்குக' : 'Export Filtered CSV'}</span>
            </button>
            <button
              onClick={handleTriggerPrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isTa ? 'அச்சிடுக (Print)' : 'Print Document'}</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comprehensive Questionnaire Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 text-xs shrink-0 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {/* 1. GN Division Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-emerald-700" />
                <span>{isTa ? '1. கிராம அலுவலர் பிரிவு:' : '1. GS Division:'}</span>
              </label>
              <select
                value={canFilterAndPrintByDivision ? selectedDivision : currentUser.Division}
                onChange={e => setSelectedDivision(e.target.value)}
                disabled={!canFilterAndPrintByDivision}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-600 cursor-pointer"
              >
                {canFilterAndPrintByDivision && (
                  <option value="ALL">{isTa ? 'அனைத்து 16 பிரிவுகளும் (All)' : 'All 16 GS Divisions'}</option>
                )}
                {divisions.map(d => (
                  <option key={d.Division_ID} value={d.Division_Name}>
                    {d.GN_Code ? `${d.GN_Code} - ` : ''}{isTa && d.Tamil_Name ? `${d.Tamil_Name} (${d.Division_Name})` : d.Division_Name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Aswesuma Category Filter */}
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                {isTa ? '2. அஸ்வெசும பயனாளி வகை:' : '2. Aswesuma Category:'}
              </label>
              <select
                value={selectedAswesuma}
                onChange={e => setSelectedAswesuma(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-emerald-50/60 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 cursor-pointer"
              >
                <option value="ALL">{isTa ? 'அனைத்தும் (All Aswesuma)' : 'All Aswesuma Status'}</option>
                <option value="Severely Poor">Severely Poor (மிகவும் வறியவர்)</option>
                <option value="Poor">Poor (வறியவர்)</option>
                <option value="Vulnerable">Vulnerable (இடர்பாட்டுக்குள்ளானவர்)</option>
                <option value="Not selected">Not selected (தெரிவு செய்யப்படவில்லை)</option>
              </select>
            </div>

            {/* 3. Questionnaire Indicator Filter */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-700" />
                <span>{isTa ? '3. வினாக்கொத்து குறிகாட்டி வடிகட்டல் (All Questions):' : '3. Filter by Any Questionnaire Question:'}</span>
              </label>
              <select
                value={selectedTopic}
                onChange={e => {
                  setSelectedTopic(e.target.value);
                  const found = topicOptions.find(t => t.value === e.target.value);
                  if (found && e.target.value !== 'ALL') {
                    setCustomReportTitle(found.label);
                  } else {
                    setCustomReportTitle(
                      isTa
                        ? 'கிராம அலுவலர் பிரிவு ரீதியான பயனாளிகள் வினாக்கொத்து & இடர்பாட்டுப் பதிவேடு'
                        : 'GS Division Wise Beneficiary Questionnaire & Vulnerability Registry'
                    );
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {topicOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 4. Priority Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isTa ? '4. முன்னுரிமை நிலை:' : '4. Priority Level:'}
              </label>
              <select
                value={selectedPriority}
                onChange={e => setSelectedPriority(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <option value="ALL">{isTa ? 'அனைத்து முன்னுரிமைகளும்' : 'All Priorities'}</option>
                <option value="Critical">{isTa ? 'மிக அவசரம் (Critical)' : 'Critical'}</option>
                <option value="High">{isTa ? 'அதி முன்னுரிமை (High)' : 'High'}</option>
                <option value="Medium">{isTa ? 'நடுத்தரம் (Medium)' : 'Medium'}</option>
                <option value="Normal">{isTa ? 'சாதாரண (Normal)' : 'Normal'}</option>
              </select>
            </div>

            {/* 5. Date From */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-700" />
                <span>{isTa ? '5. பதிவு திகதி (From):' : '5. Date From:'}</span>
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Multi-Indicator Question Checkboxes */}
          <div className="pt-1 border-t border-slate-200/80">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mr-1">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                {isTa ? 'பல்வேறு வினாக்களை இணைத்து வடிகட்ட:' : 'Combine Multiple Questions:'}
              </span>
              {multiQuestionChips.map(chip => {
                const active = selectedIndicators.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => toggleIndicatorChip(chip.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}{chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Custom Print Report Heading & Keyword Search */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-emerald-700" />
                <span>{isTa ? 'அறிக்கைத் தலைப்பு (Print Heading):' : 'Custom Print Report Title:'}</span>
              </label>
              <input
                type="text"
                value={customReportTitle}
                onChange={e => setCustomReportTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isTa ? 'பெயர் / பதிவு இலக்கம் / NIC / QR / BLR தேடல்:' : 'Search Name / Reg# / NIC / QR / BLR:'}
              </label>
              <input
                type="text"
                value={keywordFilter}
                onChange={e => setKeywordFilter(e.target.value)}
                placeholder={isTa ? 'குறிப்பிட்ட சொல் கொண்டு வடிகட்டுக...' : 'Filter by keyword...'}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isTa ? 'மீளமை (Reset)' : 'Reset'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white print:p-0 space-y-6">
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 space-y-1 flex flex-col items-center">
            <AppLogo size="md" className="mb-1 ring-1 ring-slate-300" />
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
              Democratic Socialist Republic of Sri Lanka
            </div>
            <div className="text-base sm:text-lg font-black uppercase text-slate-950 tracking-tight">
              {isTa ? 'பிரதேச செயலகம் கோறளைப்பற்று வடக்கு வாகரை' : 'Divisional Secretariat Koralaipattu North Vaharai'}
            </div>
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
              {customReportTitle}
            </div>
            <div className="pt-2 w-full flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-600 border-t border-slate-200 mt-2 gap-2">
              <div>
                <strong>{isTa ? 'கிராம அலுவலர் பிரிவு:' : 'GS Division Scope:'}</strong>{' '}
                {canFilterAndPrintByDivision ? (selectedDivision === 'ALL' ? (isTa ? 'அனைத்து 16 பிரிவுகள் (தனித்தனிப் பிரிவாக)' : 'All 16 GS Divisions') : selectedDivision) : currentUser.Division}
              </div>
              {selectedAswesuma !== 'ALL' && (
                <div>
                  <strong>{isTa ? 'அஸ்வெசும:' : 'Aswesuma:'}</strong> {selectedAswesuma}
                </div>
              )}
              {selectedTopic !== 'ALL' && (
                <div>
                  <strong>{isTa ? 'வகை:' : 'Category:'}</strong> {activeTopicLabel}
                </div>
              )}
              <div>
                <strong>{isTa ? 'திகதி:' : 'Date Generated:'}</strong> {currentDate}
              </div>
              <div>
                <strong>{isTa ? 'உத்தியோகத்தர்:' : 'Generated By:'}</strong> {currentUser.Name} ({currentUser.Role})
              </div>
              <div>
                <strong>{isTa ? 'மொத்தக் குடும்பங்கள்:' : 'Total Families:'}</strong> {stats.totalFamilies}
              </div>
            </div>
          </div>

          {/* Render either Grouped by Individual GS Division or Single Table */}
          {groupByDivisionPrint && selectedDivision === 'ALL' ? (
            <div className="space-y-8">
              {groupedByDivision.map((grp, gIdx) => (
                <div key={grp.divisionName} className={gIdx > 0 ? 'pt-6 border-t-2 border-dashed border-slate-300 print:break-before-page' : ''}>
                  <div className="bg-slate-900 text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between">
                    <div className="font-bold text-xs sm:text-sm">
                      {isTa ? 'கிராம அலுவலர் பிரிவு:' : 'GS Division:'}{' '}
                      <span className="text-emerald-300">
                        {grp.gnCode ? `${grp.gnCode} - ` : ''}{isTa && grp.tamilName ? `${grp.tamilName} (${grp.divisionName})` : grp.divisionName}
                      </span>
                    </div>
                    <span className="text-xs font-mono bg-white/15 px-2.5 py-0.5 rounded">
                      {grp.families.length} {isTa ? 'குடும்பங்கள்' : 'Families'}
                    </span>
                  </div>
                  {renderFamilyTable(grp.families)}
                </div>
              ))}
            </div>
          ) : (
            renderFamilyTable(printableFamilies)
          )}

          {/* Signature Blocks */}
          <div className="mt-8 pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-xs font-mono break-inside-avoid">
            <div className="space-y-8">
              <div className="text-[11px] text-slate-500">...................................................</div>
              <div>
                <strong className="block text-slate-900">{isTa ? 'தயாரித்தவர் (Prepared By)' : 'Prepared By'}</strong>
                <span className="text-[10px] text-slate-600">{currentUser.Name}</span>
              </div>
            </div>
            <div className="space-y-8">
              <div className="text-[11px] text-slate-500">...................................................</div>
              <div>
                <strong className="block text-slate-900">{isTa ? 'சரிபார்த்தவர் (Verified By)' : 'Verified By'}</strong>
                <span className="text-[10px] text-slate-600">{isTa ? 'தகவல் பதிவு / நிர்வாக உத்தியோகத்தர்' : 'Data Entry / Administrative Officer'}</span>
              </div>
            </div>
            <div className="space-y-8">
              <div className="text-[11px] text-slate-500">...................................................</div>
              <div>
                <strong className="block text-slate-900">{isTa ? 'அங்கீகரித்தவர் (Approved By)' : 'Approved By'}</strong>
                <span className="text-[10px] text-slate-600">
                  {isTa ? 'பிரதேச செயலாளர் – கோறளைப்பற்று வடக்கு (வாகரை)' : 'Divisional Secretary – Koralaipattu North (Vaharai)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableRegistryModal;
