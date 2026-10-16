import { Beneficiary, User, GNDivision, Role, WelfareScheme, ChronicIllness, WelfareStatus } from '../types';
import { generateSystemCitizenId, generateProvisionalNic } from './storage';

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
    'VHR-211-2026-0001,198421500321,முருகேசு தர்மலிங்கம்,Murugesu Tharmalingam,MALE,1984-05-12,0771234567,"பிரதான வீதி, வாகரை வடக்கு",211,YES,HH-211-042,CKD_KIDNEY,ASWESUMA_EXTREME,சிறுநீரக நோயாளி மற்றும் தீவிர வறுமை உதவி',
    'VHR-211-2026-0002,199074500812,கனகரத்தினம் கமலாதேவி,Kanagarathnam Kamaladevi,FEMALE,1990-11-20,0777654321,"கடற்கரை வீதி, வாகரை",211,YES,HH-211-088,NONE,SAMURDHI,சுயதொழில் தையல் இயந்திர உதவி',
    'VHR-211-2026-0003,TNIC-211-2026-10492,தர்மலிங்கம் கஜன்,Tharmalingam Kajan,MALE,2010-03-14,0771234567,"பிரதான வீதி, வாகரை",211,NO,HH-211-042,NONE,NONE,16 வயது பூர்த்தி (NIC விண்ணப்பத்திற்கு)',
    'VHR-212-2026-0001,195531200194,பொன்னம்பலம் செல்லையா,Ponnambalam Chelliah,MALE,1955-03-14,0714567890,"கோவில் வீதி, மாங்கேணி",212,YES,HH-212-019,HEART_DISEASE,ELDERLY,70+ முதியோர் கொடுப்பனவு',
    'VHR-214-2026-0001,197519000451,இராசையா நகுலேஸ்வரன்,Rasiah Naguleswaran,MALE,1975-07-09,0772345678,"பள்ளிக்குடா, காயான்கேணி",214,YES,HH-214-102,CANCER,FISHERY_AID,புற்றுநோய் சிகிச்சை மற்றும் கடற்றொழிலாளர் உதவி'
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
    '211,வாகரை வடக்கு,Vaharai North,K. Sivakumar,2450,610',
    '211A,வாகரை தெற்கு,Vaharai South,S. Mahendran,2180,540',
    '211B,வாகரை மத்தி,Vaharai Central,R. Tharmarajah,1920,480',
    '212,மாங்கேணி,Mankerny,T. Krishnarajah,2890,720',
    '212A,கண்டலடி,Kandaladi,M. Yogarajah,1650,410',
    '212B,பனிச்சங்கேணி,Pannichankerny,V. Suresh,2310,580',
    '213,வாகரை,Vakarai,K. Raveendran,3100,790',
    '213A,கதிரவெளி,Kathiraveli,A. Balamurugan,2750,690'
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

function escapeCsv(value: string | number): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
