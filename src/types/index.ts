export type Role = 
  | 'SUPERADMIN' 
  | 'ADMIN 1' 
  | 'ADMIN 2' 
  | 'GRAMANIILATHARI' 
  | 'DATAENRY OFFCER' 
  | 'Reception Registrar' 
  | 'NORMAL'; // Dedicated role for Public Live Counter Display TV screen

export interface User {
  id: string; // e.g. "123", "456", "457", "789", "1112", "555", "999"
  password: string; // Unique password
  name: string;
  role: Role;
  division?: string; // GN Division code or "ALL"
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastLogin?: string;
  email?: string;
}

export interface GNDivision {
  code: string; // e.g. "211", "211A", "212", etc.
  nameTa: string; // e.g. "வாகரை வடக்கு"
  nameEn: string; // e.g. "Vaharai North"
  gnOfficerName?: string;
  contactNumber?: string;
  population?: number;
  households?: number;
}

export type ChronicIllness = 
  | 'NONE'
  | 'CKD_KIDNEY'         // சிறுநீரக நோய் (Chronic Kidney Disease)
  | 'CANCER'             // புற்றுநோய்
  | 'THALASSEMIA'        // தலசீமியா
  | 'HEART_DISEASE'      // இதய நோய்
  | 'DIABETES_CHRONIC'   // தீவிர நீரிழிவு
  | 'DISABILITY_PHYSICAL'// உடல் ஊனம்
  | 'MENTAL_HEALTH'      // மனநலம்
  | 'OTHER_CHRONIC';     // ஏனைய நாள்பட்ட நோய்

export type WelfareScheme = 
  | 'NONE'
  | 'ASWESUMA_EXTREME'      // அஸ்வெசும - மிக ஏழ்மை (Extreme Poverty)
  | 'ASWESUMA_POOR'         // அஸ்வெசும - ஏழ்மை (Poverty)
  | 'ASWESUMA_VULNERABLE'   // அஸ்வெசும - இடர்படக்கூடியோர் (Vulnerable)
  | 'ASWESUMA_TRANSITIONAL' // அஸ்வெசும - இடைக்கால உதவி (Transitional)
  | 'SAMURDHI'              // சமுர்த்தி (Samurdhi)
  | 'ELDERLY'               // முதியோர் உதவிக்கொடுப்பனவு (Senior Citizen)
  | 'DISABILITY'            // மாற்றுத்திறனாளிகள் கொடுப்பனவு (Disability)
  | 'CHRONIC_KIDNEY'        // சிறுநீரக நோயாளர் நிதி உதவி (Kidney Patient Aid)
  | 'FARMER_SUBSIDY'        // விவசாய மானியம் & உரம் (Agrarian Subsidy)
  | 'FISHERY_AID'           // கடற்றொழிலாளர் உதவி & எரிபொருள் (Fishery Aid)
  | 'DISASTER_RELIEF'       // அனர்த்த நிவாரண உலர் உணவு (Disaster Relief)
  | 'SELF_EMPLOYMENT';      // சுயதொழில் வாழ்வாதார உதவி (Livelihood Grant)

export type WelfareStatus = 'ACTIVE' | 'PENDING' | 'WAITLIST' | 'REJECTED';

export interface Beneficiary {
  id: string; // System-generated Citizen Registration Number (e.g. "VHR-211-2026-0042")
  nic: string; // Official NIC or Computer-generated Provisional NIC (e.g. "TNIC-211-2026-84920")
  isProvisionalNic: boolean; // Flag indicating computer-generated NIC for citizens without card
  nameTa: string;
  nameEn: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  phone: string;
  address: string;
  divisionCode: string; // e.g. "211"
  familyHead: boolean;
  householdNo: string;
  welfareScheme: WelfareScheme;
  welfareStatus: WelfareStatus;
  chronicIllness: ChronicIllness;
  barcode: string; // Barcode representation of NIC or System ID
  qrPayload: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ServiceType = 
  | 'LAND_PERMIT' 
  | 'WELFARE_SCHEME' 
  | 'CIVIL_REGISTRATION' 
  | 'GRAMA_CERTIFICATE' 
  | 'PUBLIC_ASSISTANCE' 
  | 'GENERAL_INQUIRY';

export type TokenStatus = 'WAITING' | 'CALLING' | 'SERVING' | 'COMPLETED' | 'CANCELLED';

export interface QueueToken {
  id: string;
  tokenNumber: string;
  serviceType: ServiceType;
  counterNo: number;
  officerToMeet: string; // யாரை பார்க்க வேண்டும் (Officer to Meet: e.g. "ADMIN 1", "ADMIN 2", "SUPERADMIN", etc.)
  citizenName: string;
  citizenNic: string;
  divisionCode: string;
  status: TokenStatus;
  issuedAt: string;
  calledAt?: string;
  completedAt?: string;
  notes?: string;
  barcode: string;
}

export interface DriveBackupItem {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  recordsCount?: number;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface AiReportResponse {
  success: boolean;
  report: string;
  note?: string;
}
