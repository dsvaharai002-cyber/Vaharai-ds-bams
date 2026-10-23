import { 
  User, 
  Beneficiary, 
  QueueToken, 
  GNDivision, 
  SystemAuditLog, 
  ChronicIllness, 
  WelfareScheme, 
  WelfareStatus,
  AssistanceRecord,
  DuplicateAidCheckResult
} from '../types';
import initialDatabaseSeed from '../data/central_database.json';
import { scheduleAutoDriveSync } from './googleDrive';

const STORAGE_KEYS = {
  USERS: 'vaharai_ds_users_v4',
  BENEFICIARIES: 'vaharai_ds_beneficiaries_v4',
  TOKENS: 'vaharai_ds_tokens_v4',
  DIVISIONS: 'vaharai_ds_divisions_v6',
  AUDIT_LOGS: 'vaharai_ds_audit_logs_v4',
  ASSISTANCE: 'vaharai_ds_assistance_v4',
};

// Age calculation helper
export const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
};

// System-generated Citizen ID
export const generateSystemCitizenId = (divisionCode: string = '211', count: number = 1): string => {
  const year = new Date().getFullYear();
  const seq = String(count).padStart(4, '0');
  return `VHR-${divisionCode}-${year}-${seq}`;
};

// Provisional Computer NIC for citizens without card
export const generateProvisionalNic = (divisionCode: string = '211'): string => {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
  return `TNIC-${divisionCode}-${year}-${randomSuffix}`;
};

// Strictly unique Family Code & Master QR Payload generator
export const generateUniqueFamilyCode = (divisionCode: string = '211', count: number = 1): string => {
  const seq = String(count).padStart(3, '0');
  return `FAM-${divisionCode}-${seq}`;
};

export const generateUniqueFamilyQrPayload = (familyCode: string, divisionCode: string = '211'): string => {
  const salt = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VHR-FAMILY|FAM:${familyCode}|DIV:${divisionCode}|UID:${familyCode}-${salt}`;
};

// 16 Official GN Divisions in Koralaipattu North (Vaharai) strictly matching user specification:
// 1. KATHIRAVELI (213)
// 2. KADDUMURIVU (213B)
// 3. PANICHCHANKERNI (211C)
// 4. VADDAVAAN (211D)
// 5. KAYANKERNI (211A)
// 6. UOORIYANKADDU (213B / 212B)
// 7. MATHURANKERNIKULAM (211E)
// 8. VAHARAI CENTRAL (212)
// 9. KIRIMICHCHI (211F)
// 10. VAHARAI NORTH (212A)
// 11. MANKERNI CENTRAL (211)
// 12. AMMANTHANAAVELI (213D)
// 13. PUCHCHAKKERNI (213C)
// 14. PUNAANAI EAST (211B)
// 15. PAALCHENAI (213A)
// 16. MANKERNI SOUTH (211G)
export const DEFAULT_DIVISIONS: GNDivision[] = ((initialDatabaseSeed as any)?.divisions as GNDivision[]) || [
  { code: '213', nameEn: 'Kathiraveli', nameTa: 'கதிரவெளி', gnOfficerName: 'A. Balamurugan', population: 2750, households: 690 },
  { code: '213B', nameEn: 'Kaddumurivu', nameTa: 'கட்டுமுறிவு', gnOfficerName: 'M. Sivalingam', population: 1420, households: 360 },
  { code: '211C', nameEn: 'Panichchankerni', nameTa: 'பனிச்சங்கேணி', gnOfficerName: 'V. Suresh', population: 2310, households: 580 },
  { code: '211D', nameEn: 'Vaddavaan', nameTa: 'வட்டவான்', gnOfficerName: 'T. Karunakaran', population: 1530, households: 380 },
  { code: '211A', nameEn: 'Kayankerni', nameTa: 'காயான்கேணி', gnOfficerName: 'S. Pathmanathan', population: 2600, households: 650 },
  { code: '212B', nameEn: 'Uooriyankaddu (213B / 212B)', nameTa: 'உரியன்கட்டு (213B / 212B)', gnOfficerName: 'K. Raveendran', population: 1390, households: 350 },
  { code: '211E', nameEn: 'Mathurankernikulam', nameTa: 'மதுரங்கேணிக்குளம்', gnOfficerName: 'N. Loganathan', population: 1180, households: 290 },
  { code: '212', nameEn: 'Vaharai Central', nameTa: 'வாகரை மத்தி', gnOfficerName: 'R. Tharmarajah', population: 1920, households: 480 },
  { code: '211F', nameEn: 'Kirimichchi', nameTa: 'கிரிமிச்சை', gnOfficerName: 'R. Senthil', population: 1720, households: 430 },
  { code: '212A', nameEn: 'Vaharai North', nameTa: 'வாகரை வடக்கு', gnOfficerName: 'K. Sivakumar', population: 2450, households: 610 },
  { code: '211', nameEn: 'Mankerni Central', nameTa: 'மாங்கேணி மத்தி', gnOfficerName: 'T. Krishnarajah', population: 2890, households: 720 },
  { code: '213D', nameEn: 'Ammanthanaaveli', nameTa: 'அம்மந்தனாவெளி', gnOfficerName: 'G. Mohan', population: 1840, households: 460 },
  { code: '213C', nameEn: 'Puchchakkerni', nameTa: 'பூச்சக்கேணி', gnOfficerName: 'V. Vasanthan', population: 1260, households: 320 },
  { code: '211B', nameEn: 'Punaanai East', nameTa: 'புனானை கிழக்கு', gnOfficerName: 'P. Vijayan', population: 1650, households: 410 },
  { code: '213A', nameEn: 'Paalchenai', nameTa: 'பால்சேனை', gnOfficerName: 'S. Mahendran', population: 2180, households: 540 },
  { code: '211G', nameEn: 'Mankerni South', nameTa: 'மாங்கேணி தெற்கு', gnOfficerName: 'M. Yogarajah', population: 1980, households: 510 },
];

export const getDivisionByCode = (code: string, divisions: GNDivision[] = DEFAULT_DIVISIONS): GNDivision | undefined => {
  if (!code) return undefined;
  const clean = code.trim().toUpperCase();
  return (
    divisions.find((d) => d.code.toUpperCase() === clean) ||
    (clean === '213B' ? divisions.find((d) => d.nameEn.includes('Uooriyankaddu') || d.code === '213B') : undefined) ||
    (clean === '212B' ? divisions.find((d) => d.code === '212B') : undefined) ||
    divisions.find((d) => d.nameEn.toUpperCase().includes(clean) || d.nameTa.includes(clean))
  );
};

// Initial Staff Users matching prompt: Admin 1, Admin 2, Super Admin, GN, Data Entry, Reception, and Normal (TV Display)
export const DEFAULT_USERS: User[] = ((initialDatabaseSeed as any)?.users as User[]) || [
  {
    id: '123',
    password: '123',
    name: 'a (GN Officer - Vaharai North)',
    role: 'GRAMANIILATHARI',
    division: '212A',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '456',
    password: '123',
    name: 'b (Administrative Officer 01 - Admin 1)',
    role: 'ADMIN 1',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '457',
    password: '123',
    name: 'b2 (Administrative Officer 02 - Admin 2)',
    role: 'ADMIN 2',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '789',
    password: '123',
    name: 'c (Divisional Secretary - Superadmin)',
    role: 'SUPERADMIN',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '1112',
    password: '123',
    name: 'd (Data Entry Specialist)',
    role: 'DATAENRY OFFCER',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '2026',
    password: '123',
    name: 'hhhh',
    role: 'DATAENRY OFFCER',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '555',
    password: '123',
    name: 'e (Front Desk Registrar)',
    role: 'Reception Registrar',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '999',
    password: '123',
    name: 'Waiting Hall Display Screen (Live Counter)',
    role: 'NORMAL',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '601',
    password: '123',
    name: 'S. Nithya (ECDO - கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)',
    role: 'ECDO',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '602',
    password: '123',
    name: 'T. Vimalan (அங்கவீனர் / மாற்றுத்திறனாளிகள் பதிவாளர்)',
    role: 'DISABILITY_OFFICER',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '603',
    password: '123',
    name: 'K. Geetha (பெண் தலைமைத்துவ குடும்பங்கள் பதிவாளர்)',
    role: 'WHH_OFFICER',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '604',
    password: '123',
    name: 'M. Pathmanathan (சமுர்த்தி அபிவிருத்தி உத்தியோகத்தர்)',
    role: 'SAMURDHI_OFFICER',
    division: 'ALL',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
];

// Initial Realistic Citizens / Beneficiaries in Vaharai
export const DEFAULT_BENEFICIARIES: Beneficiary[] = ((initialDatabaseSeed as any)?.beneficiaries as Beneficiary[]) || [
  // Family 1: 5 Members sharing SAME Family Code & SAME Family Master QR Code!
  {
    id: 'VHR-211-2026-0001',
    nic: '198421500321',
    isProvisionalNic: false,
    nameTa: 'முருகேசு தர்மலிங்கம்',
    nameEn: 'Murugesu Tharmalingam',
    gender: 'MALE',
    dob: '1984-05-12',
    phone: '0771234567',
    address: 'பிரதான வீதி, வாகரை வடக்கு (211)',
    divisionCode: '211',
    familyHead: true,
    householdNo: 'HH-211-042',
    familyCode: 'FAM-211-042',
    familyRelationship: 'HEAD',
    welfareScheme: 'ASWESUMA_EXTREME',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'CKD_KIDNEY',
    barcode: '198421500321',
    qrPayload: 'ID:VHR-211-2026-0001|NIC:198421500321|DIV:211|CKD|ASWESUMA_EXTREME',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211-042|HH:HH-211-042|DIV:211|MEMBERS:5',
    notes: 'குடும்பத் தலைவர் - சிறுநீரக நோயாளி மற்றும் தீவிர வறுமை அஸ்வெசும உதவி பெறுநர்',
    createdAt: '2026-01-15T09:30:00Z',
    updatedAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'VHR-211-2026-0004',
    nic: '198865200419',
    isProvisionalNic: false,
    nameTa: 'தர்மலிங்கம் சிவகாமி',
    nameEn: 'Tharmalingam Sivakami',
    gender: 'FEMALE',
    dob: '1988-08-14',
    phone: '0771234567',
    address: 'பிரதான வீதி, வாகரை வடக்கு (211)',
    divisionCode: '211',
    familyHead: false,
    householdNo: 'HH-211-042',
    familyCode: 'FAM-211-042',
    familyRelationship: 'SPOUSE',
    isPregnantMother: true,
    pregnancyStageMonths: 6,
    welfareScheme: 'ASWESUMA_EXTREME',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'NONE',
    barcode: '198865200419',
    qrPayload: 'ID:VHR-211-2026-0004|NIC:198865200419|DIV:211|PREGNANT_6M',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211-042|HH:HH-211-042|DIV:211|MEMBERS:5',
    notes: 'கர்ப்பிணித் தாய் - ECDO பதிவாளர் விசேட பதிவு (6வது மாதம்)',
    createdAt: '2026-01-15T09:35:00Z',
    updatedAt: '2026-01-15T09:35:00Z',
  },
  {
    id: 'VHR-211-2026-0003',
    nic: 'TNIC-211-2026-10492',
    isProvisionalNic: true,
    nameTa: 'தர்மலிங்கம் கஜன்',
    nameEn: 'Tharmalingam Kajan',
    gender: 'MALE',
    dob: '2010-03-14',
    phone: '0771234567',
    address: 'பிரதான வீதி, வாகரை வடக்கு (211)',
    divisionCode: '211',
    familyHead: false,
    householdNo: 'HH-211-042',
    familyCode: 'FAM-211-042',
    familyRelationship: 'CHILD',
    welfareScheme: 'NONE',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'NONE',
    barcode: 'TNIC-211-2026-10492',
    qrPayload: 'ID:VHR-211-2026-0003|TNIC:TNIC-211-2026-10492|AGE:16|NIC_REQUIRED',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211-042|HH:HH-211-042|DIV:211|MEMBERS:5',
    notes: 'மகன் - 16 வயதை பூர்த்தி செய்துள்ளார் - புதிய தேசிய அடையாள அட்டைக்கு (NIC) விண்ணப்பிக்க வேண்டும்',
    createdAt: '2026-02-05T11:00:00Z',
    updatedAt: '2026-02-05T11:00:00Z',
  },
  {
    id: 'VHR-211-2026-0005',
    nic: 'TNIC-211-2026-10493',
    isProvisionalNic: true,
    nameTa: 'தர்மலிங்கம் பிரியா',
    nameEn: 'Tharmalingam Priya',
    gender: 'FEMALE',
    dob: '2012-11-04',
    phone: '0771234567',
    address: 'பிரதான வீதி, வாகரை வடக்கு (211)',
    divisionCode: '211',
    familyHead: false,
    householdNo: 'HH-211-042',
    familyCode: 'FAM-211-042',
    familyRelationship: 'CHILD',
    isPersonWithDisability: true,
    disabilityType: 'உடல் ஊனம் (Physical Disability)',
    chronicIllness: 'DISABILITY_PHYSICAL',
    welfareScheme: 'DISABILITY',
    welfareStatus: 'ACTIVE',
    barcode: 'TNIC-211-2026-10493',
    qrPayload: 'ID:VHR-211-2026-0005|DISABILITY|DIV:211',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211-042|HH:HH-211-042|DIV:211|MEMBERS:5',
    notes: 'மகள் - விசேட தேவையுடைய மாற்றுத்திறனாளி (அங்கவீனர் பதிவாளர் பதிவு)',
    createdAt: '2026-02-05T11:10:00Z',
    updatedAt: '2026-02-05T11:10:00Z',
  },
  {
    id: 'VHR-211-2026-0006',
    nic: '194651200109',
    isProvisionalNic: false,
    nameTa: 'முருகேசு வள்ளியம்மை',
    nameEn: 'Murugesu Valliammah',
    gender: 'FEMALE',
    dob: '1946-04-10',
    phone: '0771234567',
    address: 'பிரதான வீதி, வாகரை வடக்கு (211)',
    divisionCode: '211',
    familyHead: false,
    householdNo: 'HH-211-042',
    familyCode: 'FAM-211-042',
    familyRelationship: 'PARENT',
    welfareScheme: 'ELDERLY',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'NONE',
    barcode: '194651200109',
    qrPayload: 'ID:VHR-211-2026-0006|ELDERLY|DIV:211',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211-042|HH:HH-211-042|DIV:211|MEMBERS:5',
    notes: 'பாட்டி - 80 வயது முதியோர் விசேட கொடுப்பனவு பெறுநர்',
    createdAt: '2026-02-05T11:15:00Z',
    updatedAt: '2026-02-05T11:15:00Z',
  },
  // Family 2: Woman-Headed Family (பெண் தலைமைத்துவ குடும்பம் & சமுர்த்தி)
  {
    id: 'VHR-211-2026-0002',
    nic: '199074500812',
    isProvisionalNic: false,
    nameTa: 'கனகரத்தினம் கமலாதேவி',
    nameEn: 'Kanagarathnam Kamaladevi',
    gender: 'FEMALE',
    dob: '1990-11-20',
    phone: '0777654321',
    address: 'கடற்கரை வீதி, வாகரை வடக்கு (211)',
    divisionCode: '211',
    familyHead: true,
    householdNo: 'HH-211-088',
    familyCode: 'FAM-211-088',
    familyRelationship: 'HEAD',
    isWomanHeadedHousehold: true,
    isSamurdhiBeneficiary: true,
    welfareScheme: 'SAMURDHI',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'NONE',
    barcode: '199074500812',
    qrPayload: 'ID:VHR-211-2026-0002|NIC:199074500812|DIV:211|WHH|SAMURDHI',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211-088|HH:HH-211-088|DIV:211|MEMBERS:1',
    notes: 'பெண் தலைமைத்துவ குடும்பம் - சமுர்த்தி வாழ்வாதார தையல் இயந்திர உதவி பெற்றுள்ளார்',
    createdAt: '2026-01-18T10:15:00Z',
    updatedAt: '2026-01-18T10:15:00Z',
  },
  {
    id: 'VHR-212-2026-0001',
    nic: '195531200194',
    isProvisionalNic: false,
    nameTa: 'பொன்னம்பலம் செல்லையா',
    nameEn: 'Ponnambalam Chelliah',
    gender: 'MALE',
    dob: '1955-03-14',
    phone: '0714567890',
    address: 'கோவில் வீதி, மாங்கேணி (212)',
    divisionCode: '212',
    familyHead: true,
    householdNo: 'HH-212-019',
    welfareScheme: 'ELDERLY',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'HEART_DISEASE',
    barcode: '195531200194',
    qrPayload: 'ID:VHR-212-2026-0001|NIC:195531200194|DIV:212|ELDERLY|HEART',
    notes: '70+ முதியோர் கொடுப்பனவு மற்றும் இதய நோய் மருத்துவ உதவி',
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z',
  },
  {
    id: 'VHR-213A-2026-0001',
    nic: 'TNIC-213A-2026-92811',
    isProvisionalNic: true,
    nameTa: 'பாலசுப்பிரமணியம் பிரியங்கா',
    nameEn: 'Balasubramaniam Priyanka',
    gender: 'FEMALE',
    dob: '2010-06-25',
    phone: '0768901234',
    address: 'பாடசாலை வீதி, கதிரவெளி (213A)',
    divisionCode: '213A',
    familyHead: false,
    householdNo: 'HH-213A-055',
    welfareScheme: 'NONE',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'NONE',
    barcode: 'TNIC-213A-2026-92811',
    qrPayload: 'ID:VHR-213A-2026-0001|TNIC:TNIC-213A-2026-92811|AGE:16|NIC_REQUIRED',
    notes: 'கதிரவெளி மகா வித்தியாலய மாணவி - 16 வயது பூர்த்தி (NIC விண்ணப்பத்திற்கு பரிந்துரை)',
    createdAt: '2026-02-01T08:45:00Z',
    updatedAt: '2026-02-01T08:45:00Z',
  },
  {
    id: 'VHR-211A-2026-0001',
    nic: '197519000451',
    isProvisionalNic: false,
    nameTa: 'இராசையா நகுலேஸ்வரன்',
    nameEn: 'Rasiah Naguleswaran',
    gender: 'MALE',
    dob: '1975-07-09',
    phone: '0772345678',
    address: 'பள்ளிக்குடா, காயான்கேணி (211A)',
    divisionCode: '211A',
    familyHead: true,
    householdNo: 'HH-211A-102',
    welfareScheme: 'FISHERY_AID',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'CANCER',
    barcode: '197519000451',
    qrPayload: 'ID:VHR-211A-2026-0001|NIC:197519000451|DIV:211A|FISHERY|CANCER',
    notes: 'புற்றுநோய் சிகிச்சை மற்றும் கடற்றொழிலாளர் நிவாரண உதவி',
    createdAt: '2026-02-10T14:20:00Z',
    updatedAt: '2026-02-10T14:20:00Z',
  },
  {
    id: 'VHR-211C-2026-0001',
    nic: '199852400982',
    isProvisionalNic: false,
    nameTa: 'நடராசா சசிகுமார்',
    nameEn: 'Nadarasa Sasikumar',
    gender: 'MALE',
    dob: '1998-09-12',
    phone: '0754321987',
    address: 'முரக்கொட்டான்கேணி வீதி, பனிச்சங்கேணி (211C)',
    divisionCode: '211C',
    familyHead: true,
    householdNo: 'HH-211C-077',
    welfareScheme: 'DISABILITY',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'DISABILITY_PHYSICAL',
    barcode: '199852400982',
    qrPayload: 'ID:VHR-211C-2026-0001|NIC:199852400982|DIV:211C|DISABILITY',
    notes: 'நிரந்தர உடல் ஊனமுற்றோர் கொடுப்பனவு பெறுநர்',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  },
  {
    id: 'VHR-211A-2026-0002',
    nic: '198263100874',
    isProvisionalNic: false,
    nameTa: 'முத்துலிங்கம் சாந்தகுமாரி',
    nameEn: 'Muthulingam Santhakumari',
    gender: 'FEMALE',
    dob: '1982-04-18',
    phone: '0776543210',
    address: 'கண்டி வீதி, காயான்கேணி (211A)',
    divisionCode: '211A',
    familyHead: true,
    householdNo: 'HH-211A-034',
    welfareScheme: 'CHRONIC_KIDNEY',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'CKD_KIDNEY',
    barcode: '198263100874',
    qrPayload: 'ID:VHR-211A-2026-0001|NIC:198263100874|DIV:211A|CKD_KIDNEY',
    notes: 'மாதாந்த சிறுநீரக நோயாளர் நிதி உதவி 5000/= ரூபா',
    createdAt: '2026-02-18T13:30:00Z',
    updatedAt: '2026-02-18T13:30:00Z',
  }
];

// Initial Queue Tokens with officerToMeet, waiting time, and completion audit details
export const DEFAULT_TOKENS: QueueToken[] = ((initialDatabaseSeed as any)?.tokens as QueueToken[]) || [
  {
    id: 'T-101',
    tokenNumber: 'L-101',
    serviceType: 'LAND_PERMIT',
    counterNo: 2,
    officerToMeet: 'ADMIN 1', // யாரை பார்க்க வேண்டும்: அட்மின் 1
    citizenName: 'முருகேசு தர்மலிங்கம்',
    citizenNic: '198421500321',
    divisionCode: '211',
    status: 'SERVING',
    issuedAt: new Date(Date.now() - 32 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 5 * 60000).toISOString(),
    notes: 'காணி காணி எல்லை நிர்ணய ஆவணங்கள் சரிபார்க்கப்படுகின்றன',
    barcode: 'L-101',
    familyCode: 'FAM-211-042',
  },
  {
    id: 'T-102',
    tokenNumber: 'W-102',
    serviceType: 'WELFARE_SCHEME',
    counterNo: 4,
    officerToMeet: 'ADMIN 2', // யாரை பார்க்க வேண்டும்: அட்மின் 2
    citizenName: 'கனகரத்தினம் கமலாதேவி',
    citizenNic: '199074500812',
    divisionCode: '211',
    status: 'WAITING',
    issuedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    notes: 'சமுர்த்தி சுயதொழில் கடன் விண்ணப்பம் சமர்ப்பிக்கப்பட்டுள்ளது',
    barcode: 'W-102',
    familyCode: 'FAM-211-088',
  },
  {
    id: 'T-103',
    tokenNumber: 'C-103',
    serviceType: 'CIVIL_REGISTRATION',
    counterNo: 1,
    officerToMeet: 'பிறப்பு/இறப்பு பதிவாளர் (Civil Registrar)',
    citizenName: 'தர்மலிங்கம் கஜன் (16 yrs - NIC)',
    citizenNic: 'TNIC-211-2026-10492',
    divisionCode: '211',
    status: 'WAITING',
    issuedAt: new Date(Date.now() - 9 * 60000).toISOString(),
    notes: '16 வயது பூர்த்தி - புதிய NIC விண்ணப்பப் படிவம் பெற வந்துள்ளார்',
    barcode: 'C-103',
    familyCode: 'FAM-211-042',
  },
  // Sample Completed Tokens for Audit View
  {
    id: 'T-100',
    tokenNumber: 'P-100',
    serviceType: 'PUBLIC_ASSISTANCE',
    counterNo: 5,
    officerToMeet: 'ADMIN 2',
    citizenName: 'பொன்னம்பலம் செல்லையா',
    citizenNic: '195531200194',
    divisionCode: '212',
    status: 'COMPLETED',
    issuedAt: new Date(Date.now() - 75 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 45 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    servedByOfficerId: '457',
    servedByOfficerName: 'அட்மின் 02 (Admin 2)',
    serviceDurationMinutes: 15,
    rating: 5,
    ratingFeedback: 'முதியோர் கொடுப்பனவு விரைவாக உறுதிப்படுத்தப்பட்டது. மிக்க நன்றி!',
    notes: 'முதியோர் கொடுப்பனவு விபரம் புதுப்பிக்கப்பட்டது',
    barcode: 'P-100',
  },
  {
    id: 'T-099',
    tokenNumber: 'L-099',
    serviceType: 'LAND_PERMIT',
    counterNo: 2,
    officerToMeet: 'ADMIN 1',
    citizenName: 'நடராசா சசிகுமார்',
    citizenNic: '199852400982',
    divisionCode: '212B',
    status: 'COMPLETED',
    issuedAt: new Date(Date.now() - 110 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 85 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 70 * 60000).toISOString(),
    servedByOfficerId: '456',
    servedByOfficerName: 'அட்மின் 01 (Admin 1)',
    serviceDurationMinutes: 15,
    rating: 4,
    ratingFeedback: 'நன்று - உரிய ஆவண வழிகாட்டல் வழங்கப்பட்டது',
    notes: 'மாற்றுத்திறனாளி அணுகல் வசதியுடன் காணி அனுமதிப்பத்திரம் புதுப்பித்தல்',
    barcode: 'L-099',
  },
];

// Helper to safely read from localStorage
export const getStoredData = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const setStoredData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to write to localStorage for key ${key}:`, err);
  }
};

export const loadUsers = (): User[] => {
  const stored = getStoredData<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  const existingIds = new Set(stored.map((u) => u.id));
  let modified = false;
  const merged = [...stored];
  for (const defUser of DEFAULT_USERS) {
    if (!existingIds.has(defUser.id)) {
      merged.push(defUser);
      modified = true;
    }
  }
  if (modified) {
    setStoredData(STORAGE_KEYS.USERS, merged);
  }
  return merged;
};
export const saveUsers = (users: User[]) => {
  setStoredData(STORAGE_KEYS.USERS, users);
  scheduleCentralSync();
};

export const loadBeneficiaries = (): Beneficiary[] => {
  const stored = getStoredData<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, DEFAULT_BENEFICIARIES);
  const existingIds = new Set(stored.map((b) => b.id));
  let modified = false;
  const merged = [...stored];
  for (const defB of DEFAULT_BENEFICIARIES) {
    if (!existingIds.has(defB.id)) {
      merged.push(defB);
      modified = true;
    }
  }
  // Ensure familyCode and familyQrPayload are populated
  const enriched = merged.map((b) => {
    const familyCode = b.familyCode || (b.householdNo ? `FAM-${b.householdNo.replace(/^HH-/, '')}` : `FAM-${b.divisionCode}-001`);
    const familyQrPayload = b.familyQrPayload || `VHR-FAMILY|FAM:${familyCode}|DIV:${b.divisionCode}`;
    return {
      ...b,
      familyCode,
      familyQrPayload,
    };
  });
  if (modified) {
    setStoredData(STORAGE_KEYS.BENEFICIARIES, enriched);
  }
  return enriched;
};
export const saveBeneficiaries = (items: Beneficiary[]) => {
  setStoredData(STORAGE_KEYS.BENEFICIARIES, items);
  scheduleCentralSync();
};

export const loadTokens = (): QueueToken[] => {
  const stored = getStoredData<QueueToken[]>(STORAGE_KEYS.TOKENS, DEFAULT_TOKENS);
  const existingIds = new Set(stored.map((t) => t.id));
  let modified = false;
  const merged = [...stored];
  for (const defT of DEFAULT_TOKENS) {
    if (!existingIds.has(defT.id)) {
      merged.push(defT);
      modified = true;
    }
  }
  const enriched = merged.map((tok) => ({
    ...tok,
    officerToMeet: tok.officerToMeet || 'அட்மின் 1 (Admin 1)',
  }));
  if (modified) {
    setStoredData(STORAGE_KEYS.TOKENS, enriched);
  }
  return enriched;
};
export const saveTokens = (tokens: QueueToken[]) => {
  setStoredData(STORAGE_KEYS.TOKENS, tokens);
  scheduleCentralSync();
};

export const loadDivisions = (): GNDivision[] => {
  const stored = getStoredData<GNDivision[]>(STORAGE_KEYS.DIVISIONS, DEFAULT_DIVISIONS);
  const storedCodes = new Set(stored.map((d) => d.code));
  // If stored has obsolete divisions (e.g. 215, 214) or does not match 16 divisions, reset to DEFAULT_DIVISIONS
  const hasObsolete = storedCodes.has('215') || storedCodes.has('214') || storedCodes.has('215A') || storedCodes.has('215B');
  if (hasObsolete || stored.length !== 16 || !storedCodes.has('213D') || !storedCodes.has('211G')) {
    setStoredData(STORAGE_KEYS.DIVISIONS, DEFAULT_DIVISIONS);
    return DEFAULT_DIVISIONS;
  }
  return stored;
};
export const saveDivisions = (divs: GNDivision[]) => {
  setStoredData(STORAGE_KEYS.DIVISIONS, divs);
  scheduleCentralSync();
};

export const loadAuditLogs = (): SystemAuditLog[] => getStoredData<SystemAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
export const logAuditAction = (userId: string, userName: string, action: string, details: string) => {
  const current = loadAuditLogs();
  const entry: SystemAuditLog = {
    id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    details,
  };
  saveStoredData(STORAGE_KEYS.AUDIT_LOGS, [entry, ...current.slice(0, 499)]);
  scheduleCentralSync();
};

const saveStoredData = <T>(key: string, data: T) => setStoredData(key, data);

// ================= ASSISTANCE / RELIEF DISTRIBUTION STORAGE ================= //
export const DEFAULT_ASSISTANCE_RECORDS: AssistanceRecord[] = ((initialDatabaseSeed as any)?.assistance as AssistanceRecord[]) || [
  {
    id: 'AID-2026-0001',
    familyCode: 'FAM-211-042',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211-042|DIV:211|UID:FAM-211-042-9X8K',
    beneficiaryNic: '198421500321',
    beneficiaryName: 'முருகேசு தர்மலிங்கம்',
    divisionCode: '211',
    householdNo: 'HH-211-042',
    aidCategory: 'DRY_RATIONS',
    aidDescription: '25kg உலர் உணவுப் பொதி (Dry Rations)',
    amountOrValue: 'Rs. 7,500',
    donorOrOrganization: 'பிரதேச செயலக அனர்த்த நிவாரண நிதி (DS Disaster Fund)',
    distributedDate: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
    officerName: 'அட்மின் 2 (Admin 2)',
    officerId: '456',
    status: 'DISTRIBUTED',
    notes: 'வெள்ள அனர்த்த அவசர உலர் உணவு வழங்கல்',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'AID-2026-0002',
    familyCode: 'FAM-211-088',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211-088|DIV:211|UID:FAM-211-088-7K2M',
    beneficiaryNic: '199074500812',
    beneficiaryName: 'கனகரத்தினம் கமலாதேவி',
    divisionCode: '211',
    householdNo: 'HH-211-088',
    aidCategory: 'LIVELIHOOD_TOOL',
    aidDescription: 'சுயதொழில் மின்சார தையல் இயந்திரம் (Sewing Machine)',
    amountOrValue: 'Rs. 45,000',
    donorOrOrganization: 'சமுர்த்தி அபிவிருத்தி திணைக்களம் (Samurdhi)',
    distributedDate: new Date(Date.now() - 42 * 86400000).toISOString().slice(0, 10),
    officerName: 'சமுர்த்தி அலுவலர் (Samurdhi Officer)',
    officerId: '604',
    status: 'DISTRIBUTED',
    notes: 'பெண்தலைமைத்துவ குடும்ப வாழ்வாதார மேம்பாட்டு உதவி',
    createdAt: new Date(Date.now() - 42 * 86400000).toISOString(),
  },
  {
    id: 'AID-2026-0003',
    familyCode: 'FAM-212-019',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-212-019|DIV:212|UID:FAM-212-019-3M8P',
    beneficiaryNic: '195531200194',
    beneficiaryName: 'பொன்னம்பலம் செல்லையா',
    divisionCode: '212',
    householdNo: 'HH-212-019',
    aidCategory: 'MEDICAL_ASSISTANCE',
    aidDescription: 'முதியோர் இதய சிகிச்சை மற்றும் மருந்து நிதி உதவி',
    amountOrValue: 'Rs. 10,000',
    donorOrOrganization: 'சமூக சேவைகள் திணைக்களம் (Social Services)',
    distributedDate: new Date(Date.now() - 25 * 86400000).toISOString().slice(0, 10),
    officerName: 'அட்மின் 1 (Admin 1)',
    officerId: '123',
    status: 'DISTRIBUTED',
    notes: '70+ வயது முதியோர் விசேட மருத்துவ கொடுப்பனவு',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'AID-2026-0004',
    familyCode: 'FAM-211A-102',
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211A-102|DIV:211A|UID:FAM-211A-102-5B4Q',
    beneficiaryNic: '197519000451',
    beneficiaryName: 'இராசையா நகுலேஸ்வரன்',
    divisionCode: '211A',
    householdNo: 'HH-211A-102',
    aidCategory: 'CASH_GRANT',
    aidDescription: 'கடற்றொழில் வாழ்வாதார உபகரண மீள் கொள்வனவு உதவி',
    amountOrValue: 'Rs. 20,000',
    donorOrOrganization: 'கடற்றொழில் திணைக்கள அவசர நிதி',
    distributedDate: new Date(Date.now() - 65 * 86400000).toISOString().slice(0, 10),
    officerName: 'அட்மின் 2 (Admin 2)',
    officerId: '456',
    status: 'DISTRIBUTED',
    notes: 'புயல் சேத மீன்பிடி வலை புனரமைப்பு உதவி',
    createdAt: new Date(Date.now() - 65 * 86400000).toISOString(),
  },
];

export const loadAssistanceRecords = (): AssistanceRecord[] => {
  const stored = getStoredData<AssistanceRecord[]>(STORAGE_KEYS.ASSISTANCE, DEFAULT_ASSISTANCE_RECORDS);
  const existingIds = new Set(stored.map((a) => a.id));
  let modified = false;
  const merged = [...stored];
  for (const defAid of DEFAULT_ASSISTANCE_RECORDS) {
    if (!existingIds.has(defAid.id)) {
      merged.push(defAid);
      modified = true;
    }
  }
  if (modified) {
    setStoredData(STORAGE_KEYS.ASSISTANCE, merged);
  }
  return merged;
};

export const saveAssistanceRecords = (records: AssistanceRecord[]) => {
  setStoredData(STORAGE_KEYS.ASSISTANCE, records);
  scheduleCentralSync();
};

// ================= DUPLICATE AID DETECTION & PREVENTION ENGINE ================= //
// "ஏனென்றால் ஒரே குடும்பத்திற்கே தொடர்ச்சியான உதவிகள் கிடைக்கிறது இதனை தடுக்க வேண்டும்"
export const checkDuplicateAssistance = (
  familyCode?: string,
  nic?: string,
  category?: string,
  currentRecords?: AssistanceRecord[]
): DuplicateAidCheckResult => {
  const records = currentRecords && currentRecords.length > 0 ? currentRecords : loadAssistanceRecords();
  
  const famCodeClean = familyCode?.trim().toUpperCase();
  const nicClean = nic?.trim().toLowerCase();

  const matchingRecords = records.filter((r) => {
    const famMatch = famCodeClean && r.familyCode && r.familyCode.toUpperCase() === famCodeClean;
    const nicMatch = nicClean && r.beneficiaryNic && r.beneficiaryNic.toLowerCase() === nicClean;
    return famMatch || nicMatch;
  });

  if (matchingRecords.length === 0) {
    return {
      hasDuplicateRisk: false,
      duplicateCount: 0,
      previousRecords: [],
      warningMessageTa: 'இக்குடும்பத்திற்கு இதுவரை எந்த நிவாரண/உதவிப் பதிவும் இல்லை. புதிய உதவி வழங்க தகுதியானது.',
      warningMessageEn: 'No previous relief recorded for this family. Fully eligible.',
      severity: 'SAFE',
    };
  }

  // Sort descending by distributedDate
  matchingRecords.sort((a, b) => new Date(b.distributedDate).getTime() - new Date(a.distributedDate).getTime());
  const lastRecord = matchingRecords[0];
  const lastTime = new Date(lastRecord.distributedDate).getTime();
  const daysDiff = Math.floor((Date.now() - lastTime) / (1000 * 60 * 60 * 24));

  const sameCategoryMatch = category ? matchingRecords.find((r) => r.aidCategory === category) : null;

  let severity: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
  let warningMessageTa = '';
  let warningMessageEn = '';

  if (daysDiff < 30 || sameCategoryMatch) {
    severity = 'CRITICAL';
    warningMessageTa = `⚠️ கடுமையான எச்சரிக்கை: இக்குடும்பத்திற்கு ${daysDiff} நாட்களுக்கு முன்னர் (${lastRecord.distributedDate}) ஏற்கனவே உதவி (${lastRecord.aidDescription} - ${lastRecord.amountOrValue}) வழங்கப்பட்டுள்ளது! தொடர்ச்சியான இரட்டை உதவிகளைத் தவிர்க்கவும்!`;
    warningMessageEn = `CRITICAL WARNING: This family already received assistance (${lastRecord.aidDescription}) ${daysDiff} days ago on ${lastRecord.distributedDate}. Continuous aid duplication risk!`;
  } else if (daysDiff < 90) {
    severity = 'WARNING';
    warningMessageTa = `கவனிக்க: இக்குடும்பம் ${daysDiff} நாட்களுக்கு முன் (${lastRecord.distributedDate}) உதவி பெற்றுள்ளது. மொத்தம் ${matchingRecords.length} முறை உதவி பெறப்பட்டுள்ளது.`;
    warningMessageEn = `Notice: This family received relief ${daysDiff} days ago (${lastRecord.distributedDate}). Total past assistances: ${matchingRecords.length}.`;
  } else {
    severity = 'SAFE';
    warningMessageTa = `இக்குடும்பம் கடைசியாக ${daysDiff} நாட்களுக்கு முன் உதவி பெற்றுள்ளது. புதிய உதவி வழங்க அனுமதிக்கலாம்.`;
    warningMessageEn = `Last assistance was ${daysDiff} days ago. Can be considered for new relief.`;
  }

  return {
    hasDuplicateRisk: severity === 'CRITICAL' || severity === 'WARNING',
    duplicateCount: matchingRecords.length,
    lastDistributedDate: lastRecord.distributedDate,
    daysSinceLastAid: daysDiff,
    previousRecords: matchingRecords,
    warningMessageTa,
    warningMessageEn,
    severity,
  };
};

// Database Snapshot for Google Drive / JSON file
export const createDatabaseSnapshot = () => {
  return {
    version: '3.1',
    exportedAt: new Date().toISOString(),
    organization: 'Divisional Secretariat Koralaipattu North (Vaharai)',
    users: loadUsers(),
    beneficiaries: loadBeneficiaries(),
    tokens: loadTokens(),
    divisions: loadDivisions(),
    auditLogs: loadAuditLogs(),
    assistance: loadAssistanceRecords(),
  };
};

export const restoreDatabaseFromSnapshot = (snapshot: any): boolean => {
  if (!snapshot || !snapshot.beneficiaries || !snapshot.users) {
    throw new Error('Invalid backup file structure.');
  }
  if (Array.isArray(snapshot.users)) setStoredData(STORAGE_KEYS.USERS, snapshot.users);
  if (Array.isArray(snapshot.beneficiaries)) setStoredData(STORAGE_KEYS.BENEFICIARIES, snapshot.beneficiaries);
  if (Array.isArray(snapshot.tokens)) setStoredData(STORAGE_KEYS.TOKENS, snapshot.tokens);
  if (Array.isArray(snapshot.divisions)) setStoredData(STORAGE_KEYS.DIVISIONS, snapshot.divisions);
  if (Array.isArray(snapshot.assistance)) setStoredData(STORAGE_KEYS.ASSISTANCE, snapshot.assistance);
  if (Array.isArray(snapshot.auditLogs)) setStoredData(STORAGE_KEYS.AUDIT_LOGS, snapshot.auditLogs);
  
  notifyCrossTabSync('DATABASE_RESTORED');
  return true;
};

if (typeof window !== 'undefined') {
  (window as any).__vaharai_create_snapshot = createDatabaseSnapshot;
}

// ================= CROSS-TAB & BROADCAST SYNCHRONIZATION ================= //
export const notifyCrossTabSync = (actionType: string = 'DATA_UPDATED') => {
  if (typeof window === 'undefined') return;
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('vaharai_ds_sync_channel');
      channel.postMessage({ type: actionType, timestamp: Date.now() });
      channel.close();
    }
    window.dispatchEvent(new CustomEvent('vaharai_db_updated', { detail: { action: actionType } }));
  } catch {
    // ignore
  }
};

// ================= CENTRAL SERVER / GOOGLE DRIVE SYNCHRONIZATION ================= //
let syncDebounceTimer: any = null;
let serverApiAvailable: boolean | null = null; // null = not checked yet, false = 404/not available, true = available

export const isServerApiAvailable = (): boolean => {
  return serverApiAvailable !== false;
};

export const scheduleCentralSync = () => {
  if (typeof window === 'undefined') return;

  // Broadcast to other open tabs and windows on the same browser immediately!
  notifyCrossTabSync('RECORD_SAVED');

  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    const snapshot = createDatabaseSnapshot();
    // 1. Automatically push to the designated Google Drive file if authenticated
    scheduleAutoDriveSync(snapshot);

    // 2. Also push to central backend server if available
    if (serverApiAvailable !== false) {
      pushToCentralDatabase(snapshot);
    }
  }, 800);
};

export const fetchCentralDatabase = async (): Promise<any | null> => {
  // If we already know /api/database does not exist on this host (e.g. Vercel static deployment), don't spam 404
  if (serverApiAvailable === false) {
    return null;
  }

  try {
    const res = await fetch('/api/database');
    if (!res.ok) {
      serverApiAvailable = false;
      console.info(`[Vaharai DS] Central /api/database returned status ${res.status}. Active mode: Cloud Drive & Local Storage.`);
      return null;
    }
    serverApiAvailable = true;
    const body = await res.json();
    if (body.success && body.data) {
      return body.data;
    }
    return null;
  } catch {
    serverApiAvailable = false;
    return null;
  }
};

export const pushToCentralDatabase = async (snapshot?: any): Promise<boolean> => {
  if (serverApiAvailable === false) {
    return false;
  }

  try {
    const data = snapshot || createDatabaseSnapshot();
    const res = await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      serverApiAvailable = false;
      return false;
    }
    serverApiAvailable = true;
    return true;
  } catch {
    serverApiAvailable = false;
    return false;
  }
};

export const getCentralDatabaseStatus = async (): Promise<any | null> => {
  if (serverApiAvailable === false) {
    return {
      success: true,
      initialized: true,
      mode: 'cloud_drive_standalone',
      message: 'Running with Direct Google Drive & Local Storage Sync',
    };
  }

  try {
    const res = await fetch('/api/database/status');
    if (res.status === 404) {
      serverApiAvailable = false;
      return {
        success: true,
        initialized: true,
        mode: 'cloud_drive_standalone',
        message: 'Running with Direct Google Drive & Local Storage Sync',
      };
    }
    if (!res.ok) return null;
    serverApiAvailable = true;
    return await res.json();
  } catch {
    serverApiAvailable = false;
    return {
      success: true,
      initialized: true,
      mode: 'cloud_drive_standalone',
      message: 'Running with Direct Google Drive & Local Storage Sync',
    };
  }
};
