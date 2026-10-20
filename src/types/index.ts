export type Role = 
  | 'SUPERADMIN' 
  | 'ADMIN 1' 
  | 'ADMIN 2' 
  | 'GRAMANIILATHARI' 
  | 'DATAENRY OFFCER' 
  | 'Reception Registrar' 
  | 'NORMAL' // Dedicated role for Public Live Counter Display TV screen
  | 'ECDO' // Early Childhood Development Officer (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)
  | 'DISABILITY_OFFICER' // அங்கவீனர் பதிவாளர் (Disability Rights Officer)
  | 'WHH_OFFICER' // பெண் தலைமைத்துவ குடும்பங்கள் பதிவாளர் (Women-Headed Household Officer)
  | 'SAMURDHI_OFFICER'; // சமுர்த்தி அபிவிருத்தி உத்தியோகத்தர் (Samurdhi Development Officer)

export interface User {
  id: string; // e.g. "123", "456", "457", "789", "1112", "555", "999", "601", "602", "603", "604"
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

export type FamilyRelationship = 'HEAD' | 'SPOUSE' | 'CHILD' | 'PARENT' | 'OTHER';

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
  familyCode?: string; // Unified Family / Household Group ID (e.g. "FAM-211-042")
  familyRelationship?: FamilyRelationship;
  isPregnantMother?: boolean; // ECDO: கர்ப்பிணித் தாய்
  pregnancyStageMonths?: number; // கர்ப்ப காலம் (மாதங்கள் 1-9)
  isPersonWithDisability?: boolean; // அங்கவீனர் / மாற்றுத்திறனாளி
  disabilityType?: string; // ஊனத்தின் வகை (உடல் ஊனம், பார்வை, செவிப்புலன், மனநலம்)
  isWomanHeadedHousehold?: boolean; // பெண் தலைமைத்துவ குடும்பம்
  isSamurdhiBeneficiary?: boolean; // சமுர்த்தி பயனாளி
  welfareScheme: WelfareScheme;
  welfareStatus: WelfareStatus;
  chronicIllness: ChronicIllness;
  barcode: string; // Barcode representation of NIC or System ID
  qrPayload: string;
  familyQrPayload?: string; // Single Unified QR Payload shared by ALL members of this household
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

export interface TokenForwardRecord {
  fromOfficer: string;
  toOfficer: string;
  forwardedAt: string;
  reason?: string;
}

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
  forwardedFrom?: string;
  forwardHistory?: TokenForwardRecord[];
  servedByOfficerId?: string; // சேவையை நிறைவு செய்த உத்தியோகத்தர் ID
  servedByOfficerName?: string; // சேவையை நிறைவு செய்த உத்தியோகத்தர் பெயர்
  rating?: number; // சேவை திருப்தி நட்சத்திர புள்ளி (1 to 5 stars)
  ratingFeedback?: string; // பிரஜையின் கருத்து
  serviceDurationMinutes?: number; // சேவை எடுத்துக்கொண்ட நேரம் (நிமிடங்களில்)
  familyCode?: string;
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

// ================= ASSISTANCE / RELIEF DISTRIBUTION TYPES ================= //
export type AidCategory = 
  | 'DRY_RATIONS' // உலர் உணவுப் பொதி (Dry Rations)
  | 'CASH_GRANT' // பண உதவி (Cash Assistance)
  | 'AGRICULTURE_SEEDS' // விவசாய விதை / உரம் (Agriculture Seed/Fertilizer)
  | 'DISASTER_FLOOD' // அனர்த்த நிவாரணம் / வெள்ள நிவாரணம் (Disaster / Flood Relief)
  | 'HOUSING_REPAIR' // வீட்டு புனரமைப்பு உதவி (Housing Aid)
  | 'MEDICAL_ASSISTANCE' // மருத்துவ சிகிச்சை உதவி (Medical Aid)
  | 'EDUCATION_STATIONERY' // கல்வி கற்றல் உபகரணங்கள் (School Stationery)
  | 'LIVELIHOOD_TOOL' // வாழ்வாதார உபகரணங்கள் (தையல் இயந்திரம், படகு வலை)
  | 'OTHER';

export interface AssistanceRecord {
  id: string; // e.g. "AID-2026-0001"
  familyCode: string; // e.g. "FAM-211-042" (Unique family code)
  familyQrPayload: string; // Strictly unique Family QR payload
  beneficiaryNic: string;
  beneficiaryName: string;
  divisionCode: string;
  householdNo?: string;
  aidCategory: AidCategory;
  aidDescription: string; // e.g. "25kg உலர் உணவுப் பொதி (25kg Dry Rations)"
  amountOrValue: string; // e.g. "Rs. 7,500" or "1 Bag"
  donorOrOrganization: string; // e.g. "பிரதேச செயலக அனர்த்த நிவாரணப் பிரிவு"
  distributedDate: string; // YYYY-MM-DD
  officerName: string;
  officerId: string;
  status: 'DISTRIBUTED' | 'APPROVED' | 'REJECTED_DUPLICATE';
  isDuplicate?: boolean;
  duplicateWarningReason?: string;
  notes?: string;
  createdAt: string;
}

export interface DuplicateAidCheckResult {
  hasDuplicateRisk: boolean;
  duplicateCount: number;
  lastDistributedDate?: string;
  daysSinceLastAid?: number;
  previousRecords: AssistanceRecord[];
  warningMessageTa: string;
  warningMessageEn: string;
  severity: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface FamilyCsvRecord {
  familyCode: string;
  uniqueFamilyQr: string;
  divisionCode: string;
  householdNo: string;
  familyHeadNic: string;
  familyHeadNameTa: string;
  familyHeadNameEn: string;
  phone: string;
  address: string;
  totalMembers: number;
  isWomanHeadedHousehold: boolean;
  isSamurdhiBeneficiary: boolean;
  hasPregnantMother: boolean;
  hasPersonWithDisability: boolean;
  notes?: string;
}
