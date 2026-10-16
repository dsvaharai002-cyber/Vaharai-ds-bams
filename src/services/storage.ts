import { User, Beneficiary, QueueToken, GNDivision, SystemAuditLog, ChronicIllness, WelfareScheme, WelfareStatus } from '../types';

const STORAGE_KEYS = {
  USERS: 'vaharai_ds_users_v3',
  BENEFICIARIES: 'vaharai_ds_beneficiaries_v3',
  TOKENS: 'vaharai_ds_tokens_v3',
  DIVISIONS: 'vaharai_ds_divisions_v3',
  AUDIT_LOGS: 'vaharai_ds_audit_logs_v3',
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

// 16 Real GN Divisions in Koralaipattu North (Vaharai)
export const DEFAULT_DIVISIONS: GNDivision[] = [
  { code: '211', nameEn: 'Vaharai North', nameTa: 'வாகரை வடக்கு', gnOfficerName: 'K. Sivakumar', population: 2450, households: 610 },
  { code: '211A', nameEn: 'Vaharai South', nameTa: 'வாகரை தெற்கு', gnOfficerName: 'S. Mahendran', population: 2180, households: 540 },
  { code: '211B', nameEn: 'Vaharai Central', nameTa: 'வாகரை மத்தி', gnOfficerName: 'R. Tharmarajah', population: 1920, households: 480 },
  { code: '212', nameEn: 'Mankerny', nameTa: 'மாங்கேணி', gnOfficerName: 'T. Krishnarajah', population: 2890, households: 720 },
  { code: '212A', nameEn: 'Kandaladi', nameTa: 'கண்டலடி', gnOfficerName: 'M. Yogarajah', population: 1650, households: 410 },
  { code: '212B', nameEn: 'Pannichankerny', nameTa: 'பனிச்சங்கேணி', gnOfficerName: 'V. Suresh', population: 2310, households: 580 },
  { code: '213', nameEn: 'Vakarai', nameTa: 'வாகரை', gnOfficerName: 'K. Raveendran', population: 3100, households: 790 },
  { code: '213A', nameEn: 'Kathiraveli', nameTa: 'கதிரவெளி', gnOfficerName: 'A. Balamurugan', population: 2750, households: 690 },
  { code: '213B', nameEn: 'Punanai East', nameTa: 'புனானை கிழக்கு', gnOfficerName: 'P. Vijayan', population: 1420, households: 360 },
  { code: '213C', nameEn: 'Madurankernikulam', nameTa: 'மதுரங்கேணிக்குளம்', gnOfficerName: 'N. Loganathan', population: 1180, households: 290 },
  { code: '214', nameEn: 'Kayankerny', nameTa: 'காயான்கேணி', gnOfficerName: 'S. Pathmanathan', population: 2600, households: 650 },
  { code: '214A', nameEn: 'Palchenai', nameTa: 'பால்சேனை', gnOfficerName: 'G. Mohan', population: 1840, households: 460 },
  { code: '214B', nameEn: 'Uriyankaddu', nameTa: 'உரியன்கட்டு', gnOfficerName: 'T. Karunakaran', population: 1530, households: 380 },
  { code: '215', nameEn: 'Sallithivu', nameTa: 'சல்லித்தீவு', gnOfficerName: 'K. Ganeshan', population: 1390, households: 350 },
  { code: '215A', nameEn: 'Thandiyadi', nameTa: 'தாண்டியடி', gnOfficerName: 'R. Senthil', population: 1720, households: 430 },
  { code: '215B', nameEn: 'Puchakerni', nameTa: 'பூச்சக்கேணி', gnOfficerName: 'V. Vasanthan', population: 1260, households: 320 },
];

// Initial Staff Users matching prompt: Admin 1, Admin 2, Super Admin, GN, Data Entry, Reception, and Normal (TV Display)
export const DEFAULT_USERS: User[] = [
  {
    id: '123',
    password: '123',
    name: 'a (GN Officer - Vaharai North)',
    role: 'GRAMANIILATHARI',
    division: '211',
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
];

// Initial Realistic Citizens / Beneficiaries in Vaharai
export const DEFAULT_BENEFICIARIES: Beneficiary[] = [
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
    welfareScheme: 'ASWESUMA_EXTREME',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'CKD_KIDNEY',
    barcode: '198421500321',
    qrPayload: 'ID:VHR-211-2026-0001|NIC:198421500321|DIV:211|CKD|ASWESUMA_EXTREME',
    notes: 'சிறுநீரக நோயாளி மற்றும் தீவிர வறுமை உதவி பெறுநர்',
    createdAt: '2026-01-15T09:30:00Z',
    updatedAt: '2026-01-15T09:30:00Z',
  },
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
    welfareScheme: 'SAMURDHI',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'NONE',
    barcode: '199074500812',
    qrPayload: 'ID:VHR-211-2026-0002|NIC:199074500812|DIV:211|SAMURDHI',
    notes: 'சுயதொழில் தையல் இயந்திர உதவி பெற்றுள்ளார்',
    createdAt: '2026-01-18T10:15:00Z',
    updatedAt: '2026-01-18T10:15:00Z',
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
    welfareScheme: 'NONE',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'NONE',
    barcode: 'TNIC-211-2026-10492',
    qrPayload: 'ID:VHR-211-2026-0003|TNIC:TNIC-211-2026-10492|AGE:16|NIC_REQUIRED',
    notes: '16 வயதை பூர்த்தி செய்துள்ளார் - புதிய தேசிய அடையாள அட்டைக்கு (NIC) விண்ணப்பிக்க வேண்டும்',
    createdAt: '2026-02-05T11:00:00Z',
    updatedAt: '2026-02-05T11:00:00Z',
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
    id: 'VHR-214-2026-0001',
    nic: '197519000451',
    isProvisionalNic: false,
    nameTa: 'இராசையா நகுலேஸ்வரன்',
    nameEn: 'Rasiah Naguleswaran',
    gender: 'MALE',
    dob: '1975-07-09',
    phone: '0772345678',
    address: 'பள்ளிக்குடா, காயான்கேணி (214)',
    divisionCode: '214',
    familyHead: true,
    householdNo: 'HH-214-102',
    welfareScheme: 'FISHERY_AID',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'CANCER',
    barcode: '197519000451',
    qrPayload: 'ID:VHR-214-2026-0001|NIC:197519000451|DIV:214|FISHERY|CANCER',
    notes: 'புற்றுநோய் சிகிச்சை மற்றும் கடற்றொழிலாளர் நிவாரண உதவி',
    createdAt: '2026-02-10T14:20:00Z',
    updatedAt: '2026-02-10T14:20:00Z',
  },
  {
    id: 'VHR-212B-2026-0001',
    nic: '199852400982',
    isProvisionalNic: false,
    nameTa: 'நடராசா சசிகுமார்',
    nameEn: 'Nadarasa Sasikumar',
    gender: 'MALE',
    dob: '1998-09-12',
    phone: '0754321987',
    address: 'முரக்கொட்டான்கேணி வீதி, பனிச்சங்கேணி (212B)',
    divisionCode: '212B',
    familyHead: true,
    householdNo: 'HH-212B-077',
    welfareScheme: 'DISABILITY',
    welfareStatus: 'ACTIVE',
    chronicIllness: 'DISABILITY_PHYSICAL',
    barcode: '199852400982',
    qrPayload: 'ID:VHR-212B-2026-0001|NIC:199852400982|DIV:212B|DISABILITY',
    notes: 'நிரந்தர உடல் ஊனமுற்றோர் கொடுப்பனவு பெறுநர்',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  },
  {
    id: 'VHR-211A-2026-0001',
    nic: '198263100874',
    isProvisionalNic: false,
    nameTa: 'முத்துலிங்கம் சாந்தகுமாரி',
    nameEn: 'Muthulingam Santhakumari',
    gender: 'FEMALE',
    dob: '1982-04-18',
    phone: '0776543210',
    address: 'கண்டி வீதி, வாகரை தெற்கு (211A)',
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

// Initial Queue Tokens with officerToMeet
export const DEFAULT_TOKENS: QueueToken[] = [
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
    issuedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 5 * 60000).toISOString(),
    barcode: 'L-101',
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
    issuedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    barcode: 'W-102',
  },
  {
    id: 'T-103',
    tokenNumber: 'C-103',
    serviceType: 'CIVIL_REGISTRATION',
    counterNo: 1,
    officerToMeet: 'CIVIL_REGISTRAR', // பிறப்பு/இறப்பு பதிவாளர்
    citizenName: 'தர்மலிங்கம் கஜன் (16 yrs - NIC)',
    citizenNic: 'TNIC-211-2026-10492',
    divisionCode: '211',
    status: 'WAITING',
    issuedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    barcode: 'C-103',
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
export const saveUsers = (users: User[]) => setStoredData(STORAGE_KEYS.USERS, users);

export const loadBeneficiaries = (): Beneficiary[] => getStoredData<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, DEFAULT_BENEFICIARIES);
export const saveBeneficiaries = (items: Beneficiary[]) => setStoredData(STORAGE_KEYS.BENEFICIARIES, items);

export const loadTokens = (): QueueToken[] => {
  const stored = getStoredData<QueueToken[]>(STORAGE_KEYS.TOKENS, DEFAULT_TOKENS);
  return stored.map((tok) => ({
    ...tok,
    officerToMeet: tok.officerToMeet || 'அட்மின் 1 (Admin 1)',
  }));
};
export const saveTokens = (tokens: QueueToken[]) => setStoredData(STORAGE_KEYS.TOKENS, tokens);

export const loadDivisions = (): GNDivision[] => getStoredData<GNDivision[]>(STORAGE_KEYS.DIVISIONS, DEFAULT_DIVISIONS);
export const saveDivisions = (divs: GNDivision[]) => setStoredData(STORAGE_KEYS.DIVISIONS, divs);

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
};

const saveStoredData = <T>(key: string, data: T) => setStoredData(key, data);

// Database Snapshot for Google Drive / JSON file
export const createDatabaseSnapshot = () => {
  return {
    version: '3.0',
    exportedAt: new Date().toISOString(),
    organization: 'Divisional Secretariat Koralaipattu North (Vaharai)',
    users: loadUsers(),
    beneficiaries: loadBeneficiaries(),
    tokens: loadTokens(),
    divisions: loadDivisions(),
    auditLogs: loadAuditLogs(),
  };
};

export const restoreDatabaseFromSnapshot = (snapshot: any): boolean => {
  if (!snapshot || !snapshot.beneficiaries || !snapshot.users) {
    throw new Error('Invalid backup file structure.');
  }
  if (Array.isArray(snapshot.users)) saveUsers(snapshot.users);
  if (Array.isArray(snapshot.beneficiaries)) saveBeneficiaries(snapshot.beneficiaries);
  if (Array.isArray(snapshot.tokens)) saveTokens(snapshot.tokens);
  if (Array.isArray(snapshot.divisions)) saveDivisions(snapshot.divisions);
  if (Array.isArray(snapshot.auditLogs)) saveStoredData(STORAGE_KEYS.AUDIT_LOGS, snapshot.auditLogs);
  return true;
};
