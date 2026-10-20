import { 
  Beneficiary, 
  User, 
  GNDivision, 
  Role, 
  WelfareScheme, 
  ChronicIllness, 
  WelfareStatus,
  AssistanceRecord,
  AidCategory,
  FamilyCsvRecord
} from '../types';
import { 
  generateSystemCitizenId, 
  generateProvisionalNic, 
  generateUniqueFamilyQrPayload, 
  checkDuplicateAssistance 
} from './storage';

// UTF-8 BOM so Excel opens Tamil Unicode characters accurately without question marks or mojibake
const UTF8_BOM = '\uFEFF';

export const downloadCsvFile = (content: string, filename: string) => {
  const blob = new Blob([UTF8_BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Robust CSV Line Parser
export const parseCsvContent = (csvText: string): string[][] => {
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  const lines = cleanText.split(/\r\n|\n|\r/);

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const row: string[] = [];
    let insideQuotes = false;
    let entry = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          entry += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    rows.push(row);
  }

  return rows;
};

// ================= BENEFICIARIES CSV ================= //
export const BENEFICIARIES_CSV_HEADERS = [
  'System_ID',
  'NIC',
  'Name_Tamil',
  'Name_English',
  'Gender',
  'DOB',
  'Phone',
  'Address',
  'Division_Code',
  'Family_Head',
  'Household_No',
  'Chronic_Illness',
  'Welfare_Scheme',
  'Notes'
];

const BENICIARY_HEADER_LINE = BENEFICIARIES_CSV_HEADERS.join(',');

export const generateBeneficiarySampleCsv = (): string => {
  const sampleRows = [
    BENICIARY_HEADER_LINE,
    'VHR-211-2026-0001,198421500321,முருகேசு தர்மலிங்கம்,Murugesu Tharmalingam,MALE,1984-05-12,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,YES,HH-211-042,CKD_KIDNEY,ASWESUMA_EXTREME,சிறுநீரக நோயாளி மற்றும் தீவிர வறுமை உதவி',
    'VHR-212A-2026-0002,199074500812,கனகரத்தினம் கமலாதேவி,Kanagarathnam Kamaladevi,FEMALE,1990-11-20,0777654321,"கடற்கரை வீதி, வாகரை வடக்கு",212A,YES,HH-212A-088,NONE,SAMURDHI,சுயதொழில் தையல் இயந்திர உதவி',
    'VHR-211-2026-0003,TNIC-211-2026-10492,தர்மலிங்கம் கஜன்,Tharmalingam Kajan,MALE,2010-03-14,0771234567,"பிரதான வீதி, மாங்கேணி",211,NO,HH-211-042,NONE,NONE,16 வயது பூர்த்தி (NIC விண்ணப்பத்திற்கு)',
    'VHR-212-2026-0001,195531200194,பொன்னம்பலம் செல்லையா,Ponnambalam Chelliah,MALE,1955-03-14,0714567890,"கோவில் வீதி, வாகரை மத்தி",212,YES,HH-212-019,HEART_DISEASE,ELDERLY,70+ முதியோர் கொடுப்பனவு',
    'VHR-211A-2026-0001,197519000451,இராசையா நகுலேஸ்வரன்,Rasiah Naguleswaran,MALE,1975-07-09,0772345678,"பள்ளிக்குடா, காயான்கேணி",211A,YES,HH-211A-102,CANCER,FISHERY_AID,புற்றுநோய் சிகிச்சை மற்றும் கடற்றொழிலாளர் உதவி'
  ];
  return sampleRows.join('\n');
};

export const parseBeneficiariesFromCsv = (csvText: string): { items: Beneficiary[]; errors: string[] } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) {
    return { items: [], errors: ['CSV file is empty or missing data rows.'] };
  }

  const items: Beneficiary[] = [];
  const errors: string[] = [];

  const startIndex = rows[0][0]?.toLowerCase().includes('system') || rows[0][0]?.toLowerCase().includes('beneficiary') || rows[0][1]?.toLowerCase().includes('nic') ? 1 : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 4) continue;

    const divisionCode = row[8]?.trim() || '211';
    let id = row[0]?.trim();
    if (!id || id.length < 3) {
      id = generateSystemCitizenId(divisionCode, i + 1);
    }

    let nic = row[1]?.trim() || '';
    let isProvisional = false;

    if (!nic) {
      nic = generateProvisionalNic(divisionCode);
      isProvisional = true;
    } else if (nic.startsWith('TNIC') || nic.startsWith('TEMP')) {
      isProvisional = true;
    }

    const nameTa = row[2]?.trim() || '';
    const nameEn = row[3]?.trim() || nameTa;
    const genderRaw = (row[4] || '').toUpperCase();
    const gender = genderRaw.startsWith('M') ? 'MALE' : genderRaw.startsWith('F') ? 'FEMALE' : 'OTHER';
    const dob = row[5]?.trim() || '1995-01-01';
    const phone = row[6]?.trim() || '';
    const address = row[7]?.trim() || '';
    const familyHead = (row[9] || '').toUpperCase() === 'YES' || (row[9] || '') === '1' || (row[9] || '').toUpperCase() === 'TRUE';
    const householdNo = row[10]?.trim() || `HH-${divisionCode}-${i}`;
    
    // Chronic Illness parsing
    const illnessRaw = (row[11] || '').toUpperCase();
    let chronicIllness: ChronicIllness = 'NONE';
    if (illnessRaw.includes('CKD') || illnessRaw.includes('KIDNEY') || illnessRaw.includes('சிறுநீரகம்')) chronicIllness = 'CKD_KIDNEY';
    else if (illnessRaw.includes('CANCER') || illnessRaw.includes('புற்று')) chronicIllness = 'CANCER';
    else if (illnessRaw.includes('THALASSEMIA') || illnessRaw.includes('தலசீமியா')) chronicIllness = 'THALASSEMIA';
    else if (illnessRaw.includes('HEART') || illnessRaw.includes('இதயம்')) chronicIllness = 'HEART_DISEASE';
    else if (illnessRaw.includes('DIABETES') || illnessRaw.includes('நீரிழிவு')) chronicIllness = 'DIABETES_CHRONIC';
    else if (illnessRaw.includes('DISABILITY') || illnessRaw.includes('ஊனம்')) chronicIllness = 'DISABILITY_PHYSICAL';
    else if (illnessRaw.includes('MENTAL') || illnessRaw.includes('மனநலம்')) chronicIllness = 'MENTAL_HEALTH';
    else if (illnessRaw !== 'NONE' && illnessRaw.length > 2) chronicIllness = 'OTHER_CHRONIC';

    // Welfare scheme parsing
    const welfareRaw = (row[12] || '').toUpperCase();
    let welfareScheme: WelfareScheme = 'NONE';
    if (welfareRaw.includes('EXTREME')) welfareScheme = 'ASWESUMA_EXTREME';
    else if (welfareRaw.includes('POOR')) welfareScheme = 'ASWESUMA_POOR';
    else if (welfareRaw.includes('VULNERABLE')) welfareScheme = 'ASWESUMA_VULNERABLE';
    else if (welfareRaw.includes('TRANSITIONAL')) welfareScheme = 'ASWESUMA_TRANSITIONAL';
    else if (welfareRaw.includes('ASWESUMA')) welfareScheme = 'ASWESUMA_POOR';
    else if (welfareRaw.includes('SAMURDHI')) welfareScheme = 'SAMURDHI';
    else if (welfareRaw.includes('ELDERLY')) welfareScheme = 'ELDERLY';
    else if (welfareRaw.includes('DISABILITY')) welfareScheme = 'DISABILITY';
    else if (welfareRaw.includes('KIDNEY')) welfareScheme = 'CHRONIC_KIDNEY';
    else if (welfareRaw.includes('FARM')) welfareScheme = 'FARMER_SUBSIDY';
    else if (welfareRaw.includes('FISH')) welfareScheme = 'FISHERY_AID';
    else if (welfareRaw.includes('DISASTER')) welfareScheme = 'DISASTER_RELIEF';
    else if (welfareRaw.includes('SELF') || welfareRaw.includes('GRANT')) welfareScheme = 'SELF_EMPLOYMENT';

    const notes = row[13]?.trim() || '';

    if (!nameTa && !nameEn) {
      errors.push(`Row ${i + 1}: Skipped due to missing Name.`);
      continue;
    }

    const barcode = nic || id;
    const qrPayload = `VHR-DS|ID:${id}|NIC:${nic}|DIV:${divisionCode}|MED:${chronicIllness}|${welfareScheme}`;

    items.push({
      id,
      nic,
      isProvisionalNic: isProvisional,
      nameTa,
      nameEn,
      gender,
      dob,
      phone,
      address,
      divisionCode,
      familyHead,
      householdNo,
      welfareScheme,
      welfareStatus: 'ACTIVE',
      chronicIllness,
      barcode,
      qrPayload,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { items, errors };
};

export const exportBeneficiariesToCsv = (items: Beneficiary[]): string => {
  const lines = [BENICIARY_HEADER_LINE];
  for (const b of items) {
    const row = [
      escapeCsv(b.id),
      escapeCsv(b.nic),
      escapeCsv(b.nameTa),
      escapeCsv(b.nameEn),
      b.gender,
      b.dob,
      escapeCsv(b.phone),
      escapeCsv(b.address),
      escapeCsv(b.divisionCode),
      b.familyHead ? 'YES' : 'NO',
      escapeCsv(b.householdNo),
      escapeCsv(b.chronicIllness),
      escapeCsv(b.welfareScheme),
      escapeCsv(b.notes || '')
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
};

// ================= USERS / STAFF CSV ================= //
export const USERS_CSV_HEADERS = ['User_ID', 'Password', 'Name', 'Role', 'Division', 'Status', 'Created_At'];

export const generateUsersSampleCsv = (): string => {
  const sampleRows = [
    'User_ID,Password,Name,Role,Division,Status,Created_At',
    '123,123,a (GN Vaharai North),GRAMANIILATHARI,211,ACTIVE,2026-01-10',
    '456,123,b (Admin 1),ADMIN 1,ALL,ACTIVE,2026-01-10',
    '457,123,b2 (Admin 2),ADMIN 2,ALL,ACTIVE,2026-01-10',
    '789,123,c (Super Admin),SUPERADMIN,ALL,ACTIVE,2026-01-10',
    '1112,123,d (Data Entry),DATAENRY OFFCER,ALL,ACTIVE,2026-01-10',
    '555,123,e (Reception),Reception Registrar,Front Desk,ACTIVE,2026-01-10',
    '999,123,TV Display Screen,NORMAL,ALL,ACTIVE,2026-01-10'
  ];
  return sampleRows.join('\n');
};

export const parseUsersFromCsv = (csvText: string): { items: User[]; errors: string[] } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) {
    return { items: [], errors: ['Staff CSV is empty.'] };
  }

  const items: User[] = [];
  const errors: string[] = [];
  const startIndex = rows[0][0]?.toLowerCase().includes('user') ? 1 : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;

    const id = row[0]?.trim();
    const password = row[1]?.trim() || '123456';
    const name = row[2]?.trim() || `Officer ${id}`;
    const roleRaw = (row[3] || 'GRAMANIILATHARI').trim().toUpperCase();

    let role: Role = 'GRAMANIILATHARI';
    if (roleRaw.includes('SUPER')) role = 'SUPERADMIN';
    else if (roleRaw.includes('ADMIN 2') || roleRaw.includes('ADMIN 02') || roleRaw.includes('ADMIN2')) role = 'ADMIN 2';
    else if (roleRaw.includes('ADMIN 1') || roleRaw.includes('ADMIN 01') || roleRaw.includes('ADMIN1')) role = 'ADMIN 1';
    else if (roleRaw.includes('NORMAL')) role = 'NORMAL';
    else if (roleRaw.includes('DATA')) role = 'DATAENRY OFFCER';
    else if (roleRaw.includes('RECEPT')) role = 'Reception Registrar';

    const division = row[4]?.trim() || (role === 'GRAMANIILATHARI' ? '211' : 'ALL');
    const status = (row[5]?.trim().toUpperCase() === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';
    const createdAt = row[6]?.trim() || new Date().toISOString();

    if (!id) {
      errors.push(`Row ${i + 1}: Skipped due to missing User_ID.`);
      continue;
    }

    items.push({
      id,
      password,
      name,
      role,
      division,
      status,
      createdAt,
    });
  }

  return { items, errors };
};

export const exportUsersToCsv = (users: User[]): string => {
  const lines = [USERS_CSV_HEADERS.join(',')];
  for (const u of users) {
    lines.push([
      escapeCsv(u.id),
      escapeCsv(u.password),
      escapeCsv(u.name),
      u.role,
      escapeCsv(u.division || 'ALL'),
      u.status,
      escapeCsv(u.createdAt)
    ].join(','));
  }
  return lines.join('\n');
};

// ================= GN DIVISIONS CSV ================= //
export const DIVISIONS_CSV_HEADERS = ['Division_Code', 'Name_Tamil', 'Name_English', 'GN_Officer_Name', 'Population', 'Households'];

export const generateDivisionsSampleCsv = (): string => {
  const sampleRows = [
    DIVISIONS_CSV_HEADERS.join(','),
    '213,கதிரவெளி,KATHIRAVELI,A. Balamurugan,2750,690',
    '213B,கட்டுமுறிவு,KADDUMURIVU,M. Sivalingam,1420,360',
    '211C,பனிச்சங்கேணி,PANICHCHANKERNI,V. Suresh,2310,580',
    '211D,வட்டவான்,VADDAVAAN,T. Karunakaran,1530,380',
    '211A,காயான்கேணி,KAYANKERNI,S. Pathmanathan,2600,650',
    '212B,உரியன்கட்டு,UOORIYANKADDU,K. Raveendran,1390,350',
    '211E,மதுரங்கேணிக்குளம்,MATHURANKERNIKULAM,N. Loganathan,1180,290',
    '212,வாகரை மத்தி,VAHARAI CENTRAL,R. Tharmarajah,1920,480',
    '211F,கிரிமிச்சை,KIRIMICHCHI,R. Senthil,1720,430',
    '212A,வாகரை வடக்கு,VAHARAI NORTH,K. Sivakumar,2450,610',
    '211,மாங்கேணி மத்தி,MANKERNI CENTRAL,T. Krishnarajah,2890,720',
    '213D,அம்மந்தனாவெளி,AMMANTHANAAVELI,G. Mohan,1840,460',
    '213C,பூச்சக்கேணி,PUCHCHAKKERNI,V. Vasanthan,1260,320',
    '211B,புனானை கிழக்கு,PUNAANAI EAST,P. Vijayan,1650,410',
    '213A,பால்சேனை,PAALCHENAI,S. Mahendran,2180,540',
    '211G,மாங்கேணி தெற்கு,MANKERNI SOUTH,M. Yogarajah,1980,510'
  ];
  return sampleRows.join('\n');
};

export const exportDivisionsToCsv = (divs: GNDivision[]): string => {
  const lines = [DIVISIONS_CSV_HEADERS.join(',')];
  for (const d of divs) {
    lines.push([
      escapeCsv(d.code),
      escapeCsv(d.nameTa),
      escapeCsv(d.nameEn),
      escapeCsv(d.gnOfficerName || ''),
      d.population || 0,
      d.households || 0
    ].join(','));
  }
  return lines.join('\n');
};

// ================= FAMILIES CSV (குடும்பப் பதிவு மாதிரி & அப்லோட்) ================= //
export const FAMILIES_CSV_HEADERS = [
  'Family_Code',
  'Division_Code',
  'Household_No',
  'Head_NIC',
  'Head_Name_Tamil',
  'Head_Name_English',
  'Gender',
  'DOB',
  'Phone',
  'Address',
  'Total_Members',
  'Woman_Headed_YN',
  'Samurdhi_YN',
  'Pregnant_Mother_YN',
  'Disability_YN',
  'Notes'
];

export const generateFamiliesSampleCsv = (): string => {
  const sampleRows = [
    FAMILIES_CSV_HEADERS.join(','),
    'FAM-211-042,211,HH-211-042,198421500321,முருகேசு தர்மலிங்கம்,Murugesu Tharmalingam,MALE,1984-05-12,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",5,NO,YES,YES,YES,5 உறுப்பினர் குடும்பம் (கர்ப்பிணி & மாற்றுத்திறனாளி)',
    'FAM-212A-088,212A,HH-212A-088,199074500812,கனகரத்தினம் கமலாதேவி,Kanagarathnam Kamaladevi,FEMALE,1990-11-20,0777654321,"கடற்கரை வீதி, வாகரை வடக்கு",3,YES,YES,NO,NO,பெண்தலைமைத்துவ குடும்பம் - சமுர்த்தி பயனாளி',
    'FAM-212-019,212,HH-212-019,195531200194,பொன்னம்பலம் செல்லையா,Ponnambalam Chelliah,MALE,1955-03-14,0714567890,"கோவில் வீதி, வாகரை மத்தி",2,NO,NO,NO,NO,70+ வயது முதியோர் குடும்பம்',
    'FAM-211A-102,211A,HH-211A-102,197519000451,இராசையா நகுலேஸ்வரன்,Rasiah Naguleswaran,MALE,1975-07-09,0772345678,"பள்ளிக்குடா, காயான்கேணி",4,NO,NO,NO,NO,கடற்றொழிலாளர் குடும்பம்',
    'FAM-213-015,213,HH-213-015,198862100492,செல்வராசா கவிதா,Selvarasa Kavitha,FEMALE,1988-08-16,0779988776,"ஆலடி வீதி, கதிரவெளி",4,YES,NO,YES,NO,கர்ப்பிணித் தாய் உள்ள குடும்பம் (ECDO)'
  ];
  return sampleRows.join('\n');
};

export const parseFamiliesFromCsv = (
  csvText: string,
  existingBeneficiaries: Beneficiary[]
): { items: Beneficiary[]; errors: string[]; familyCount: number } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) {
    return { items: [], errors: ['CSV file is empty or missing data rows.'], familyCount: 0 };
  }

  const items: Beneficiary[] = [];
  const errors: string[] = [];
  const processedFamilyCodes = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 4 || !row.some((cell) => cell.trim())) continue;

    const [
      familyCodeRaw,
      divisionCodeRaw,
      householdNoRaw,
      headNicRaw,
      nameTaRaw,
      nameEnRaw,
      genderRaw,
      dobRaw,
      phoneRaw,
      addressRaw,
      totalMembersRaw,
      womanHeadedRaw,
      samurdhiRaw,
      pregnantRaw,
      disabilityRaw,
      notesRaw
    ] = row;

    const divisionCode = divisionCodeRaw?.trim() || '211';
    const familyCode = familyCodeRaw?.trim().toUpperCase() || `FAM-${divisionCode}-${Math.floor(Math.random() * 900 + 100)}`;
    const headNic = headNicRaw?.trim() || generateProvisionalNic(divisionCode);
    const nameTa = nameTaRaw?.trim() || 'பெயர் குறிப்பிடப்படவில்லை';
    const nameEn = nameEnRaw?.trim() || nameTa;
    const householdNo = householdNoRaw?.trim() || `HH-${divisionCode}-001`;

    const isWomanHeaded = (womanHeadedRaw || '').toUpperCase().startsWith('Y') || (womanHeadedRaw || '').includes('ஆம்');
    const isSamurdhi = (samurdhiRaw || '').toUpperCase().startsWith('Y') || (samurdhiRaw || '').includes('ஆம்');
    const isPregnant = (pregnantRaw || '').toUpperCase().startsWith('Y') || (pregnantRaw || '').includes('ஆம்');
    const isDisability = (disabilityRaw || '').toUpperCase().startsWith('Y') || (disabilityRaw || '').includes('ஆம்');

    // Generate STRICTLY UNIQUE Family Master QR code for this household
    const familyQrPayload = generateUniqueFamilyQrPayload(familyCode, divisionCode);
    const systemId = generateSystemCitizenId(divisionCode, existingBeneficiaries.length + items.length + 1);

    const beneficiaryRecord: Beneficiary = {
      id: systemId,
      nic: headNic,
      isProvisionalNic: headNic.startsWith('TNIC'),
      nameTa,
      nameEn,
      gender: (genderRaw?.trim().toUpperCase() === 'FEMALE' || isWomanHeaded) ? 'FEMALE' : 'MALE',
      dob: dobRaw?.trim() || '1985-01-01',
      phone: phoneRaw?.trim() || '',
      address: addressRaw?.trim() || `வாகரை (${divisionCode})`,
      divisionCode,
      familyHead: true,
      householdNo,
      familyCode,
      familyRelationship: 'HEAD',
      isWomanHeadedHousehold: isWomanHeaded,
      isSamurdhiBeneficiary: isSamurdhi,
      isPregnantMother: isPregnant,
      pregnancyStageMonths: isPregnant ? 5 : undefined,
      isPersonWithDisability: isDisability,
      disabilityType: isDisability ? 'உடல் ஊனம் (Physical Disability)' : undefined,
      welfareScheme: isSamurdhi ? 'SAMURDHI' : isDisability ? 'DISABILITY' : 'NONE',
      welfareStatus: 'ACTIVE',
      chronicIllness: isDisability ? 'DISABILITY_PHYSICAL' : 'NONE',
      barcode: headNic,
      qrPayload: `ID:${systemId}|NIC:${headNic}|DIV:${divisionCode}|FAM:${familyCode}`,
      familyQrPayload,
      notes: notesRaw?.trim() || `குடும்ப CSV மூலம் பதிவேற்றப்பட்டது (உறுப்பினர்கள்: ${totalMembersRaw || '1'})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    items.push(beneficiaryRecord);
    processedFamilyCodes.add(familyCode);
  }

  return { items, errors, familyCount: processedFamilyCodes.size };
};

// ================= ASSISTANCE / RELIEF CSV (உதவி வழங்கல் மாதிரி & அப்லோட்) ================= //
export const ASSISTANCE_CSV_HEADERS = [
  'Aid_ID',
  'Family_Code',
  'Beneficiary_NIC',
  'Beneficiary_Name',
  'Division_Code',
  'Aid_Category',
  'Aid_Description',
  'Amount_Or_Value',
  'Donor_Or_Org',
  'Distribution_Date',
  'Officer_Name',
  'Notes'
];

export const generateAssistanceSampleCsv = (): string => {
  const today = new Date().toISOString().slice(0, 10);
  const sampleRows = [
    ASSISTANCE_CSV_HEADERS.join(','),
    `AID-2026-101,FAM-211-042,198421500321,முருகேசு தர்மலிங்கம்,211,DRY_RATIONS,"25kg உலர் உணவுப் பொதி",Rs. 7500,பிரதேச செயலக அனர்த்த நிவாரணம்,${today},அட்மின் 1 (Admin 1),வெள்ள அனர்த்த நிவாரணம்`,
    `AID-2026-102,FAM-211-088,199074500812,கனகரத்தினம் கமலாதேவி,211,LIVELIHOOD_TOOL,"மின்சார தையல் இயந்திரம்",Rs. 45000,சமுர்த்தி வாழ்வாதார நிதி,${today},சமுர்த்தி அலுவலர் (Samurdhi),சுயதொழில் ஊக்குவிப்பு`,
    `AID-2026-103,FAM-212-019,195531200194,பொன்னம்பலம் செல்லையா,212,MEDICAL_ASSISTANCE,"முதியோர் மருத்துவ உதவி",Rs. 10000,சமூக சேவைகள் பிரிவு,${today},அட்மின் 2 (Admin 2),மருத்துவ சிகிச்சை உதவி`,
    `AID-2026-104,FAM-213A-015,198862100492,செல்வராசா கவிதா,213A,OTHER,"கர்ப்பிணித் தாய் போசணை உணவுப் பொதி",Rs. 5000,ECDO சிறுவர் & மகளிர் பிரிவு,${today},ECDO அலுவலர்,போசணை மேம்பாட்டுத் திட்டம்`
  ];
  return sampleRows.join('\n');
};

export const parseAssistanceFromCsv = (
  csvText: string,
  existingAssistance: AssistanceRecord[],
  existingBeneficiaries: Beneficiary[]
): {
  validRecords: AssistanceRecord[];
  duplicateRecords: AssistanceRecord[];
  errors: string[];
} => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) {
    return { validRecords: [], duplicateRecords: [], errors: ['CSV file is empty or missing data rows.'] };
  }

  const validRecords: AssistanceRecord[] = [];
  const duplicateRecords: AssistanceRecord[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 4 || !row.some((cell) => cell.trim())) continue;

    const [
      aidIdRaw,
      familyCodeRaw,
      nicRaw,
      nameRaw,
      divisionRaw,
      categoryRaw,
      descRaw,
      amountRaw,
      donorRaw,
      dateRaw,
      officerRaw,
      notesRaw
    ] = row;

    const familyCode = familyCodeRaw?.trim().toUpperCase() || '';
    const nic = nicRaw?.trim() || '';
    const divisionCode = divisionRaw?.trim() || '211';
    const aidCategory = (categoryRaw?.trim().toUpperCase() || 'OTHER') as AidCategory;
    const distributedDate = dateRaw?.trim() || new Date().toISOString().slice(0, 10);
    const id = aidIdRaw?.trim() || `AID-${Date.now()}-${i}`;

    // Lookup beneficiary for auto-completion if name not given
    const matchedBeneficiary = existingBeneficiaries.find(
      (b) => (familyCode && b.familyCode?.toUpperCase() === familyCode) || (nic && b.nic === nic)
    );

    const beneficiaryName = nameRaw?.trim() || matchedBeneficiary?.nameTa || matchedBeneficiary?.nameEn || 'பயனாளி';
    const familyQrPayload = matchedBeneficiary?.familyQrPayload || generateUniqueFamilyQrPayload(familyCode, divisionCode);

    // Run Duplicate Prevention Engine on this row!
    const duplicateCheck = checkDuplicateAssistance(
      familyCode,
      nic,
      aidCategory,
      [...existingAssistance, ...validRecords]
    );

    const record: AssistanceRecord = {
      id,
      familyCode: familyCode || matchedBeneficiary?.familyCode || `FAM-${divisionCode}-001`,
      familyQrPayload,
      beneficiaryNic: nic || matchedBeneficiary?.nic || '',
      beneficiaryName,
      divisionCode,
      aidCategory,
      aidDescription: descRaw?.trim() || 'அத்தியாவசிய உதவி / நிவாரணம்',
      amountOrValue: amountRaw?.trim() || 'வழங்கப்பட்டது',
      donorOrOrganization: donorRaw?.trim() || 'பிரதேச செயலகம் வாகரை',
      distributedDate,
      officerName: officerRaw?.trim() || 'நிவாரண அலுவலர்',
      officerId: 'OFFICER',
      status: duplicateCheck.hasDuplicateRisk ? 'REJECTED_DUPLICATE' : 'DISTRIBUTED',
      isDuplicate: duplicateCheck.hasDuplicateRisk,
      duplicateWarningReason: duplicateCheck.hasDuplicateRisk ? duplicateCheck.warningMessageTa : undefined,
      notes: notesRaw?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    if (duplicateCheck.hasDuplicateRisk) {
      duplicateRecords.push(record);
    } else {
      validRecords.push(record);
    }
  }

  return { validRecords, duplicateRecords, errors };
};

export const exportAssistanceToCsv = (records: AssistanceRecord[]): string => {
  const lines = [ASSISTANCE_CSV_HEADERS.join(',')];
  for (const r of records) {
    lines.push([
      escapeCsv(r.id),
      escapeCsv(r.familyCode),
      escapeCsv(r.beneficiaryNic),
      escapeCsv(r.beneficiaryName),
      escapeCsv(r.divisionCode),
      escapeCsv(r.aidCategory),
      escapeCsv(r.aidDescription),
      escapeCsv(r.amountOrValue),
      escapeCsv(r.donorOrOrganization),
      escapeCsv(r.distributedDate),
      escapeCsv(r.officerName),
      escapeCsv(r.notes || '')
    ].join(','));
  }
  return lines.join('\n');
};

export const exportFamiliesToCsv = (beneficiaries: Beneficiary[]): string => {
  const lines = [FAMILIES_CSV_HEADERS.join(',')];
  // Group by familyCode
  const familyMap = new Map<string, Beneficiary[]>();
  for (const b of beneficiaries) {
    const famCode = b.familyCode || `FAM-${b.divisionCode}-001`;
    const list = familyMap.get(famCode) || [];
    list.push(b);
    familyMap.set(famCode, list);
  }

  for (const [famCode, members] of familyMap.entries()) {
    const head = members.find((m) => m.familyHead || m.familyRelationship === 'HEAD') || members[0];
    const hasPregnant = members.some((m) => m.isPregnantMother);
    const hasDisability = members.some((m) => m.isPersonWithDisability || m.chronicIllness === 'DISABILITY_PHYSICAL');
    const isWomanHeaded = members.some((m) => m.isWomanHeadedHousehold);
    const isSamurdhi = members.some((m) => m.isSamurdhiBeneficiary || m.welfareScheme === 'SAMURDHI');

    lines.push([
      escapeCsv(famCode),
      escapeCsv(head.divisionCode),
      escapeCsv(head.householdNo || `HH-${head.divisionCode}-001`),
      escapeCsv(head.nic),
      escapeCsv(head.nameTa),
      escapeCsv(head.nameEn),
      escapeCsv(head.gender),
      escapeCsv(head.dob),
      escapeCsv(head.phone),
      escapeCsv(head.address),
      members.length,
      isWomanHeaded ? 'YES' : 'NO',
      isSamurdhi ? 'YES' : 'NO',
      hasPregnant ? 'YES' : 'NO',
      hasDisability ? 'YES' : 'NO',
      escapeCsv(`உறுப்பினர்கள்: ${members.map((m) => m.nameTa).join('; ')}`)
    ].join(','));
  }
  return lines.join('\n');
};

function escapeCsv(value: string | number): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
