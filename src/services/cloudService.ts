import { Family, FamilyMember, AssistanceRecord, User, AswesumaCategory } from '../types';

export const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbwEfjA956lMr5i_4HfXxKvHSQynxEGKsFhRxyMhz7VZt1xMzt7nkLihiUIo8tkssy1tAA/exec';

let activeWebAppUrl = DEFAULT_WEB_APP_URL;

export type CloudPayload = Record<string, any>;

export const safeJsonParse = <T,>(value: any, fallback: T): T => {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

export const getEffectiveWebAppUrl = (): string => {
  return activeWebAppUrl || DEFAULT_WEB_APP_URL;
};

export const setEffectiveWebAppUrl = (url: string): void => {
  const clean = url.trim();
  activeWebAppUrl = clean || DEFAULT_WEB_APP_URL;
};

export const getGoogleWebAppUrl = getEffectiveWebAppUrl;
export const setGoogleWebAppUrl = setEffectiveWebAppUrl;

export const MASTER_QUESTIONNAIRE_HEADERS = [
  'Registration_Number',
  'Family_ID',
  'QR_Number',
  'Division_ID',
  'Division_Name',
  'Family_Name',
  'Head_NIC_Or_Temp_ID',
  'Is_Temp_NIC',
  'Head_DOB',
  'Head_Age',
  'Aswesuma_Category',
  'Address',
  'Telephone',
  'Family_Size',
  'Monthly_Income_LKR',
  'Housing_Status',
  'Priority_Level',
  'Highland_Extent',
  'Paddy_Extent',
  'Land_BLR_Deed_No',
  'Is_Female_Headed',
  'No_Toilet',
  'No_Drinking_Water_Well',
  'No_House',
  'Education_Level',
  'Non_Schooling_Children_Count',
  'Chronic_Illness_Members',
  'Chronic_Illness_Details',
  'Disabled_Members',
  'Disabled_Count',
  'Monthly_Per_Capita_Income',
  'Monthly_Per_Capita_Expenditure',
  'Electricity_Under_60_Units',
  'No_House_Land_Ownership',
  'No_Other_Building_Ownership',
  'No_Cultivable_Highland_Half_Acre',
  'No_Cultivable_Paddy_One_Acre',
  'No_Mobility_Asset',
  'No_Economic_Activity_Asset',
  'No_Livelihood_Livestock_Asset',
  'Is_Shanty_Lineroom',
  'No_Permanent_Wall_Floor_Roof',
  'Floor_Area_Under_500sqft',
  'No_Clean_Drinking_Water',
  'No_Adequate_Sanitation',
  'No_Electricity_Access',
  'Dependency_Ratio_High',
  'Is_Single_Parent',
  'Status',
  'Created_By',
  'Created_At',
  'Updated_By',
  'Updated_At'
];

export const buildFlatFamilyQuestionnaireRecord = (
  family: Family,
  headMember?: Partial<FamilyMember>
): Record<string, any> => {
  const v = family.vulnerability || {};
  return {
    Registration_Number: family.Registration_Number || `REG-${family.QR_Number}`,
    Family_ID: family.Family_ID,
    QR_Number: family.QR_Number,
    Division_ID: family.Division_ID,
    Division_Name: family.Division_Name,
    Family_Name: family.Family_Name,
    Head_NIC_Or_Temp_ID: headMember?.NIC_Elder_ID || '',
    Is_Temp_NIC: headMember?.Is_Temp_NIC ? 'YES (TEMP)' : 'NO',
    Head_DOB: headMember?.DOB || '',
    Head_Age: headMember?.Calculated_Age ?? '',
    Aswesuma_Category: family.Aswesuma_Category || 'Not selected',
    Address: family.Address || '',
    Telephone: family.Telephone || '',
    Family_Size: family.Family_Size ?? 1,
    Monthly_Income_LKR: family.Monthly_Income ?? 0,
    Housing_Status: family.Housing_Status || 'Semi-permanent',
    Priority_Level: family.Priority_Level || 'Normal',
    Highland_Extent: headMember?.Highland_Extent || '',
    Paddy_Extent: headMember?.Paddy_Extent || '',
    Land_BLR_Deed_No: headMember?.Land_BLR_Deed_No || '',
    Is_Female_Headed: family.is_female_headed ? 'YES' : 'NO',
    No_Toilet: family.no_toilet || v.no_adequate_sanitation ? 'YES' : 'NO',
    No_Drinking_Water_Well: family.no_drinking_water_well || v.no_clean_drinking_water ? 'YES' : 'NO',
    No_House: family.no_house || v.no_house_land_ownership ? 'YES' : 'NO',
    Education_Level: v.education_level || headMember?.Education || '',
    Non_Schooling_Children_Count: v.non_schooling_children_count ?? 0,
    Chronic_Illness_Members: v.chronic_illness_members ? 'YES' : 'NO',
    Chronic_Illness_Details: v.chronic_illness_details || '',
    Disabled_Members: v.disabled_members || headMember?.Disability === 'Yes' ? 'YES' : 'NO',
    Disabled_Count: v.disabled_count ?? (headMember?.Disability === 'Yes' ? 1 : 0),
    Monthly_Per_Capita_Income: v.monthly_per_capita_income ?? '',
    Monthly_Per_Capita_Expenditure: v.monthly_per_capita_expenditure ?? '',
    Electricity_Under_60_Units: v.electricity_under_60_units ? 'YES' : 'NO',
    No_House_Land_Ownership: v.no_house_land_ownership ? 'YES' : 'NO',
    No_Other_Building_Ownership: v.no_other_building_ownership ? 'YES' : 'NO',
    No_Cultivable_Highland_Half_Acre: v.no_cultivable_highland_half_acre ? 'YES' : 'NO',
    No_Cultivable_Paddy_One_Acre: v.no_cultivable_paddy_one_acre ? 'YES' : 'NO',
    No_Mobility_Asset: v.no_mobility_asset ? 'YES' : 'NO',
    No_Economic_Activity_Asset: v.no_economic_activity_asset ? 'YES' : 'NO',
    No_Livelihood_Livestock_Asset: v.no_livelihood_livestock_asset ? 'YES' : 'NO',
    Is_Shanty_Lineroom: v.is_shanty_lineroom ? 'YES' : 'NO',
    No_Permanent_Wall_Floor_Roof: v.no_permanent_wall_floor_roof ? 'YES' : 'NO',
    Floor_Area_Under_500sqft: v.floor_area_under_500sqft ? 'YES' : 'NO',
    No_Clean_Drinking_Water: v.no_clean_drinking_water ? 'YES' : 'NO',
    No_Adequate_Sanitation: v.no_adequate_sanitation ? 'YES' : 'NO',
    No_Electricity_Access: v.no_electricity_access ? 'YES' : 'NO',
    Dependency_Ratio_High: v.dependency_ratio_high ? 'YES' : 'NO',
    Is_Single_Parent: v.is_single_parent ? 'YES' : 'NO',
    Status: family.Status || 'Active',
    Created_By: family.Created_By || '',
    Created_At: family.Created_At || new Date().toISOString(),
    Updated_By: family.Updated_By || '',
    Updated_At: family.Updated_At || new Date().toISOString()
  };
};

export const sendDataToGoogleCloud = async (payload: CloudPayload): Promise<boolean> => {
  try {
    const url = getEffectiveWebAppUrl();
    if (!url) throw new Error('Cloud web app URL is missing.');
    const action = String(payload.action ?? '').trim();
    if (!action) throw new Error('Cloud action is missing.');

    // If family data is included, also flatten all questionnaire fields for Google Sheet columns
    let flatQuestionnaire: Record<string, any> = {};
    let flatRow: any[] = [];
    if (payload.extraData && (action === 'ADD_FAMILY' || action === 'UPDATE_FAMILY')) {
      flatQuestionnaire = buildFlatFamilyQuestionnaireRecord(payload.extraData as Family, payload.headMember);
      flatRow = MASTER_QUESTIONNAIRE_HEADERS.map(h => flatQuestionnaire[h] ?? '');
    }

    const bodyData = {
      action,
      id: String(
        payload.id ??
          payload.Family_ID ??
          payload.Member_ID ??
          payload.Assistance_ID ??
          payload.Need_ID ??
          payload.Request_ID ??
          payload.User_ID ??
          ''
      ),
      Registration_Number: String(
        payload.Registration_Number ??
          payload.extraData?.Registration_Number ??
          flatQuestionnaire.Registration_Number ??
          ''
      ),
      QR_Number: String(payload.QR_Number ?? payload.extraData?.QR_Number ?? ''),
      Family_Name: String(payload.Family_Name ?? payload.extraData?.Family_Name ?? ''),
      Division_Name: String(payload.Division_Name ?? payload.Division ?? payload.extraData?.Division_Name ?? ''),
      Aswesuma_Category: String(
        payload.Aswesuma_Category ?? payload.extraData?.Aswesuma_Category ?? 'Not selected'
      ),
      Program_Name: String(payload.Program_Name ?? ''),
      Amount: payload.Amount ?? 0,
      Assistance_Type: String(payload.Assistance_Type ?? ''),
      User_ID: String(payload.User_ID ?? ''),
      Name: String(payload.Name ?? ''),
      Role: String(payload.Role ?? ''),
      Status: String(payload.Status ?? 'Active'),
      timestamp: new Date().toISOString(),
      headers: MASTER_QUESTIONNAIRE_HEADERS,
      flatQuestionnaire,
      flatRow,
      extraData: payload.extraData ?? payload,
      ...flatQuestionnaire,
      ...payload
    };

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(bodyData)
    });
    return true;
  } catch (error) {
    console.error('Google Cloud sync error:', error);
    return false;
  }
};

export const fetchCloudData = async (): Promise<any> => {
  const url = getEffectiveWebAppUrl();
  if (!url) throw new Error('No Apps Script Web App URL configured.');
  const response = await fetch(`${url}?type=get_all&t=${Date.now()}`, {
    method: 'GET',
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
};

export const findExtraData = (row: any[]): Record<string, any> => {
  if (!Array.isArray(row)) return {};
  for (let i = row.length - 1; i >= 0; i--) {
    const val = row[i];
    if (typeof val === 'string' && val.trim().startsWith('{')) {
      const p = safeJsonParse<Record<string, any>>(val, {});
      if (p && typeof p === 'object' && Object.keys(p).length > 0) {
        return p;
      }
    }
  }
  return {};
};

export const normalizeFamily = (data: any): Family | null => {
  if (!data) return null;
  if (Array.isArray(data)) {
    const extra = findExtraData(data);
    const id = String(extra.Family_ID ?? data[0] ?? '');
    const qr = String(extra.QR_Number ?? data[1] ?? '').trim().toUpperCase();
    if (!qr && !id) return null;
    return {
      Family_ID: id || `FAM-${Date.now()}`,
      Registration_Number: String(extra.Registration_Number ?? `REG-${qr}`),
      QR_Number: qr,
      Division_ID: String(extra.Division_ID ?? data[2] ?? 'GN001'),
      Division_Name: String(extra.Division_Name ?? data[3] ?? 'Panichchankerni'),
      Family_Name: String(extra.Family_Name ?? data[4] ?? 'Household ' + qr),
      Address: String(extra.Address ?? data[5] ?? ''),
      Telephone: String(extra.Telephone ?? data[6] ?? ''),
      Family_Size: Number(extra.Family_Size ?? data[7] ?? 1),
      Monthly_Income: Number(extra.Monthly_Income ?? data[8] ?? 0),
      Housing_Status: (extra.Housing_Status ?? data[9] ?? 'Own permanent') as any,
      Priority_Level: (extra.Priority_Level ?? data[10] ?? 'Normal') as any,
      Aswesuma_Category: (extra.Aswesuma_Category ?? 'Not selected') as AswesumaCategory,
      Status: (extra.Status ?? data[11] ?? 'Active') as any,
      Created_By: String(extra.Created_By ?? data[12] ?? 'cloud'),
      Created_At: String(extra.Created_At ?? data[13] ?? new Date().toISOString()),
      Updated_By: String(extra.Updated_By ?? data[14] ?? 'cloud'),
      Updated_At: String(extra.Updated_At ?? data[15] ?? new Date().toISOString()),
      is_female_headed: Boolean(extra.is_female_headed ?? (data[16] === 'YES' || data[16] === true)),
      no_toilet: Boolean(extra.no_toilet ?? (data[17] === 'YES' || data[17] === true)),
      no_drinking_water_well: Boolean(extra.no_drinking_water_well ?? (data[18] === 'YES' || data[18] === true)),
      no_house: Boolean(extra.no_house ?? (data[19] === 'YES' || data[19] === true)),
      vulnerability: extra.vulnerability
    };
  }
  if (typeof data === 'object') {
    const qr = String(data.QR_Number ?? data.qrNumber ?? '').trim().toUpperCase();
    if (!qr && !data.Family_ID) return null;
    return {
      Family_ID: String(data.Family_ID ?? `FAM-${Date.now()}`),
      Registration_Number: String(data.Registration_Number ?? `REG-${qr}`),
      QR_Number: qr,
      Division_ID: String(data.Division_ID ?? 'GN001'),
      Division_Name: String(data.Division_Name ?? 'Panichchankerni'),
      Family_Name: String(data.Family_Name ?? 'Household ' + qr),
      Address: String(data.Address ?? ''),
      Telephone: String(data.Telephone ?? ''),
      Family_Size: Number(data.Family_Size ?? 1),
      Monthly_Income: Number(data.Monthly_Income ?? data.Monthly_Income_LKR ?? 0),
      Housing_Status: data.Housing_Status ?? 'Own permanent',
      Priority_Level: data.Priority_Level ?? 'Normal',
      Aswesuma_Category: (data.Aswesuma_Category ?? 'Not selected') as AswesumaCategory,
      Status: data.Status ?? 'Active',
      Created_By: String(data.Created_By ?? 'cloud'),
      Created_At: String(data.Created_At ?? new Date().toISOString()),
      Updated_By: String(data.Updated_By ?? 'cloud'),
      Updated_At: String(data.Updated_At ?? new Date().toISOString()),
      is_female_headed: Boolean(data.is_female_headed || data.Is_Female_Headed === 'YES'),
      no_toilet: Boolean(data.no_toilet || data.No_Toilet === 'YES'),
      no_drinking_water_well: Boolean(data.no_drinking_water_well || data.No_Drinking_Water_Well === 'YES'),
      no_house: Boolean(data.no_house || data.No_House === 'YES'),
      vulnerability: data.vulnerability
    };
  }
  return null;
};

export const normalizeMember = (data: any): FamilyMember | null => {
  if (!data) return null;
  if (Array.isArray(data)) {
    const extra = findExtraData(data);
    const id = String(extra.Member_ID ?? data[0] ?? '');
    const qr = String(extra.QR_Number ?? data[1] ?? '').trim().toUpperCase();
    const nic = String(extra.NIC_Elder_ID ?? data[2] ?? '').trim();
    if (!nic && !id) return null;
    return {
      Member_ID: id || `MEM-${Date.now()}`,
      Registration_Number: extra.Registration_Number,
      QR_Number: qr,
      NIC_Elder_ID: nic,
      Is_Temp_NIC: Boolean(extra.Is_Temp_NIC || nic.startsWith('TMP-NIC-')),
      Aswesuma_Category: extra.Aswesuma_Category,
      Name: String(extra.Name ?? data[3] ?? 'Member'),
      Relationship: String(extra.Relationship ?? data[4] ?? 'Member'),
      DOB: String(extra.DOB ?? data[5] ?? ''),
      Gender: (extra.Gender ?? data[6] ?? 'Male') as any,
      Occupation: String(extra.Occupation ?? data[7] ?? ''),
      Monthly_Income: Number(extra.Monthly_Income ?? data[8] ?? 0),
      Education: String(extra.Education ?? data[9] ?? ''),
      Highland_Extent: extra.Highland_Extent,
      Paddy_Extent: extra.Paddy_Extent,
      Land_BLR_Deed_No: extra.Land_BLR_Deed_No,
      Calculated_Age: Number(extra.Calculated_Age ?? data[10] ?? 0),
      Disability: (extra.Disability ?? data[11] ?? 'No') as any,
      Disability_Type: extra.Disability_Type ?? data[12],
      Disability_Device_Needed: extra.Disability_Device_Needed ?? data[13],
      Disability_Allowance: extra.Disability_Allowance ?? data[14],
      Elderly: (extra.Elderly ?? data[15] ?? 'No') as any,
      Elderly_Allowance: extra.Elderly_Allowance ?? data[16],
      Elderly_Allowance_Amount: extra.Elderly_Allowance_Amount ?? data[17],
      Status: (extra.Status ?? data[18] ?? 'Active') as any,
      Created_By: String(extra.Created_By ?? data[19] ?? 'cloud'),
      Created_At: String(extra.Created_At ?? data[20] ?? new Date().toISOString()),
      Updated_By: String(extra.Updated_By ?? data[21] ?? 'cloud'),
      Updated_At: String(extra.Updated_At ?? data[22] ?? new Date().toISOString())
    };
  }
  if (typeof data === 'object') {
    const nic = String(data.NIC_Elder_ID ?? data.nic ?? '').trim();
    if (!nic && !data.Member_ID) return null;
    return {
      Member_ID: String(data.Member_ID ?? `MEM-${Date.now()}`),
      Registration_Number: data.Registration_Number,
      QR_Number: String(data.QR_Number ?? '').trim().toUpperCase(),
      NIC_Elder_ID: nic,
      Is_Temp_NIC: Boolean(data.Is_Temp_NIC || nic.startsWith('TMP-NIC-')),
      Aswesuma_Category: data.Aswesuma_Category,
      Name: String(data.Name ?? ''),
      Relationship: String(data.Relationship ?? 'Member'),
      DOB: String(data.DOB ?? ''),
      Gender: data.Gender ?? 'Male',
      Occupation: String(data.Occupation ?? ''),
      Monthly_Income: Number(data.Monthly_Income ?? 0),
      Education: String(data.Education ?? ''),
      Highland_Extent: data.Highland_Extent,
      Paddy_Extent: data.Paddy_Extent,
      Land_BLR_Deed_No: data.Land_BLR_Deed_No,
      Calculated_Age: Number(data.Calculated_Age ?? 0),
      Disability: data.Disability ?? 'No',
      Disability_Type: data.Disability_Type,
      Disability_Device_Needed: data.Disability_Device_Needed,
      Disability_Allowance: data.Disability_Allowance,
      Elderly: data.Elderly ?? 'No',
      Elderly_Allowance: data.Elderly_Allowance,
      Elderly_Allowance_Amount: data.Elderly_Allowance_Amount,
      Status: data.Status ?? 'Active',
      Created_By: String(data.Created_By ?? 'cloud'),
      Created_At: String(data.Created_At ?? new Date().toISOString()),
      Updated_By: String(data.Updated_By ?? 'cloud'),
      Updated_At: String(data.Updated_At ?? new Date().toISOString())
    };
  }
  return null;
};

export const normalizeAssistance = (data: any): AssistanceRecord | null => {
  if (!data) return null;
  if (Array.isArray(data)) {
    const extra = findExtraData(data);
    const id = String(extra.Assistance_ID ?? data[0] ?? '');
    const qr = String(extra.QR_Number ?? data[1] ?? '').trim().toUpperCase();
    if (!id && !qr) return null;
    return {
      Assistance_ID: id || `AST-${Date.now()}`,
      QR_Number: qr,
      Member_ID: String(extra.Member_ID ?? data[2] ?? ''),
      Program_ID: String(extra.Program_ID ?? data[3] ?? 'PRG001'),
      Program_Name: String(extra.Program_Name ?? data[4] ?? 'Assistance Program'),
      Assistance_Type: (extra.Assistance_Type ?? data[5] ?? 'Goods/In-kind') as any,
      Description: String(extra.Description ?? data[6] ?? ''),
      Amount: Number(extra.Amount ?? data[7] ?? 0),
      Quantity: Number(extra.Quantity ?? data[8] ?? 1),
      Unit: String(extra.Unit ?? data[9] ?? 'Unit'),
      Assistance_Date: String(extra.Assistance_Date ?? data[10] ?? new Date().toISOString().substring(0, 10)),
      Provided_By: String(extra.Provided_By ?? data[11] ?? 'officer01'),
      Status: (extra.Status ?? data[12] ?? 'Provided') as any,
      Remarks: String(extra.Remarks ?? data[13] ?? ''),
      Created_At: String(extra.Created_At ?? data[14] ?? new Date().toISOString())
    };
  }
  if (typeof data === 'object') {
    const id = String(data.Assistance_ID ?? '');
    const qr = String(data.QR_Number ?? '').trim().toUpperCase();
    if (!id && !qr) return null;
    return {
      Assistance_ID: id || `AST-${Date.now()}`,
      QR_Number: qr,
      Member_ID: String(data.Member_ID ?? ''),
      Program_ID: String(data.Program_ID ?? 'PRG001'),
      Program_Name: String(data.Program_Name ?? 'Assistance Program'),
      Assistance_Type: data.Assistance_Type ?? 'Goods/In-kind',
      Description: String(data.Description ?? ''),
      Amount: Number(data.Amount ?? 0),
      Quantity: Number(data.Quantity ?? 1),
      Unit: String(data.Unit ?? 'Unit'),
      Assistance_Date: String(data.Assistance_Date ?? new Date().toISOString().substring(0, 10)),
      Provided_By: String(data.Provided_By ?? 'officer01'),
      Status: data.Status ?? 'Provided',
      Remarks: String(data.Remarks ?? ''),
      Created_At: String(data.Created_At ?? new Date().toISOString())
    };
  }
  return null;
};

export const normalizeUser = (data: any): User | null => {
  if (!data) return null;
  if (Array.isArray(data)) {
    const extra = findExtraData(data);
    const uid = String(extra.User_ID ?? data[0] ?? '').trim();
    if (!uid) return null;
    return {
      User_ID: uid,
      Password: String(extra.Password ?? data[1] ?? ''),
      Name: String(extra.Name ?? data[2] ?? uid),
      Role: (extra.Role ?? data[3] ?? 'GN Officer') as any,
      Division: String(extra.Division ?? data[4] ?? 'ALL'),
      Status: (extra.Status ?? data[5] ?? 'Active') as any,
      Created_At: String(extra.Created_At ?? new Date().toISOString()),
      Last_Login: extra.Last_Login
    };
  }
  if (typeof data === 'object') {
    const uid = String(data.User_ID ?? '').trim();
    if (!uid) return null;
    return {
      User_ID: uid,
      Password: String(data.Password ?? ''),
      Name: String(data.Name ?? uid),
      Role: data.Role ?? 'GN Officer',
      Division: String(data.Division ?? 'ALL'),
      Status: data.Status ?? 'Active',
      Created_At: String(data.Created_At ?? new Date().toISOString()),
      Last_Login: data.Last_Login
    };
  }
  return null;
};
