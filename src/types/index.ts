export type Role = 
  | 'SUPERADMIN' 
  | 'ADMIN 1' 
  | 'ADMIN 2' 
  | 'GRAMANIILATHARI' 
  | 'DATAENRY OFFCER' 
  | 'Reception Registrar' 
  | 'NORMAL' // Dedicated role for Public Live Counter Display TV screen
  | 'ECDO' // Early Childhood Development Officer (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)
  | 'MATERNITY_OFFICER' // கர்ப்பிணித் தாய்மார்கள் & முத்திரை பதிவாளர் (Pregnant Mothers & Nutrition Stamps Officer)
  | 'ELDERLY_OFFICER' // முதியோர் நலன்புரி உத்தியோகத்தர் (Senior Citizens Welfare Officer)
  | 'DISABILITY_OFFICER' // அங்கவீனர் பதிவாளர் (Disability Rights Officer)
  | 'WHH_OFFICER' // பெண் தலைமைத்துவ குடும்பங்கள் பதிவாளர் (Women-Headed Household Officer)
  | 'SAMURDHI_OFFICER'; // சமுர்த்தி அபிவிருத்தி உத்தியோகத்தர் (Samurdhi Development Officer)

export type UserRole = Role;

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

export type CitizenStatus = 'ACTIVE' | 'DECEASED' | 'TRANSFERRED';

export type DisabilityCause = 'ACCIDENT' | 'BIRTH' | 'WAR' | 'ILLNESS' | 'OTHER';

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
  divisionCode: string; // e.g. "211", "212A", etc. or "GENERAL"
  familyHead: boolean;
  householdNo: string;
  familyCode?: string; // Unified Family / Household Group ID (e.g. "FAM-211-042")
  familyRelationship?: FamilyRelationship;
  status?: CitizenStatus; // 'ACTIVE' | 'DECEASED' (மரணப்பதிவு) | 'TRANSFERRED' (பதிவுமாற்றம்)
  deceasedDate?: string; // திகதி
  deathDate?: string; // திகதி (Deceased date alias)
  deathCertificateNo?: string; // இறப்பு சான்றிதழ் இலக்கம்
  deathRemarks?: string;
  transferDate?: string; // மாற்றம் செய்யப்பட்ட திகதி
  transferredDate?: string; // மாற்றம் செய்யப்பட்ட திகதி (Transfer date alias)
  transferDestination?: string; // இடமாற்றம் செய்யப்பட்ட பிரதேசம் / மாவட்டம்
  transferredToDivision?: string; // இடமாற்றம் செய்யப்பட்ட பிரதேசம் / மாவட்டம் (Transfer destination alias)
  transferReason?: string; // காரணங்கள்
  isPregnantMother?: boolean; // ECDO: கர்ப்பிணித் தாய்
  pregnancyStageMonths?: number; // கர்ப்ப காலம் (மாதங்கள் 1-9)
  isPersonWithDisability?: boolean; // அங்கவீனர் / மாற்றுத்திறனாளி
  disabilityType?: string; // ஊனத்தின் வகை / தன்மை
  disabilityNature?: string; // அங்கவீனத்தின் தன்மை (உடல் ஊனம், பார்வை, கேள்வி/பேச்சு, உள நலம், பலதரப்பட்ட)
  disabilityCause?: DisabilityCause; // உருவானது: விபத்து, பிறப்பு, யுத்தம், நோய், ஏனையவை
   disabilityRegistrationDate?: string;
  isWomanHeadedHousehold?: boolean; // பெண் தலைமைத்துவ குடும்பம்
  isSamurdhiBeneficiary?: boolean; // சமுர்த்தி பயனாளி
  isElderly?: boolean; // முதியோர் (Senior Citizen)
  elderlyAllowanceStatus?: 'RECEIVING' | 'WAITLIST' | 'NOT_APPLIED'; // முதியோர் கொடுப்பனவு நிலை
  elderlyLivingStatus?: 'WITH_FAMILY' | 'ALONE' | 'ELDER_CARE_HOME'; // வசிக்கும் நிலை
  elderlyCaretakerName?: string; // பராமரிப்பாளர் பெயர்
  elderlyCaretakerPhone?: string; // பராமரிப்பாளர் தொலைபேசி
  elderlyMobilityStatus?: 'NORMAL' | 'WALKER_CANE' | 'WHEELCHAIR' | 'BEDRIDDEN'; // இயங்குதிறன்
  manualQrCode?: string; // பயனரால் சுயமாக வழங்கப்படும் QR / அட்டை குறியீடு (Manual QR provided by officers)
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

export interface ServiceDefinition {
  id: string; // e.g. "SRV-WELFARE", "SRV-LAND", or "SRV-CUSTOM-..."
  code: string; // e.g. "WELFARE_SCHEME", "LAND_PERMIT", "AGRI_PERMIT", etc.
  nameTa: string; // Service name in Tamil
  nameEn: string; // Service name in English
  counterNo: number; // Counter number e.g. 1-33
  prefix: string; // Token prefix e.g. "W", "L", "AG"
  defaultOfficerTa: string; // Default officer in Tamil
  defaultOfficerEn: string; // Default officer in English
  descriptionTa?: string;
  descriptionEn?: string;
  floor?: string;
  isActive: boolean;
  isCustom?: boolean;
  createdAt: string;
}

export type ServiceType = string;

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
  counterNo: number; // 01 to 33 based on office layout
  counterName?: string;
  floorLevel?: string; // 'Ground Floor (தரைத்தளம்)' | 'First Floor (முதலாம் மாடி)'
  officerToMeet: string; // யாரை பார்க்க வேண்டும்
  citizenName: string;
  citizenNic: string;
  citizenAddress?: string;
  citizenPhone?: string;
  divisionCode: string; // GN Division code or "GENERAL" (பொது)
  status: TokenStatus;
  issuedAt: string;
  calledAt?: string;
  completedAt?: string;
  notes?: string;
  barcode: string;
  forwardedFrom?: string;
  forwardHistory?: TokenForwardRecord[];
  servedByOfficerId?: string;
  servedByOfficerName?: string;
  rating?: number;
  ratingFeedback?: string;
  serviceDurationMinutes?: number;
  familyCode?: string;
  familyQrPayload?: string;
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

export interface MonthlyStampCollection {
  monthIndex: number; // 1 to 10
  monthLabelTa: string; // e.g. "மாதம் 01 (Month 1)"
  monthLabelEn: string; // e.g. "Month 01"
  collected: boolean;
  collectedDate?: string;
  collectedByOfficer?: string;
  notes?: string;
}

export interface PregnantMotherRecord {
  id: string; // e.g. "MAT-211-2026-001"
  name: string; // பெயர்
  nic: string; // தேசிய அடையாள அட்டை இலக்கம்
  divisionCode: string; // கிராம உத்தியோகத்தர் பிரிவு
  phone: string; // தொலைபேசி
  registrationDate: string; // பதிவு செய்த திகதி (YYYY-MM-DD)
  expectedCompletionDate: string; // முடிவடையும் திகதி 10 மாதங்களின் பின் (YYYY-MM-DD)
  stampIssueDate?: string; // முத்திரை வழங்கப்பட்ட திகதி
  stampNumber?: string; // முத்திரை இலக்கம்
  stampValue: number; // முத்திரையின் பெறுமதி (e.g. 4500)
  pregnancyNumber: number; // 01, 02, 03, 04 வது குழந்தை/பிரசவம்
  monthlyCollections: MonthlyStampCollection[]; // 10 மாதங்களும் முத்திரைக்கான பொருளை பெற்றதை அடையாளமிடும் இடம்
  isCompleted: boolean; // 10 மாதங்கள் அடையாளம் இட்ட பின் முடிவு பகுதிக்கு செல்லும் வசதி
  completedDate?: string;
  status: 'WAITING_STAMP' | 'ACTIVE_COLLECTING' | 'COMPLETED'; // காத்திருப்பு வரிசை / பொருட்கள் பெறும் நிலை / முடிவுற்றவை
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

