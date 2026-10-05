export type UserRole =
  | 'Super Admin'
  | 'GN Officer'
  | 'Assistance Officer'
  | 'Data Entry Officer'
  | 'Auditor'
  | 'Receptionist'
  | 'Super_Admin'
  | 'GN_Officer'
  | 'Assistance_Officer'
  | 'Data_Entry_Officer';

export type AswesumaCategory = 'Severely Poor' | 'Poor' | 'Vulnerable' | 'Not selected';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Normal';

export type HousingStatus = 'Own permanent' | 'Semi-permanent' | 'Temporary/Hut' | 'Rented' | 'Landless';

export type NeedPriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export type NeedStatus = 'Pending' | 'In Progress' | 'Fulfilled' | 'Rejected';

export type AssistanceStatus = 'Provided' | 'Pending' | 'Cancelled';

export type AssistanceType =
  | 'Cash'
  | 'Goods/In-kind'
  | 'Voucher'
  | 'Food Rations'
  | 'Asset/Equipment'
  | 'Educational Support'
  | 'Housing Repair';

export interface GNDivision {
  Division_ID: string;
  Division_Name: string;
  GN_Code?: string;
  Tamil_Name?: string;
  Status: 'Active' | 'Inactive';
}

export interface FamilyVulnerabilityProfile {
  // Education
  education_level?: string;
  non_schooling_children_count?: number;
  // Health
  chronic_illness_members?: boolean;
  chronic_illness_details?: string;
  disabled_members?: boolean;
  disabled_count?: number;
  // Economic level
  monthly_per_capita_income?: number;
  monthly_per_capita_expenditure?: number;
  electricity_under_60_units?: boolean;
  // Assets
  no_house_land_ownership?: boolean;
  no_other_building_ownership?: boolean;
  no_cultivable_highland_half_acre?: boolean;
  no_cultivable_paddy_one_acre?: boolean;
  no_mobility_asset?: boolean;
  no_economic_activity_asset?: boolean;
  no_livelihood_livestock_asset?: boolean;
  // Housing condition
  is_shanty_lineroom?: boolean;
  no_permanent_wall_floor_roof?: boolean;
  floor_area_under_500sqft?: boolean;
  no_clean_drinking_water?: boolean;
  no_adequate_sanitation?: boolean;
  no_electricity_access?: boolean;
  // Family demography
  dependency_ratio_high?: boolean; // > 0.64
  is_single_parent?: boolean;
}

export type AllowanceStatus = 'Receiving' | 'Eligible_Pending' | 'Not_Eligible';

export interface Family {
  Family_ID: string;
  Registration_Number?: string;     // ஒவ்வொரு பதிவிற்கும் தனி இலக்கம் (Unique Registration System Number)
  QR_Number: string;
  Division_ID: string;
  Division_Name: string;
  Family_Name: string;
  Address: string;
  Telephone: string;
  Family_Size: number;
  Monthly_Income: number;
  Housing_Status: HousingStatus;
  Priority_Level: PriorityLevel;
  Aswesuma_Category?: AswesumaCategory; // குறித்த நபர் அஸ்வெசும பயனாளியா (Severely Poor | Poor | Vulnerable | Not selected)
  Status: 'Active' | 'Inactive';
  Created_By: string;
  Created_At: string;
  Updated_By: string;
  Updated_At: string;
  vulnerability?: FamilyVulnerabilityProfile;
  // Specific vulnerability indicators
  is_female_headed?: boolean;       // பெண் தலைமைத்துவ குடும்பம்
  no_toilet?: boolean;              // மலசலகூட வசதி அற்றது
  no_drinking_water_well?: boolean; // குடிநீர் கிணறு அற்றது
  no_house?: boolean;               // வீடு அற்றது
}

export interface FamilyMember {
  Member_ID: string;
  Registration_Number?: string;     // ஒவ்வொரு பதிவிற்கும் தனி இலக்கம்
  QR_Number: string;
  NIC_Elder_ID: string;
  Is_Temp_NIC?: boolean;            // 18+ வயதுடையோருக்கு தேசிய அடையாள அட்டை இல்லாதபோது வழங்கப்படும் தற்காலிக இலக்கம்
  Aswesuma_Category?: AswesumaCategory;
  Name: string;
  Relationship: string;
  DOB: string;
  Gender: 'Male' | 'Female' | 'Other';
  Occupation: string;
  Monthly_Income: number;
  Education: string;
  Highland_Extent?: string;       // மேட்டுக்காணி பரப்பு (e.g. 20 பேர்ச் அல்லது 0.5 ஏக்கர்)
  Paddy_Extent?: string;          // வயல்காணி பரப்பு (e.g. 1 ஏக்கர்)
  Land_BLR_Deed_No?: string;      // பி.எல்.ஆர் இலக்கம் அல்லது ஒப்ப / அனுமதிப்பத்திர இலக்கம்
  Disability: 'Yes' | 'No';
  Disability_Type?: string;
  Disability_Allowance?: AllowanceStatus;
  Disability_Device_Needed?: string;
  Elderly: 'Yes' | 'No';
  Elderly_Allowance?: AllowanceStatus;
  Elderly_Allowance_Amount?: number;
  Calculated_Age?: number;
  NIC_Format?: '9-digit' | '12-digit' | 'custom-or-token';
  NIC_Derived_Birth_Year?: number;
  Status: 'Active' | 'Inactive';
  Created_By: string;
  Created_At: string;
  Updated_By: string;
  Updated_At: string;
}

export interface Need {
  Need_ID: string;
  QR_Number: string;
  Need_Type: string;
  Description: string;
  Priority: NeedPriority;
  Status: NeedStatus;
  Assessment_Date: string;
  Assessed_By: string;
  Remarks: string;
}

export interface AssistanceProgram {
  Program_ID: string;
  Program_Name: string;
  Program_Type: string;
  Description: string;
  Status: 'Active' | 'Inactive';
  Created_By: string;
  Created_At: string;
  Start_Date?: string;
}

export interface AssistanceRecord {
  Assistance_ID: string;
  QR_Number: string;
  Member_ID: string;
  Program_ID: string;
  Program_Name: string;
  Assistance_Type: AssistanceType;
  Description: string;
  Amount: number;
  Quantity: number;
  Unit: string;
  Assistance_Date: string;
  Provided_By: string;
  Status: AssistanceStatus;
  Remarks: string;
  Created_At: string;
}

export interface User {
  User_ID: string;
  Password?: string;
  Name: string;
  Role: UserRole;
  Division: string; // 'ALL' or specific GN Division name
  Status: 'Active' | 'Inactive';
  Created_At: string;
  Last_Login?: string;
}

export interface QRChangeRequest {
  Request_ID: string;
  QR_Number: string;
  Old_NIC_Elder_ID: string;
  New_NIC_Elder_ID: string;
  Reason: string;
  Requested_By: string;
  Requested_At: string;
  Status: 'Pending' | 'Approved' | 'Rejected';
  Approved_By?: string;
  Approved_At?: string;
  Remarks?: string;
}

export interface AuditLog {
  Log_ID: string;
  User_ID: string;
  User_Name: string;
  Action: string;
  Table_Name: string;
  Record_ID: string;
  Old_Value: string;
  New_Value: string;
  Timestamp: string;
  IP_Info: string;
}

export interface DashboardStats {
  families: number;
  members: number;
  assistedFamilies: number;
  unassistedFamilies: number;
  assistanceRecords: number;
  needs: number;
  repeatedFamilies: number;
}

export interface HighAssistanceFamily {
  QR_Number: string;
  Family_Name: string;
  Division_Name: string;
  Assistance_Count: number;
  Total_Amount: number;
  Last_Assistance_Date: string;
}

export type VisitStatus = 'Waiting' | 'In Discussion' | 'Completed' | 'Referred' | 'Cancelled';

export interface VisitOfficerNote {
  Note_ID: string;
  Officer_ID: string;
  Officer_Name: string;
  Timestamp: string;
  Content: string;
  Action_Recommended?: string;
  Referred_To_Officer_ID?: string;
  Referred_To_Officer_Name?: string;
  Referred_To_Section?: string;
}

export type SatisfactionRating = 5 | 4 | 3 | 2 | 1;

export interface CitizenFeedback {
  Rating: SatisfactionRating;
  Rating_Label: string;
  Service_Speed?: 'Fast' | 'Average' | 'Delayed';
  Staff_Courtesy?: 'Polite' | 'Normal' | 'Rude';
  Issue_Resolved?: 'Fully' | 'Partially' | 'Pending' | 'Not Resolved';
  Feedback_Comment?: string;
  Submitted_At: string;
  Submitted_Via: 'Reception_Desk' | 'Officer_Direct' | 'Citizen_QR_Mobile';
}

export interface VisitorRecord {
  Visit_ID: string;
  Registration_Number?: string;
  Token_Number: string;
  Date: string; // YYYY-MM-DD
  Time: string; // HH:mm
  QR_Number?: string;
  Visitor_Name: string;
  NIC: string;
  Telephone: string;
  Village_Division: string;
  Address: string;
  Target_Officer_ID?: string;
  Target_Officer_Name: string;
  Target_Section: string;
  Purpose: string;
  Priority: 'Normal' | 'High' | 'Urgent';
  Status: VisitStatus;
  Created_By: string;
  Created_By_Name?: string;
  Created_At: string;
  Officer_Notes?: VisitOfficerNote[];
  Resolution_Remarks?: string;
  Completed_At?: string;
  Feedback?: CitizenFeedback;
}
