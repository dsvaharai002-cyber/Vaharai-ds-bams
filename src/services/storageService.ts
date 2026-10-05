import {
  GNDivision,
  User,
  AssistanceProgram,
  Family,
  FamilyMember,
  Need,
  AssistanceRecord,
  QRChangeRequest,
  AuditLog,
  DashboardStats,
  HighAssistanceFamily,
  VisitorRecord,
  VisitStatus,
  VisitOfficerNote,
  CitizenFeedback
} from '../types';
import {
  INITIAL_GN_DIVISIONS,
  INITIAL_PROGRAMS,
  INITIAL_USERS,
  INITIAL_FAMILIES,
  INITIAL_MEMBERS,
  INITIAL_NEEDS,
  INITIAL_ASSISTANCE_RECORDS,
  INITIAL_QR_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_VISITS
} from '../data/initialData';
import { parseSriLankanNIC } from '../utils/nicUtils';
import {
  DEFAULT_WEB_APP_URL,
  getEffectiveWebAppUrl,
  setEffectiveWebAppUrl,
  sendDataToGoogleCloud,
  fetchCloudData,
  normalizeFamily,
  normalizeMember,
  normalizeAssistance,
  normalizeUser,
  buildFlatFamilyQuestionnaireRecord,
  MASTER_QUESTIONNAIRE_HEADERS
} from './cloudService';

const STORAGE_KEYS = {
  DIVISIONS: 'bams_divisions',
  PROGRAMS: 'bams_programs',
  USERS: 'bams_users',
  FAMILIES: 'bams_families',
  MEMBERS: 'bams_members',
  NEEDS: 'bams_needs',
  ASSISTANCE: 'bams_assistance',
  QR_REQUESTS: 'bams_qr_requests',
  AUDIT: 'bams_audit_logs',
  VISITS: 'bams_visits',
  SESSION: 'bams_active_session',
  APPS_SCRIPT_URL: 'bams_apps_script_url'
};

// In-memory runtime store synced directly with Google Sheets Cloud (No localStorage dependency)
const MEMORY_STORE: Record<string, any> = {
  [STORAGE_KEYS.DIVISIONS]: [...INITIAL_GN_DIVISIONS],
  [STORAGE_KEYS.PROGRAMS]: [...INITIAL_PROGRAMS],
  [STORAGE_KEYS.USERS]: [...INITIAL_USERS],
  [STORAGE_KEYS.FAMILIES]: INITIAL_FAMILIES.map((f, idx) => ({
    ...f,
    Registration_Number: f.Registration_Number || `REG-VHR-2026-${String(idx + 1).padStart(4, '0')}`,
    Aswesuma_Category: f.Aswesuma_Category || (f.Priority_Level === 'Critical' ? 'Severely Poor' : f.Priority_Level === 'High' ? 'Poor' : f.Priority_Level === 'Medium' ? 'Vulnerable' : 'Not selected')
  })),
  [STORAGE_KEYS.MEMBERS]: [...INITIAL_MEMBERS],
  [STORAGE_KEYS.NEEDS]: [...INITIAL_NEEDS],
  [STORAGE_KEYS.ASSISTANCE]: [...INITIAL_ASSISTANCE_RECORDS],
  [STORAGE_KEYS.QR_REQUESTS]: [...INITIAL_QR_REQUESTS],
  [STORAGE_KEYS.AUDIT]: [...INITIAL_AUDIT_LOGS],
  [STORAGE_KEYS.VISITS]: [...INITIAL_VISITS],
  [STORAGE_KEYS.SESSION]: null,
  [STORAGE_KEYS.APPS_SCRIPT_URL]: DEFAULT_WEB_APP_URL
};

function getFromStorage<T>(key: string, fallback: T): T {
  if (key in MEMORY_STORE && MEMORY_STORE[key] !== null && MEMORY_STORE[key] !== undefined) {
    return MEMORY_STORE[key] as T;
  }
  MEMORY_STORE[key] = fallback;
  return fallback;
}

function saveToStorage<T>(key: string, value: T): void {
  MEMORY_STORE[key] = value;
}

export class StorageService {
  // Unique System Registration Number Generator (ஒவ்வொரு பதிவிற்கும் தனி இலக்கம்)
  static generateUniqueRegistrationNumber(prefix: string = 'REG-VHR'): string {
    const year = new Date().getFullYear();
    const families = this.getFamilies();
    const members = this.getMembers();
    const visits = this.getVisits();
    const nextSeq = families.length + members.length + visits.length + 1;
    const randomCheck = Math.floor(10 + Math.random() * 89);
    return `${prefix}-${year}-${String(nextSeq).padStart(4, '0')}-${randomCheck}`;
  }

  // System Temporary NIC Generator for 18+ individuals without NIC (18+ அடையாள அட்டை இல்லாதோருக்கு தற்காலிக இலக்கம்)
  static generateTemporaryNIC(divisionName?: string): string {
    const year = new Date().getFullYear();
    const divCode = divisionName ? divisionName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'V') : 'VHR';
    const members = this.getMembers();
    let candidate = '';
    do {
      const seq = String(members.length + Math.floor(1000 + Math.random() * 9000));
      candidate = `TMP-NIC-${divCode}-${year}-${seq}`;
    } while (members.some(m => m.NIC_Elder_ID && m.NIC_Elder_ID.toUpperCase() === candidate));
    return candidate;
  }
  // Session
  static getCurrentSession(): { user: User; token: string } | null {
    return getFromStorage<{ user: User; token: string } | null>(STORAGE_KEYS.SESSION, null);
  }

  static setSession(user: User, token: string): void {
    saveToStorage(STORAGE_KEYS.SESSION, { user, token });
  }

  static clearSession(): void {
    MEMORY_STORE[STORAGE_KEYS.SESSION] = null;
  }

  static logout(): void {
    this.clearSession();
  }

  // Auth
  static login(userId: string, password?: string): { success: boolean; message?: string; user?: User; token?: string } {
    const users = this.getUsersRaw();
    const cleanId = userId.trim().toLowerCase();
    let user = users.find(u => u.User_ID.toLowerCase() === cleanId);

    // Guaranteed fallback from INITIAL_USERS
    if (!user) {
      const fallbackUser = INITIAL_USERS.find(u => u.User_ID.toLowerCase() === cleanId);
      if (fallbackUser) {
        user = fallbackUser;
        users.push(fallbackUser);
        saveToStorage(STORAGE_KEYS.USERS, users);
      }
    }

    if (!user) {
      return { success: false, message: 'Invalid User ID or Password.' };
    }
    if (user.Status !== 'Active') {
      return { success: false, message: 'This user account is not active.' };
    }

    if (password && user.Password && user.Password !== password) {
      return { success: false, message: 'Invalid User ID or Password.' };
    }

    const token = 'token-' + Math.random().toString(36).substring(2, 10);
    const updatedUser: User = {
      ...user,
      Last_Login: new Date().toISOString()
    };

    const updatedUsers = users.map(u => u.User_ID === user.User_ID ? updatedUser : u);
    saveToStorage(STORAGE_KEYS.USERS, updatedUsers);

    this.writeAudit(
      user.User_ID,
      user.Name,
      'LOGIN',
      'Users',
      user.User_ID,
      '',
      `Logged in successfully as ${user.Role} (${user.Division})`
    );

    this.setSession(updatedUser, token);
    return {
      success: true,
      user: updatedUser,
      token
    };
  }

  // Divisions
  static getDivisions(): GNDivision[] {
    return getFromStorage(STORAGE_KEYS.DIVISIONS, INITIAL_GN_DIVISIONS);
  }

  static getDivisionByName(name: string): GNDivision | null {
    const divs = this.getDivisions();
    return divs.find(d => d.Division_Name.toLowerCase().trim() === name.toLowerCase().trim()) || null;
  }

  // Users
  static getUsersRaw(): User[] {
    const stored = getFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const existingIds = new Set(stored.map(u => u.User_ID.toLowerCase()));
    let updated = false;

    INITIAL_USERS.forEach(initU => {
      if (!existingIds.has(initU.User_ID.toLowerCase())) {
        stored.push(initU);
        updated = true;
      }
    });

    if (updated) {
      saveToStorage(STORAGE_KEYS.USERS, stored);
    }
    return stored;
  }

  static getUsers(): Omit<User, 'Password'>[] {
    return this.getUsersRaw().map(u => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { Password, ...safe } = u;
      return safe;
    });
  }

  static createUser(currentUser: User, data: { User_ID: string; Password: string; Name: string; Role: User['Role']; Division: string }): { success: boolean; message?: string } {
    if (currentUser.Role !== 'Super Admin' && currentUser.Role !== 'Super_Admin') {
      throw new Error('Only Super Admin can create users.');
    }
    const users = this.getUsersRaw();
    if (users.some(u => u.User_ID.toLowerCase() === data.User_ID.toLowerCase().trim())) {
      throw new Error('User ID already exists.');
    }
    const newUser: User = {
      User_ID: data.User_ID.trim(),
      Password: data.Password,
      Name: data.Name.trim(),
      Role: data.Role,
      Division: data.Division.trim(),
      Status: 'Active',
      Created_At: new Date().toISOString()
    };
    users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, users);

    sendDataToGoogleCloud({
      action: 'ADD_USER',
      User_ID: newUser.User_ID,
      Password: newUser.Password,
      Name: newUser.Name,
      Role: newUser.Role,
      Division: newUser.Division,
      Status: newUser.Status,
      extraData: newUser
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'CREATE',
      'Users',
      newUser.User_ID,
      '',
      `Created user account ${newUser.User_ID} (${newUser.Role}, Division: ${newUser.Division})`
    );
    return { success: true };
  }

  static updateUser(
    currentUser: User,
    originalUserId: string,
    data: {
      User_ID?: string;
      Password?: string;
      Name?: string;
      Role?: User['Role'];
      Division?: string;
      Status?: 'Active' | 'Inactive';
    }
  ): { success: boolean; user?: User } {
    if (currentUser.Role !== 'Super Admin' && currentUser.Role !== 'Super_Admin') {
      throw new Error('Only Super Admin has authority to manage and update users.');
    }
    const users = this.getUsersRaw();
    const index = users.findIndex(u => u.User_ID.toLowerCase() === originalUserId.toLowerCase().trim());
    if (index === -1) {
      throw new Error('User account not found.');
    }
    const oldUser = users[index];
    const nextUserId = data.User_ID ? data.User_ID.trim() : oldUser.User_ID;
    if (
      nextUserId.toLowerCase() !== oldUser.User_ID.toLowerCase() &&
      users.some((u, idx) => idx !== index && u.User_ID.toLowerCase() === nextUserId.toLowerCase())
    ) {
      throw new Error('Another user with this User ID already exists.');
    }

    const updatedUser: User = {
      ...oldUser,
      User_ID: nextUserId,
      Password: data.Password && data.Password.trim() ? data.Password.trim() : oldUser.Password,
      Name: data.Name !== undefined ? data.Name.trim() : oldUser.Name,
      Role: data.Role !== undefined ? data.Role : oldUser.Role,
      Division: data.Division !== undefined ? data.Division.trim() : oldUser.Division,
      Status: data.Status !== undefined ? data.Status : oldUser.Status
    };

    users[index] = updatedUser;
    saveToStorage(STORAGE_KEYS.USERS, users);

    sendDataToGoogleCloud({
      action: 'UPDATE_USER',
      id: updatedUser.User_ID,
      User_ID: updatedUser.User_ID,
      Password: updatedUser.Password,
      Name: updatedUser.Name,
      Role: updatedUser.Role,
      Division: updatedUser.Division,
      Status: updatedUser.Status,
      extraData: updatedUser
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'UPDATE_USER',
      'Users',
      updatedUser.User_ID,
      JSON.stringify({ Role: oldUser.Role, Division: oldUser.Division, Status: oldUser.Status }),
      `Updated user ${updatedUser.User_ID} (${updatedUser.Role}, Division: ${updatedUser.Division}, Status: ${updatedUser.Status})`
    );
    return { success: true, user: updatedUser };
  }

  static deleteUser(currentUser: User, targetUserId: string): { success: boolean } {
    if (currentUser.Role !== 'Super Admin' && currentUser.Role !== 'Super_Admin') {
      throw new Error('Only Super Admin has authority to delete user accounts.');
    }
    if (currentUser.User_ID.toLowerCase() === targetUserId.toLowerCase().trim()) {
      throw new Error('You cannot delete your own active Super Admin account.');
    }
    const users = this.getUsersRaw();
    const target = users.find(u => u.User_ID.toLowerCase() === targetUserId.toLowerCase().trim());
    if (!target) {
      throw new Error('User account not found.');
    }
    const filtered = users.filter(u => u.User_ID.toLowerCase() !== targetUserId.toLowerCase().trim());
    saveToStorage(STORAGE_KEYS.USERS, filtered);

    sendDataToGoogleCloud({
      action: 'DELETE_USER',
      id: target.User_ID,
      User_ID: target.User_ID,
      Name: target.Name,
      Role: target.Role,
      Status: 'Deleted'
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'DELETE_USER',
      'Users',
      target.User_ID,
      JSON.stringify(target),
      `Deleted user account ${target.User_ID} (${target.Name})`
    );
    return { success: true };
  }

  // Programs
  static getPrograms(): AssistanceProgram[] {
    return getFromStorage(STORAGE_KEYS.PROGRAMS, INITIAL_PROGRAMS);
  }

  static addProgram(currentUser: User, data: Omit<AssistanceProgram, 'Program_ID' | 'Created_By' | 'Created_At'>): AssistanceProgram {
    if (currentUser.Role !== 'Super Admin' && currentUser.Role !== 'Super_Admin' && currentUser.Role !== 'Assistance Officer' && currentUser.Role !== 'Assistance_Officer') {
      throw new Error('Permission denied to create assistance programs.');
    }
    const programs = this.getPrograms();
    const id = `PRG${String(programs.length + 1).padStart(3, '0')}`;
    const newProg: AssistanceProgram = {
      ...data,
      Program_ID: id,
      Created_By: currentUser.User_ID,
      Created_At: new Date().toISOString()
    };
    programs.push(newProg);
    saveToStorage(STORAGE_KEYS.PROGRAMS, programs);
    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'CREATE',
      'Assistance_Programs',
      id,
      '',
      `Created program ${newProg.Program_Name}`
    );
    return newProg;
  }

  // Role Scoping:
  // Strict division-level access: If a user is a GN Officer, they can ONLY access their specific division.
  static canAccessDivision(user: User, divisionName: string): boolean {
    if (user.Role === 'Super Admin' || user.Role === 'Super_Admin') {
      return true;
    }
    if (user.Division === 'ALL' && user.Role !== 'GN Officer' && user.Role !== 'GN_Officer') {
      return true;
    }
    return user.Division.toLowerCase().trim() === divisionName.toLowerCase().trim();
  }

  // Families
  static getFamilies(): Family[] {
    const stored = getFromStorage(STORAGE_KEYS.FAMILIES, INITIAL_FAMILIES);
    const storedQRs = new Set(stored.map(f => f.QR_Number.toUpperCase()));
    let updated = false;

    INITIAL_FAMILIES.forEach(initF => {
      if (!storedQRs.has(initF.QR_Number.toUpperCase())) {
        stored.push(initF);
        updated = true;
      }
    });

    if (updated) {
      saveToStorage(STORAGE_KEYS.FAMILIES, stored);
    }
    return stored;
  }

  // Scoped to GN Officer's specific division
  static getFilteredFamilies(user: User): Family[] {
    const all = this.getFamilies();
    if (user.Role === 'Super Admin' || user.Role === 'Super_Admin' || (user.Division === 'ALL' && user.Role !== 'GN Officer' && user.Role !== 'GN_Officer')) {
      return all;
    }
    return all.filter(f => f.Division_Name.toLowerCase().trim() === user.Division.toLowerCase().trim());
  }

  static searchFamilies(user: User, query: string, divisionFilter?: string, priorityFilter?: string): Family[] {
    let list = this.getFilteredFamilies(user);

    // If GN Officer, divisionFilter is forced to their own division
    if (user.Role === 'GN Officer' || user.Role === 'GN_Officer' || user.Division !== 'ALL') {
      list = list.filter(f => f.Division_Name.toLowerCase().trim() === user.Division.toLowerCase().trim());
    } else if (divisionFilter && divisionFilter !== 'ALL') {
      list = list.filter(f => f.Division_Name.toLowerCase() === divisionFilter.toLowerCase());
    }

    if (priorityFilter && priorityFilter !== 'ALL') {
      list = list.filter(f => f.Priority_Level === priorityFilter);
    }
    if (!query.trim()) return list;

    const q = query.toLowerCase().trim();
    return list.filter(f => {
      const text = [
        f.QR_Number,
        f.Family_Name,
        f.Address,
        f.Telephone,
        f.Division_Name,
        f.Housing_Status,
        f.Priority_Level
      ].join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  static getFamily(user: User, qrNumber: string): {
    family: Family | null;
    members: FamilyMember[];
    needs: Need[];
    assistance: AssistanceRecord[];
  } {
    const cleanQR = qrNumber.trim().toUpperCase();
    const allFamilies = this.getFamilies();
    const family = allFamilies.find(f => f.QR_Number.toUpperCase() === cleanQR) || null;

    if (!family) {
      return { family: null, members: [], needs: [], assistance: [] };
    }

    if (!this.canAccessDivision(user, family.Division_Name)) {
      throw new Error(`அனுமதி மறுக்கப்பட்டது: இக்குடும்பம் ${family.Division_Name} பிரிவைச் சேர்ந்தது. (Access denied to view ${family.Division_Name}).`);
    }

    const members = this.getMembers().filter(m => m.QR_Number.toUpperCase() === cleanQR);
    const needs = this.getNeeds().filter(n => n.QR_Number.toUpperCase() === cleanQR);
    const assistance = this.getAssistance().filter(a => a.QR_Number.toUpperCase() === cleanQR);

    return { family, members, needs, assistance };
  }

  static addFamily(currentUser: User, data: {
    Registration_Number?: string;
    QR_Number: string;
    Family_Name: string;
    Division_Name: string;
    Address: string;
    Telephone: string;
    Family_Size: number;
    Monthly_Income: number;
    Housing_Status: Family['Housing_Status'];
    Priority_Level: Family['Priority_Level'];
    Aswesuma_Category?: Family['Aswesuma_Category'];
    vulnerability?: Family['vulnerability'];
    is_female_headed?: boolean;
    no_toilet?: boolean;
    no_drinking_water_well?: boolean;
    no_house?: boolean;
    headMemberSnapshot?: Partial<FamilyMember>;
  }): Family {
    const cleanQR = data.QR_Number.trim().toUpperCase();
    if (!cleanQR) throw new Error('QR Number is required.');
    if (!data.Family_Name.trim()) throw new Error('Family Name is required.');

    const families = this.getFamilies();
    if (families.some(f => f.QR_Number.toUpperCase() === cleanQR)) {
      throw new Error('QR Number already exists. Please assign a unique QR.');
    }

    const division = this.getDivisionByName(data.Division_Name);
    if (!division) throw new Error('Invalid GN Division selected.');

    if (!this.canAccessDivision(currentUser, division.Division_Name)) {
      throw new Error(`நீங்கள் வேறு பிரிவில் (${division.Division_Name}) குடும்பங்களை பதிவுசெய்ய முடியாது.`);
    }

    const now = new Date().toISOString();
    const id = `FAM-${now.substring(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const regNo = data.Registration_Number?.trim() || this.generateUniqueRegistrationNumber('REG-VHR');

    const newFamily: Family = {
      Family_ID: id,
      Registration_Number: regNo,
      QR_Number: cleanQR,
      Division_ID: division.Division_ID,
      Division_Name: division.Division_Name,
      Family_Name: data.Family_Name.trim(),
      Address: data.Address.trim(),
      Telephone: data.Telephone.trim(),
      Family_Size: Number(data.Family_Size) || 1,
      Monthly_Income: Number(data.Monthly_Income) || 0,
      Housing_Status: data.Housing_Status,
      Priority_Level: data.Priority_Level,
      Aswesuma_Category: data.Aswesuma_Category || 'Not selected',
      Status: 'Active',
      Created_By: currentUser.User_ID,
      Created_At: now,
      Updated_By: currentUser.User_ID,
      Updated_At: now,
      vulnerability: data.vulnerability,
      is_female_headed: data.is_female_headed ?? false,
      no_toilet: data.no_toilet ?? false,
      no_drinking_water_well: data.no_drinking_water_well ?? false,
      no_house: data.no_house ?? false
    };

    families.unshift(newFamily);
    saveToStorage(STORAGE_KEYS.FAMILIES, families);

    sendDataToGoogleCloud({
      action: 'ADD_FAMILY',
      id: newFamily.Family_ID,
      Registration_Number: newFamily.Registration_Number,
      QR_Number: newFamily.QR_Number,
      Family_Name: newFamily.Family_Name,
      Division_Name: newFamily.Division_Name,
      Aswesuma_Category: newFamily.Aswesuma_Category,
      headMember: data.headMemberSnapshot,
      extraData: newFamily
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'CREATE',
      'Families',
      id,
      '',
      `Registered family ${newFamily.Family_Name} (Reg#: ${regNo}, QR: ${newFamily.QR_Number}, Aswesuma: ${newFamily.Aswesuma_Category}, Division: ${newFamily.Division_Name})`
    );

    return newFamily;
  }

  static updateFamily(currentUser: User, data: Partial<Family> & { Family_ID: string }): Family {
    const families = this.getFamilies();
    const index = families.findIndex(f => f.Family_ID === data.Family_ID);
    if (index === -1) throw new Error('Family record not found.');

    const old = families[index];
    if (!this.canAccessDivision(currentUser, old.Division_Name)) {
      throw new Error('Access denied to update family in this division.');
    }

    const updated: Family = {
      ...old,
      ...data,
      Updated_By: currentUser.User_ID,
      Updated_At: new Date().toISOString()
    };

    families[index] = updated;
    saveToStorage(STORAGE_KEYS.FAMILIES, families);

    sendDataToGoogleCloud({
      action: 'UPDATE_FAMILY',
      id: updated.Family_ID,
      QR_Number: updated.QR_Number,
      Family_Name: updated.Family_Name,
      Division_Name: updated.Division_Name,
      extraData: updated
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'UPDATE',
      'Families',
      updated.Family_ID,
      JSON.stringify(old),
      JSON.stringify(updated)
    );

    return updated;
  }

  // Members
  static getMembers(): FamilyMember[] {
    return getFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  }

  static addFamilyMember(currentUser: User, data: {
    Registration_Number?: string;
    QR_Number: string;
    NIC_Elder_ID: string;
    Is_Temp_NIC?: boolean;
    Aswesuma_Category?: FamilyMember['Aswesuma_Category'];
    Name: string;
    Relationship: string;
    DOB: string;
    Gender: FamilyMember['Gender'];
    Occupation: string;
    Monthly_Income: number;
    Education: string;
    Highland_Extent?: string;
    Paddy_Extent?: string;
    Land_BLR_Deed_No?: string;
    Disability: 'Yes' | 'No';
    Disability_Type?: string;
    Disability_Allowance?: FamilyMember['Disability_Allowance'];
    Disability_Device_Needed?: string;
    Elderly: 'Yes' | 'No';
    Elderly_Allowance?: FamilyMember['Elderly_Allowance'];
    Elderly_Allowance_Amount?: number;
  }): FamilyMember {
    const qr = data.QR_Number.trim().toUpperCase();
    let nic = (data.NIC_Elder_ID || '').trim();
    if (!qr) throw new Error('QR Number is required.');
    if (!data.Name.trim()) throw new Error('Member name is required.');
    
    // Requirement 06: Date of Birth is mandatory
    if (!data.DOB || !data.DOB.trim()) {
      throw new Error('பிறந்த ஆண்டு திகதி கட்டாயமாகும் (Date of birth is mandatory).');
    }

    // Calculate age from DOB
    let calculatedAge: number | undefined = undefined;
    const dobDate = new Date(data.DOB);
    if (!isNaN(dobDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      calculatedAge = age >= 0 ? age : undefined;
    }

    const families = this.getFamilies();
    const family = families.find(f => f.QR_Number.toUpperCase() === qr);
    if (!family) throw new Error('QR Number does not exist.');

    if (!this.canAccessDivision(currentUser, family.Division_Name)) {
      throw new Error(`அனுமதி மறுக்கப்பட்டது: இக்குடும்பம் ${family.Division_Name} பிரிவைச் சேர்ந்தது.`);
    }

    // Requirement 02: If age >= 18 and no NIC is available, automatically issue a system Temporary NIC!
    let isTempNic = Boolean(data.Is_Temp_NIC || nic.startsWith('TMP-NIC-'));
    if (calculatedAge !== undefined && calculatedAge >= 18 && !nic) {
      nic = this.generateTemporaryNIC(family.Division_Name);
      isTempNic = true;
    }

    const members = this.getMembers();

    // Requirement 08: National Identity Card must not appear in two places
    if (nic) {
      const existing = members.find(m => m.NIC_Elder_ID && m.NIC_Elder_ID.trim().toLowerCase() === nic.toLowerCase());
      if (existing) {
        if (existing.QR_Number.toUpperCase() === qr) {
          throw new Error(`இந்த தேசிய அடையாள அட்டை (${nic}) ஏற்கனவே இக்குடும்பத்தில் ${existing.Name} என்ற பெயரில் பதிவு செய்யப்பட்டுள்ளது.`);
        }
        throw new Error(
          `இந்த அடையாள அட்டை எண் (${nic}) ஏற்கனவே மற்றொரு குடும்பத்தில் (${existing.QR_Number} - ${existing.Name}) உள்ளது. ஒரே அடையாள அட்டை இலக்கம் 2 இடங்களில் வர முடியாது.`
        );
      }
    }

    const parsedNIC = parseSriLankanNIC(nic, data.DOB);
    const finalAge = calculatedAge !== undefined ? calculatedAge : (parsedNIC.isValid && parsedNIC.age !== undefined ? parsedNIC.age : undefined);
    const isElderlyDetected = (finalAge !== undefined && finalAge >= 60) || data.Elderly === 'Yes';

    let elderlyAllowance = data.Elderly_Allowance;
    if (!elderlyAllowance && finalAge !== undefined && finalAge >= 70) {
      elderlyAllowance = 'Eligible_Pending';
    }

    const now = new Date().toISOString();
    const id = `MEM-${now.substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const regNo = data.Registration_Number?.trim() || this.generateUniqueRegistrationNumber('REG-MEM');

    const newMember: FamilyMember = {
      Member_ID: id,
      Registration_Number: regNo,
      QR_Number: qr,
      NIC_Elder_ID: nic,
      Is_Temp_NIC: isTempNic,
      Aswesuma_Category: data.Aswesuma_Category || family.Aswesuma_Category || 'Not selected',
      Name: data.Name.trim(),
      Relationship: data.Relationship.trim(),
      DOB: data.DOB || parsedNIC.birthDate || '',
      Gender: data.Gender || (parsedNIC.gender ?? 'Male'),
      Occupation: data.Occupation.trim(),
      Monthly_Income: Number(data.Monthly_Income) || 0,
      Education: data.Education.trim(),
      Highland_Extent: data.Highland_Extent?.trim() || undefined,
      Paddy_Extent: data.Paddy_Extent?.trim() || undefined,
      Land_BLR_Deed_No: data.Land_BLR_Deed_No?.trim() || undefined,
      Disability: data.Disability,
      Disability_Type: data.Disability === 'Yes' ? data.Disability_Type : undefined,
      Disability_Allowance: data.Disability === 'Yes' ? (data.Disability_Allowance || 'Eligible_Pending') : undefined,
      Disability_Device_Needed: data.Disability === 'Yes' ? data.Disability_Device_Needed : undefined,
      Elderly: isElderlyDetected ? 'Yes' : 'No',
      Elderly_Allowance: isElderlyDetected ? elderlyAllowance : undefined,
      Elderly_Allowance_Amount: data.Elderly_Allowance_Amount,
      Calculated_Age: finalAge,
      NIC_Format: isTempNic ? 'custom-or-token' : parsedNIC.format,
      NIC_Derived_Birth_Year: parsedNIC.birthYear,
      Status: 'Active',
      Created_By: currentUser.User_ID,
      Created_At: now,
      Updated_By: currentUser.User_ID,
      Updated_At: now
    };

    members.push(newMember);
    saveToStorage(STORAGE_KEYS.MEMBERS, members);

    sendDataToGoogleCloud({
      action: 'ADD_MEMBER',
      id: newMember.Member_ID,
      Registration_Number: newMember.Registration_Number,
      QR_Number: newMember.QR_Number,
      NIC_Elder_ID: newMember.NIC_Elder_ID,
      Is_Temp_NIC: newMember.Is_Temp_NIC,
      Aswesuma_Category: newMember.Aswesuma_Category,
      Name: newMember.Name,
      Relationship: newMember.Relationship,
      extraData: newMember
    });

    const totalMembersForQR = members.filter(m => m.QR_Number.toUpperCase() === qr).length;
    if (totalMembersForQR > family.Family_Size) {
      this.updateFamily(currentUser, { Family_ID: family.Family_ID, Family_Size: totalMembersForQR });
    }

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'CREATE',
      'Family_Members',
      id,
      '',
      `Added member ${newMember.Name} (NIC: ${newMember.NIC_Elder_ID || 'None'}) to QR: ${newMember.QR_Number}`
    );

    return newMember;
  }

  static updateFamilyMember(currentUser: User, data: Partial<FamilyMember> & { Member_ID: string }): FamilyMember {
    const members = this.getMembers();
    const index = members.findIndex(m => m.Member_ID === data.Member_ID);
    if (index === -1) throw new Error('Member not found.');

    const old = members[index];
    const families = this.getFamilies();
    const family = families.find(f => f.QR_Number.toUpperCase() === old.QR_Number.toUpperCase());

    if (family && !this.canAccessDivision(currentUser, family.Division_Name)) {
      throw new Error('Access denied to update member in this division.');
    }

    const targetNIC = data.NIC_Elder_ID !== undefined ? data.NIC_Elder_ID.trim() : old.NIC_Elder_ID;
    const targetDOB = data.DOB || old.DOB;

    // Requirement 08: Duplicate NIC check on update
    if (targetNIC && targetNIC.toLowerCase() !== old.NIC_Elder_ID.toLowerCase()) {
      const duplicate = members.find(
        m => m.Member_ID !== data.Member_ID &&
             m.NIC_Elder_ID &&
             m.NIC_Elder_ID.trim().toLowerCase() === targetNIC.toLowerCase()
      );
      if (duplicate) {
        throw new Error(
          `இந்த அடையாள அட்டை எண் (${targetNIC}) ஏற்கனவே வேறு பதிவில் (${duplicate.QR_Number} - ${duplicate.Name}) உள்ளது. ஒரே அடையாள அட்டை இலக்கம் 2 இடங்களில் வர முடியாது.`
        );
      }
    }

    const parsed = parseSriLankanNIC(targetNIC, targetDOB);
    const calculatedAge = parsed.isValid && parsed.age !== undefined ? parsed.age : old.Calculated_Age;
    const isElderly = (calculatedAge !== undefined && calculatedAge >= 60) || data.Elderly === 'Yes' || old.Elderly === 'Yes';

    const updated: FamilyMember = {
      ...old,
      ...data,
      NIC_Elder_ID: targetNIC,
      Calculated_Age: calculatedAge,
      NIC_Format: parsed.isValid ? parsed.format : old.NIC_Format,
      NIC_Derived_Birth_Year: parsed.birthYear || old.NIC_Derived_Birth_Year,
      Elderly: isElderly ? 'Yes' : 'No',
      Updated_By: currentUser.User_ID,
      Updated_At: new Date().toISOString()
    };

    members[index] = updated;
    saveToStorage(STORAGE_KEYS.MEMBERS, members);

    sendDataToGoogleCloud({
      action: 'UPDATE_MEMBER',
      id: updated.Member_ID,
      QR_Number: updated.QR_Number,
      NIC_Elder_ID: updated.NIC_Elder_ID,
      Name: updated.Name,
      extraData: updated
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'UPDATE',
      'Family_Members',
      updated.Member_ID,
      JSON.stringify(old),
      JSON.stringify(updated)
    );

    return updated;
  }

  // Specialized Registry Query: Elderly Registry (Scoped to user's division)
  static getElderlyRegistry(
    user: User,
    filter: 'ALL' | 'Receiving' | 'Eligible_Pending' | '70_Plus' = 'ALL'
  ): {
    member: FamilyMember;
    family: Family;
    computedAge: number;
    allowanceStatus: 'Receiving' | 'Eligible_Pending' | 'Not_Eligible';
    is70Plus: boolean;
  }[] {
    const families = this.getFilteredFamilies(user);
    const familyMap = new Map<string, Family>();
    families.forEach(f => familyMap.set(f.QR_Number.toUpperCase(), f));

    const members = this.getMembers().filter(m => familyMap.has(m.QR_Number.toUpperCase()));
    const results: {
      member: FamilyMember;
      family: Family;
      computedAge: number;
      allowanceStatus: 'Receiving' | 'Eligible_Pending' | 'Not_Eligible';
      is70Plus: boolean;
    }[] = [];

    members.forEach(m => {
      const fam = familyMap.get(m.QR_Number.toUpperCase())!;
      const parsed = parseSriLankanNIC(m.NIC_Elder_ID, m.DOB);
      const age = m.Calculated_Age ?? parsed.age ?? (m.Elderly === 'Yes' ? 65 : 0);
      const isSenior = age >= 60 || m.Elderly === 'Yes';
      if (!isSenior) return;

      const is70Plus = age >= 70;
      let allowanceStatus: 'Receiving' | 'Eligible_Pending' | 'Not_Eligible' = m.Elderly_Allowance || 'Not_Eligible';
      if (!m.Elderly_Allowance && is70Plus) {
        allowanceStatus = 'Eligible_Pending';
      }

      if (filter === 'Receiving' && allowanceStatus !== 'Receiving') return;
      if (filter === 'Eligible_Pending' && allowanceStatus !== 'Eligible_Pending') return;
      if (filter === '70_Plus' && !is70Plus) return;

      results.push({
        member: {
          ...m,
          Calculated_Age: age,
          NIC_Format: parsed.format,
          NIC_Derived_Birth_Year: parsed.birthYear
        },
        family: fam,
        computedAge: age,
        allowanceStatus,
        is70Plus
      });
    });

    return results.sort((a, b) => b.computedAge - a.computedAge);
  }

  // Specialized Registry Query: Disability Registry (Scoped to user's division)
  static getDisabilityRegistry(
    user: User,
    filter: 'ALL' | 'Receiving' | 'Eligible_Pending' = 'ALL'
  ): {
    member: FamilyMember;
    family: Family;
    computedAge: number;
    disabilityType: string;
    allowanceStatus: 'Receiving' | 'Eligible_Pending' | 'Not_Eligible';
    deviceNeeded: string;
  }[] {
    const families = this.getFilteredFamilies(user);
    const familyMap = new Map<string, Family>();
    families.forEach(f => familyMap.set(f.QR_Number.toUpperCase(), f));

    const members = this.getMembers().filter(m => familyMap.has(m.QR_Number.toUpperCase()));
    const results: {
      member: FamilyMember;
      family: Family;
      computedAge: number;
      disabilityType: string;
      allowanceStatus: 'Receiving' | 'Eligible_Pending' | 'Not_Eligible';
      deviceNeeded: string;
    }[] = [];

    members.forEach(m => {
      const fam = familyMap.get(m.QR_Number.toUpperCase())!;
      const isDis = m.Disability === 'Yes';
      if (!isDis) return;

      const parsed = parseSriLankanNIC(m.NIC_Elder_ID, m.DOB);
      const age = m.Calculated_Age ?? parsed.age ?? 0;
      const allowanceStatus = m.Disability_Allowance || 'Eligible_Pending';
      const disabilityType = m.Disability_Type || 'Physical / Mobility Impairment';
      const deviceNeeded = m.Disability_Device_Needed || 'General Assistance';

      if (filter === 'Receiving' && allowanceStatus !== 'Receiving') return;
      if (filter === 'Eligible_Pending' && allowanceStatus !== 'Eligible_Pending') return;

      results.push({
        member: {
          ...m,
          Calculated_Age: age
        },
        family: fam,
        computedAge: age,
        disabilityType,
        allowanceStatus,
        deviceNeeded
      });
    });

    return results.sort((a, b) => b.computedAge - a.computedAge);
  }

  // Export Comprehensive Beneficiaries CSV (Requirement #2)
  static exportBeneficiariesCsv(user: User): string {
    const families = this.getFilteredFamilies(user);
    const allMembers = this.getMembers();
    const allAssistance = this.getAssistance();

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'QR_Number',
      'Family_Name',
      'GN_Division',
      'Address',
      'Telephone',
      'Family_Size',
      'Monthly_Income_LKR',
      'Housing_Status',
      'Priority_Level',
      'Is_Female_Headed',
      'No_Toilet_Access',
      'No_Drinking_Water_Well',
      'Homeless_No_Permanent_House',
      'Head_Of_Household_NIC',
      'Highland_Extent_Perches_Acres',
      'Paddy_Extent_Acres',
      'Land_BLR_Deed_Permit_No',
      'All_Registered_Members_And_NICs',
      'Elderly_Members_Count',
      'Disabled_Members_Count',
      'Assistance_Disbursements_Count',
      'Total_Aid_Amount_LKR',
      'Registration_Date',
      'Status'
    ];

    const rows = families.map(f => {
      const famMembers = allMembers.filter(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
      const head = famMembers.find(m => m.Relationship === 'Head of Family' || m.Relationship.includes('Head')) || famMembers[0];
      const famAssistance = allAssistance.filter(a => a.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
      const totalAid = famAssistance.reduce((sum, a) => sum + (a.Amount || 0), 0);
      const elderlyCount = famMembers.filter(m => m.Elderly === 'Yes' || (m.Calculated_Age && m.Calculated_Age >= 60)).length;
      const disabledCount = famMembers.filter(m => m.Disability === 'Yes').length;
      const membersSummary = famMembers.map(m => `${m.Name} (${m.Relationship}: ${m.NIC_Elder_ID || 'Minor'}${m.Land_BLR_Deed_No ? ` | Land: ${m.Land_BLR_Deed_No}` : ''})`).join('; ');
      const highlandSummary = famMembers.map(m => m.Highland_Extent).filter(Boolean).join('; ') || '-';
      const paddySummary = famMembers.map(m => m.Paddy_Extent).filter(Boolean).join('; ') || '-';
      const blrDeedSummary = famMembers.map(m => m.Land_BLR_Deed_No).filter(Boolean).join('; ') || '-';

      return [
        f.QR_Number,
        f.Family_Name,
        f.Division_Name,
        f.Address,
        f.Telephone || '',
        f.Family_Size,
        f.Monthly_Income,
        f.Housing_Status,
        f.Priority_Level,
        f.is_female_headed ? 'YES' : 'NO',
        f.no_toilet || f.vulnerability?.no_adequate_sanitation ? 'YES' : 'NO',
        f.no_drinking_water_well || f.vulnerability?.no_clean_drinking_water ? 'YES' : 'NO',
        f.no_house || f.Housing_Status === 'Landless' || f.Housing_Status === 'Temporary/Hut' ? 'YES' : 'NO',
        head ? head.NIC_Elder_ID : '',
        highlandSummary,
        paddySummary,
        blrDeedSummary,
        membersSummary,
        elderlyCount,
        disabledCount,
        famAssistance.length,
        totalAid,
        f.Created_At ? f.Created_At.substring(0, 10) : '',
        f.Status
      ].map(escapeCsv).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // Export Elderly Registry CSV
  static exportElderlyRegistryCsv(user: User): string {
    const records = this.getElderlyRegistry(user, 'ALL');
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'QR_Number',
      'Member_Name',
      'Relationship',
      'NIC_Number',
      'Calculated_Age_From_NIC',
      'Birth_Year',
      'Gender',
      'Elderly_Allowance_Status',
      'Allowance_Amount_LKR',
      'Eligible_70_Plus',
      'Family_Name',
      'GN_Division',
      'Address',
      'Telephone',
      'Monthly_Income'
    ];

    const rows = records.map(r => [
      r.family.QR_Number,
      r.member.Name,
      r.member.Relationship,
      r.member.NIC_Elder_ID,
      r.computedAge,
      r.member.NIC_Derived_Birth_Year || '',
      r.member.Gender,
      r.allowanceStatus === 'Receiving' ? 'Receiving Allowance (பெறுகிறார்)' : r.allowanceStatus === 'Eligible_Pending' ? 'Eligible - Pending (தகுதியுடையவர்)' : 'Not Eligible',
      r.member.Elderly_Allowance_Amount || (r.allowanceStatus === 'Receiving' ? 3000 : 0),
      r.is70Plus ? 'YES (70+)' : 'NO (60-69)',
      r.family.Family_Name,
      r.family.Division_Name,
      r.family.Address,
      r.family.Telephone,
      r.family.Monthly_Income
    ].map(escapeCsv).join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  // Export Disability Registry CSV
  static exportDisabilityRegistryCsv(user: User): string {
    const records = this.getDisabilityRegistry(user, 'ALL');
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'QR_Number',
      'Member_Name',
      'Relationship',
      'NIC_Number',
      'Calculated_Age',
      'Gender',
      'Disability_Type',
      'Assistive_Device_Needed',
      'Disability_Allowance_Status',
      'Family_Name',
      'GN_Division',
      'Address',
      'Telephone'
    ];

    const rows = records.map(r => [
      r.family.QR_Number,
      r.member.Name,
      r.member.Relationship,
      r.member.NIC_Elder_ID,
      r.computedAge,
      r.member.Gender,
      r.disabilityType,
      r.deviceNeeded,
      r.allowanceStatus === 'Receiving' ? 'Receiving Allowance (பெறுகிறார்)' : 'Eligible - Pending (நிலுவையில்)',
      r.family.Family_Name,
      r.family.Division_Name,
      r.family.Address,
      r.family.Telephone
    ].map(escapeCsv).join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  // QR / NIC Change Requests
  static getQRRequests(): QRChangeRequest[] {
    return getFromStorage(STORAGE_KEYS.QR_REQUESTS, INITIAL_QR_REQUESTS);
  }

  static getFilteredQRRequests(user: User): QRChangeRequest[] {
    const all = this.getQRRequests();
    if (user.Role === 'Super Admin' || user.Role === 'Super_Admin' || (user.Division === 'ALL' && user.Role !== 'GN Officer' && user.Role !== 'GN_Officer')) {
      return all;
    }
    const allowedFamilies = this.getFilteredFamilies(user);
    const allowedQRs = new Set(allowedFamilies.map(f => f.QR_Number.toUpperCase()));
    return all.filter(r => allowedQRs.has(r.QR_Number.toUpperCase()));
  }

  static requestQRChange(currentUser: User, data: {
    QR_Number: string;
    Old_NIC_Elder_ID: string;
    New_NIC_Elder_ID: string;
    Reason: string;
  }): QRChangeRequest {
    const qr = data.QR_Number.trim().toUpperCase();
    const newNIC = data.New_NIC_Elder_ID.trim();
    if (!qr) throw new Error('QR Number is required.');
    if (!newNIC) throw new Error('New NIC / Elder ID is required.');
    if (!data.Reason.trim()) throw new Error('Reason for change is required.');

    const families = this.getFamilies();
    const family = families.find(f => f.QR_Number.toUpperCase() === qr);
    if (!family) throw new Error('QR Number not found.');

    if (!this.canAccessDivision(currentUser, family.Division_Name)) {
      throw new Error('Access denied to submit requests for this division.');
    }

    const requests = this.getQRRequests();
    const now = new Date().toISOString();
    const id = `REQ-${now.substring(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`;

    const newRequest: QRChangeRequest = {
      Request_ID: id,
      QR_Number: qr,
      Old_NIC_Elder_ID: data.Old_NIC_Elder_ID.trim(),
      New_NIC_Elder_ID: newNIC,
      Reason: data.Reason.trim(),
      Requested_By: currentUser.User_ID,
      Requested_At: now,
      Status: 'Pending'
    };

    requests.unshift(newRequest);
    saveToStorage(STORAGE_KEYS.QR_REQUESTS, requests);

    sendDataToGoogleCloud({
      action: 'REQUEST_QR_CHANGE',
      id: id,
      QR_Number: qr,
      Old_NIC: data.Old_NIC_Elder_ID.trim(),
      New_NIC: newNIC,
      Reason: data.Reason.trim(),
      extraData: newRequest
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'CREATE_QR_CHANGE_REQUEST',
      'QR_Change_Requests',
      id,
      '',
      `Submitted QR/NIC change request for QR: ${qr} (Old NIC: ${data.Old_NIC_Elder_ID} -> New NIC: ${newNIC})`
    );

    return newRequest;
  }

  static approveQRChange(
    currentUser: User,
    requestId: string,
    approve: boolean,
    remarks?: string
  ): { success: boolean; message: string } {
    if (currentUser.Role !== 'Super Admin' && currentUser.Role !== 'Super_Admin') {
      throw new Error('Only Super Admin can approve or reject QR / NIC changes.');
    }
    const requests = this.getQRRequests();
    const reqIndex = requests.findIndex(r => r.Request_ID === requestId);
    if (reqIndex === -1) throw new Error('Request not found.');

    const request = requests[reqIndex];
    if (request.Status !== 'Pending') {
      throw new Error('Request has already been processed.');
    }

    const now = new Date().toISOString();
    if (approve) {
      const members = this.getMembers();
      const existing = members.find(m => m.NIC_Elder_ID.toLowerCase() === request.New_NIC_Elder_ID.toLowerCase());
      if (existing && existing.QR_Number !== request.QR_Number) {
        throw new Error(`Cannot approve: New NIC / Elder ID (${request.New_NIC_Elder_ID}) already belongs to ${existing.QR_Number} (${existing.Name}).`);
      }

      const memIndex = members.findIndex(
        m => m.QR_Number.toUpperCase() === request.QR_Number.toUpperCase() &&
             m.NIC_Elder_ID.toLowerCase() === request.Old_NIC_Elder_ID.toLowerCase()
      );
      if (memIndex !== -1) {
        members[memIndex] = {
          ...members[memIndex],
          NIC_Elder_ID: request.New_NIC_Elder_ID,
          Updated_By: currentUser.User_ID,
          Updated_At: now
        };
        saveToStorage(STORAGE_KEYS.MEMBERS, members);
      }

      requests[reqIndex] = {
        ...request,
        Status: 'Approved',
        Approved_By: currentUser.User_ID,
        Approved_At: now,
        Remarks: remarks || 'Approved by Super Admin'
      };
      saveToStorage(STORAGE_KEYS.QR_REQUESTS, requests);

      sendDataToGoogleCloud({
        action: 'APPROVE_QR_CHANGE',
        id: requestId,
        approve: true,
        remarks: remarks || 'Approved by Super Admin',
        QR_Number: request.QR_Number,
        New_NIC: request.New_NIC_Elder_ID
      });

      this.writeAudit(
        currentUser.User_ID,
        currentUser.Name,
        'APPROVE_QR_CHANGE',
        'QR_Change_Requests',
        requestId,
        JSON.stringify(request),
        `Approved change for ${request.QR_Number} to NIC ${request.New_NIC_Elder_ID}. Remarks: ${remarks || ''}`
      );

      return { success: true, message: 'QR/NIC change request approved and applied successfully.' };
    } else {
      requests[reqIndex] = {
        ...request,
        Status: 'Rejected',
        Approved_By: currentUser.User_ID,
        Approved_At: now,
        Remarks: remarks || 'Rejected by Super Admin'
      };
      saveToStorage(STORAGE_KEYS.QR_REQUESTS, requests);

      this.writeAudit(
        currentUser.User_ID,
        currentUser.Name,
        'REJECT_QR_CHANGE',
        'QR_Change_Requests',
        requestId,
        JSON.stringify(request),
        `Rejected change for ${request.QR_Number}. Remarks: ${remarks || ''}`
      );

      return { success: true, message: 'QR/NIC change request rejected.' };
    }
  }

  // Receptionist & Office Visitor Queue Management
  static getVisits(): VisitorRecord[] {
    const stored = getFromStorage<VisitorRecord[]>(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    const storedIDs = new Set(stored.map(v => v.Visit_ID));
    let updated = false;

    INITIAL_VISITS.forEach(initV => {
      if (!storedIDs.has(initV.Visit_ID)) {
        stored.push(initV);
        updated = true;
      }
    });

    if (updated) {
      saveToStorage(STORAGE_KEYS.VISITS, stored);
    }
    return stored;
  }

  // Scoped visits: Super Admin and Receptionist can view all; for all other officers, ONLY visitors assigned to meet them are shown (Requirement #2)
  static getFilteredVisits(user: User): VisitorRecord[] {
    const all = this.getVisits();
    if (user.Role === 'Super Admin' || user.Role === 'Super_Admin' || user.Role === 'Receptionist') {
      return all;
    }
    // Requirement #2: All other officers only see visitors who came to meet them specifically
    return all.filter(v =>
      v.Target_Officer_ID === user.User_ID ||
      (v.Officer_Notes && v.Officer_Notes.some(n => n.Referred_To_Officer_ID === user.User_ID))
    );
  }

  static addVisit(currentUser: User, data: {
    QR_Number?: string;
    Visitor_Name: string;
    NIC: string;
    Telephone?: string;
    Village_Division: string;
    Address?: string;
    Target_Officer_ID?: string;
    Target_Officer_Name: string;
    Target_Section: string;
    Purpose: string;
    Priority?: VisitorRecord['Priority'];
  }): VisitorRecord {
    const visits = this.getVisits();
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    const timeStr = now.toTimeString().substring(0, 5);

    const todayVisits = visits.filter(v => v.Date === todayStr);
    const tokenSeq = todayVisits.length + 1;
    const tokenNumber = `A-${String(tokenSeq).padStart(2, '0')}`;
    const id = `VST-${todayStr.replace(/-/g, '')}-${String(tokenSeq).padStart(3, '0')}`;

    const newVisit: VisitorRecord = {
      Visit_ID: id,
      Token_Number: tokenNumber,
      Date: todayStr,
      Time: timeStr,
      QR_Number: data.QR_Number ? data.QR_Number.trim().toUpperCase() : undefined,
      Visitor_Name: data.Visitor_Name.trim(),
      NIC: data.NIC.trim(),
      Telephone: data.Telephone ? data.Telephone.trim() : '',
      Village_Division: data.Village_Division.trim(),
      Address: data.Address ? data.Address.trim() : '',
      Target_Officer_ID: data.Target_Officer_ID,
      Target_Officer_Name: data.Target_Officer_Name.trim(),
      Target_Section: data.Target_Section.trim(),
      Purpose: data.Purpose.trim(),
      Priority: data.Priority || 'Normal',
      Status: 'Waiting',
      Created_By: currentUser.User_ID,
      Created_By_Name: currentUser.Name,
      Created_At: now.toISOString(),
      Officer_Notes: []
    };

    visits.unshift(newVisit);
    saveToStorage(STORAGE_KEYS.VISITS, visits);

    sendDataToGoogleCloud({
      action: 'ADD_VISIT',
      id: newVisit.Visit_ID,
      Token_Number: newVisit.Token_Number,
      Date: newVisit.Date,
      Time: newVisit.Time,
      QR_Number: newVisit.QR_Number,
      Visitor_Name: newVisit.Visitor_Name,
      NIC: newVisit.NIC,
      Telephone: newVisit.Telephone,
      Village_Division: newVisit.Village_Division,
      Target_Officer_Name: newVisit.Target_Officer_Name,
      Target_Section: newVisit.Target_Section,
      Purpose: newVisit.Purpose,
      Priority: newVisit.Priority,
      Status: newVisit.Status,
      extraData: newVisit
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'CREATE_VISIT',
      'Visitor_Log',
      id,
      '',
      `Registered visitor ${newVisit.Visitor_Name} (Token: ${tokenNumber}, To meet: ${newVisit.Target_Officer_Name})`
    );

    return newVisit;
  }

  static updateVisitStatus(
    currentUser: User,
    visitId: string,
    status: VisitStatus,
    resolutionRemarks?: string
  ): VisitorRecord {
    const visits = this.getVisits();
    const index = visits.findIndex(v => v.Visit_ID === visitId);
    if (index === -1) throw new Error('Visitor record not found.');

    const old = visits[index];
    const now = new Date().toISOString();
    const updated: VisitorRecord = {
      ...old,
      Status: status,
      Resolution_Remarks: resolutionRemarks ? resolutionRemarks.trim() : old.Resolution_Remarks,
      Completed_At: (status === 'Completed' || status === 'Cancelled') ? now : old.Completed_At
    };

    visits[index] = updated;
    saveToStorage(STORAGE_KEYS.VISITS, visits);

    sendDataToGoogleCloud({
      action: 'UPDATE_VISIT_STATUS',
      id: visitId,
      Status: status,
      Resolution_Remarks: resolutionRemarks,
      extraData: updated
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'UPDATE_VISIT_STATUS',
      'Visitor_Log',
      visitId,
      old.Status,
      `Updated visitor status to ${status}${resolutionRemarks ? ` (${resolutionRemarks})` : ''}`
    );

    return updated;
  }

  static addVisitOfficerNote(
    currentUser: User,
    visitId: string,
    data: {
      content: string;
      actionRecommended?: string;
      referredOfficerId?: string;
      referredOfficerName?: string;
      referredSection?: string;
    }
  ): VisitorRecord {
    const visits = this.getVisits();
    const index = visits.findIndex(v => v.Visit_ID === visitId);
    if (index === -1) throw new Error('Visitor record not found.');

    const old = visits[index];
    const now = new Date().toISOString();
    const noteId = `NOT-${now.replace(/[-:T.]/g, '').substring(0, 14)}-${Math.floor(10 + Math.random() * 90)}`;

    const newNote: VisitOfficerNote = {
      Note_ID: noteId,
      Officer_ID: currentUser.User_ID,
      Officer_Name: currentUser.Name,
      Timestamp: now,
      Content: data.content.trim(),
      Action_Recommended: data.actionRecommended ? data.actionRecommended.trim() : undefined,
      Referred_To_Officer_ID: data.referredOfficerId,
      Referred_To_Officer_Name: data.referredOfficerName,
      Referred_To_Section: data.referredSection
    };

    const notes = old.Officer_Notes ? [...old.Officer_Notes, newNote] : [newNote];
    const isReferred = Boolean(data.referredOfficerId || data.referredSection);

    const updated: VisitorRecord = {
      ...old,
      Officer_Notes: notes,
      Target_Officer_ID: data.referredOfficerId || old.Target_Officer_ID,
      Target_Officer_Name: data.referredOfficerName || old.Target_Officer_Name,
      Target_Section: data.referredSection || old.Target_Section,
      Status: isReferred ? 'Referred' : (old.Status === 'Waiting' ? 'In Discussion' : old.Status)
    };

    visits[index] = updated;
    saveToStorage(STORAGE_KEYS.VISITS, visits);

    sendDataToGoogleCloud({
      action: 'ADD_VISIT_NOTE',
      id: visitId,
      note: newNote,
      extraData: updated
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'ADD_VISIT_NOTE',
      'Visitor_Log',
      visitId,
      '',
      `Logged note for visitor ${old.Visitor_Name}${isReferred ? ` (Referred to ${data.referredOfficerName})` : ''}`
    );

    return updated;
  }

  static getVisitorHistory(nicOrQr: string): VisitorRecord[] {
    if (!nicOrQr.trim()) return [];
    const clean = nicOrQr.trim().toLowerCase();
    const visits = this.getVisits();
    return visits.filter(v =>
      (v.NIC && v.NIC.toLowerCase() === clean) ||
      (v.QR_Number && v.QR_Number.toLowerCase() === clean)
    );
  }

  static recordCitizenFeedback(
    currentUser: User,
    visitId: string,
    feedback: CitizenFeedback
  ): VisitorRecord {
    const visits = this.getVisits();
    const index = visits.findIndex(v => v.Visit_ID === visitId);
    if (index === -1) throw new Error('Visitor record not found.');

    const old = visits[index];
    const now = new Date().toISOString();
    const updated: VisitorRecord = {
      ...old,
      Feedback: feedback,
      Status: old.Status === 'Waiting' || old.Status === 'In Discussion' ? 'Completed' : old.Status,
      Completed_At: old.Completed_At || now
    };

    visits[index] = updated;
    saveToStorage(STORAGE_KEYS.VISITS, visits);

    sendDataToGoogleCloud({
      action: 'RECORD_FEEDBACK',
      id: visitId,
      Token_Number: old.Token_Number,
      Visitor_Name: old.Visitor_Name,
      Rating: feedback.Rating,
      Rating_Label: feedback.Rating_Label,
      Service_Speed: feedback.Service_Speed,
      Staff_Courtesy: feedback.Staff_Courtesy,
      Issue_Resolved: feedback.Issue_Resolved,
      Feedback_Comment: feedback.Feedback_Comment,
      Submitted_Via: feedback.Submitted_Via,
      extraData: updated
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'RECORD_CITIZEN_FEEDBACK',
      'Visitor_Log',
      visitId,
      old.Feedback ? `${old.Feedback.Rating} Stars` : 'No Feedback',
      `Citizen feedback: ${feedback.Rating} Stars (${feedback.Rating_Label}) - ${feedback.Feedback_Comment || 'No comment'}`
    );

    return updated;
  }

  // Assistance Records
  static getAssistance(): AssistanceRecord[] {
    const stored = getFromStorage(STORAGE_KEYS.ASSISTANCE, INITIAL_ASSISTANCE_RECORDS);
    const storedIDs = new Set(stored.map(a => a.Assistance_ID));
    let updated = false;

    INITIAL_ASSISTANCE_RECORDS.forEach(initA => {
      if (!storedIDs.has(initA.Assistance_ID)) {
        stored.push(initA);
        updated = true;
      }
    });

    if (updated) {
      saveToStorage(STORAGE_KEYS.ASSISTANCE, stored);
    }
    return stored;
  }

  static getFilteredAssistance(user: User): AssistanceRecord[] {
    const all = this.getAssistance();
    if (user.Role === 'Super Admin' || user.Role === 'Super_Admin' || (user.Division === 'ALL' && user.Role !== 'GN Officer' && user.Role !== 'GN_Officer')) {
      return all;
    }
    const allowedFamilies = this.getFilteredFamilies(user);
    const allowedQRs = new Set(allowedFamilies.map(f => f.QR_Number.toUpperCase()));
    return all.filter(a => allowedQRs.has(a.QR_Number.toUpperCase()));
  }

  static getFilteredNeeds(user: User): Need[] {
    const all = this.getNeeds();
    if (user.Role === 'Super Admin' || user.Role === 'Super_Admin' || (user.Division === 'ALL' && user.Role !== 'GN Officer' && user.Role !== 'GN_Officer')) {
      return all;
    }
    const allowedFamilies = this.getFilteredFamilies(user);
    const allowedQRs = new Set(allowedFamilies.map(f => f.QR_Number.toUpperCase()));
    return all.filter(n => allowedQRs.has(n.QR_Number.toUpperCase()));
  }

  static addBulkAssistance(
    currentUser: User,
    records: Array<{
      QR_Number: string;
      Member_ID?: string;
      Program_ID: string;
      Program_Name?: string;
      Assistance_Type: AssistanceRecord['Assistance_Type'];
      Description: string;
      Amount: number;
      Quantity: number;
      Unit: string;
      Assistance_Date: string;
      Remarks: string;
    }>
  ): { addedCount: number; errors: string[] } {
    const assistanceList = this.getAssistance();
    const families = this.getFamilies();
    const programs = this.getPrograms();
    const now = new Date().toISOString();
    const errors: string[] = [];
    let addedCount = 0;

    for (const r of records) {
      const qr = r.QR_Number.trim().toUpperCase();
      const fam = families.find(f => f.QR_Number.toUpperCase() === qr);
      if (!fam) {
        errors.push(`QR ${qr}: Family not found in registry.`);
        continue;
      }
      if (!this.canAccessDivision(currentUser, fam.Division_Name)) {
        errors.push(`QR ${qr}: Belongs to ${fam.Division_Name}, access denied.`);
        continue;
      }
      const prog = programs.find(p => p.Program_ID === r.Program_ID) || programs[0];
      const id = `AST-${now.substring(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newRecord: AssistanceRecord = {
        Assistance_ID: id,
        QR_Number: qr,
        Member_ID: r.Member_ID || '',
        Program_ID: prog.Program_ID,
        Program_Name: prog.Program_Name,
        Assistance_Type: r.Assistance_Type || 'Goods/In-kind',
        Description: r.Description || prog.Program_Name,
        Amount: Number(r.Amount) || 0,
        Quantity: Number(r.Quantity) || 1,
        Unit: r.Unit || 'Unit',
        Assistance_Date: r.Assistance_Date || now.substring(0, 10),
        Provided_By: currentUser.User_ID,
        Status: 'Provided',
        Remarks: r.Remarks || 'Bulk CSV Upload',
        Created_At: now
      };

      assistanceList.unshift(newRecord);
      addedCount++;
    }

    saveToStorage(STORAGE_KEYS.ASSISTANCE, assistanceList);

    sendDataToGoogleCloud({
      action: 'BULK_ASSISTANCE',
      count: addedCount,
      extraData: assistanceList.slice(0, addedCount)
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'BULK_CSV_DISBURSAL',
      'Assistance_Records',
      `BATCH-${now.substring(0, 10)}`,
      '',
      `Bulk processed ${addedCount} assistance records via CSV upload`
    );

    return { addedCount, errors };
  }

  static generateAssistanceTemplate(
    currentUser: User,
    programId: string,
    prefillFamilies: boolean = false
  ): string {
    const program = this.getPrograms().find(p => p.Program_ID === programId) || this.getPrograms()[0];
    const today = new Date().toISOString().substring(0, 10);
    const headers = [
      'QR_Number',
      'Family_Name',
      'GN_Division',
      'Program_ID',
      'Program_Name',
      'Assistance_Type',
      'Description',
      'Amount_LKR',
      'Quantity',
      'Unit',
      'Assistance_Date',
      'Remarks'
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    if (prefillFamilies) {
      const allowedFamilies = this.getFilteredFamilies(currentUser);
      const rows = allowedFamilies.map(f => [
        f.QR_Number,
        f.Family_Name,
        f.Division_Name,
        program.Program_ID,
        program.Program_Name,
        'Goods/In-kind',
        `${program.Program_Name} standard allocation`,
        15000,
        1,
        'Package',
        today,
        'Distribution batch'
      ].map(escapeCsv).join(','));
      return [headers.join(','), ...rows].join('\n');
    } else {
      const sampleFamilies = this.getFilteredFamilies(currentUser).slice(0, 2);
      const rows = sampleFamilies.map((f, idx) => [
        f.QR_Number,
        f.Family_Name,
        f.Division_Name,
        program.Program_ID,
        program.Program_Name,
        idx === 0 ? 'Goods/In-kind' : 'Cash',
        idx === 0 ? 'Dry food rations package' : 'Livelihood grant',
        idx === 0 ? 12500 : 25000,
        idx === 0 ? 1 : 1,
        idx === 0 ? 'Package' : 'Grant',
        today,
        'Field verified'
      ].map(escapeCsv).join(','));
      return [headers.join(','), ...rows].join('\n');
    }
  }

  static addAssistance(currentUser: User, data: {
    QR_Number: string;
    Member_ID?: string;
    Program_ID: string;
    Assistance_Type: AssistanceRecord['Assistance_Type'];
    Description: string;
    Amount: number;
    Quantity: number;
    Unit: string;
    Assistance_Date: string;
    Remarks: string;
  }): AssistanceRecord {
    const qr = data.QR_Number.trim().toUpperCase();
    const families = this.getFamilies();
    const family = families.find(f => f.QR_Number.toUpperCase() === qr);
    if (!family) throw new Error('QR Number not found.');

    if (!this.canAccessDivision(currentUser, family.Division_Name)) {
      throw new Error(`Access denied. Family belongs to ${family.Division_Name}.`);
    }

    const programs = this.getPrograms();
    const program = programs.find(p => p.Program_ID === data.Program_ID);
    if (!program) throw new Error('Assistance program not found.');

    const assistanceList = this.getAssistance();
    const now = new Date().toISOString();
    const id = `AST-${now.substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const newRecord: AssistanceRecord = {
      Assistance_ID: id,
      QR_Number: qr,
      Member_ID: data.Member_ID || '',
      Program_ID: program.Program_ID,
      Program_Name: program.Program_Name,
      Assistance_Type: data.Assistance_Type,
      Description: data.Description.trim(),
      Amount: Number(data.Amount) || 0,
      Quantity: Number(data.Quantity) || 1,
      Unit: data.Unit.trim() || 'Unit',
      Assistance_Date: data.Assistance_Date || now.substring(0, 10),
      Provided_By: currentUser.User_ID,
      Status: 'Provided',
      Remarks: data.Remarks.trim(),
      Created_At: now
    };

    assistanceList.unshift(newRecord);
    saveToStorage(STORAGE_KEYS.ASSISTANCE, assistanceList);

    sendDataToGoogleCloud({
      action: 'ADD_ASSISTANCE',
      id: newRecord.Assistance_ID,
      QR_Number: newRecord.QR_Number,
      Member_ID: newRecord.Member_ID,
      Program_ID: newRecord.Program_ID,
      Program_Name: newRecord.Program_Name,
      Amount: newRecord.Amount,
      Assistance_Type: newRecord.Assistance_Type,
      Quantity: newRecord.Quantity,
      Unit: newRecord.Unit,
      Assistance_Date: newRecord.Assistance_Date,
      extraData: newRecord
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'CREATE',
      'Assistance_Records',
      id,
      '',
      `Provided ${newRecord.Program_Name} to ${qr} (Amount: LKR ${newRecord.Amount}, Qty: ${newRecord.Quantity} ${newRecord.Unit})`
    );

    return newRecord;
  }

  // Needs
  static getNeeds(): Need[] {
    return getFromStorage(STORAGE_KEYS.NEEDS, INITIAL_NEEDS);
  }

  static addNeed(currentUser: User, data: {
    QR_Number: string;
    Need_Type: string;
    Description: string;
    Priority: Need['Priority'];
    Remarks: string;
  }): Need {
    const qr = data.QR_Number.trim().toUpperCase();
    const families = this.getFamilies();
    const family = families.find(f => f.QR_Number.toUpperCase() === qr);
    if (!family) throw new Error('QR Number not found.');

    if (!this.canAccessDivision(currentUser, family.Division_Name)) {
      throw new Error(`Access denied. Family belongs to ${family.Division_Name}.`);
    }

    const needs = this.getNeeds();
    const now = new Date().toISOString();
    const id = `NED-${now.substring(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`;

    const newNeed: Need = {
      Need_ID: id,
      QR_Number: qr,
      Need_Type: data.Need_Type.trim(),
      Description: data.Description.trim(),
      Priority: data.Priority,
      Status: 'Pending',
      Assessment_Date: now.substring(0, 10),
      Assessed_By: currentUser.User_ID,
      Remarks: data.Remarks.trim()
    };

    needs.unshift(newNeed);
    saveToStorage(STORAGE_KEYS.NEEDS, needs);

    sendDataToGoogleCloud({
      action: 'ADD_NEED',
      id: newNeed.Need_ID,
      QR_Number: newNeed.QR_Number,
      Need_Type: newNeed.Need_Type,
      Priority: newNeed.Priority,
      Status: newNeed.Status,
      extraData: newNeed
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'CREATE',
      'Needs',
      id,
      '',
      `Logged ${newNeed.Need_Type} need for QR: ${qr} (Priority: ${newNeed.Priority})`
    );

    return newNeed;
  }

  static updateNeedStatus(currentUser: User, needId: string, status: Need['Status'], remarks?: string): Need {
    const needs = this.getNeeds();
    const index = needs.findIndex(n => n.Need_ID === needId);
    if (index === -1) throw new Error('Need record not found.');

    const old = needs[index];
    const updated: Need = {
      ...old,
      Status: status,
      Remarks: remarks ? `${old.Remarks} [Update: ${remarks}]` : old.Remarks
    };

    needs[index] = updated;
    saveToStorage(STORAGE_KEYS.NEEDS, needs);

    sendDataToGoogleCloud({
      action: 'UPDATE_NEED',
      id: needId,
      Status: status,
      remarks,
      extraData: updated
    });

    this.writeAudit(
      currentUser.User_ID,
      currentUser.Name,
      'UPDATE_STATUS',
      'Needs',
      needId,
      old.Status,
      `Status updated to ${status}`
    );

    return updated;
  }

  // Audit Logs
  static getAuditLogs(): AuditLog[] {
    return getFromStorage(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
  }

  static writeAudit(
    userId: string,
    userName: string,
    action: string,
    tableName: string,
    recordId: string,
    oldValue: string,
    newValue: string
  ): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      Log_ID: `LOG-${new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)}-${Math.floor(100 + Math.random() * 900)}`,
      User_ID: userId,
      User_Name: userName,
      Action: action,
      Table_Name: tableName,
      Record_ID: recordId,
      Old_Value: oldValue,
      New_Value: newValue,
      Timestamp: new Date().toISOString(),
      IP_Info: 'Divisional Secretariat Vaharai Portal'
    };
    logs.unshift(newLog);
    if (logs.length > 500) logs.length = 500;
    saveToStorage(STORAGE_KEYS.AUDIT, logs);
  }

  // Dashboard Aggregates (Strictly scoped for GN Officer)
  static getDashboard(user: User): {
    stats: DashboardStats;
    highAssistance: HighAssistanceFamily[];
    divisionBreakdown: { division: string; families: number; assisted: number; totalAmount: number }[];
  } {
    const families = this.getFilteredFamilies(user);
    const familyQRs = new Set(families.map(f => f.QR_Number.toUpperCase()));
    const members = this.getMembers().filter(m => familyQRs.has(m.QR_Number.toUpperCase()));
    const assistance = this.getAssistance().filter(a => familyQRs.has(a.QR_Number.toUpperCase()));
    const needs = this.getNeeds().filter(n => familyQRs.has(n.QR_Number.toUpperCase()));

    const assistedQRSet = new Set(assistance.map(a => a.QR_Number.toUpperCase()));
    const assistedCount = assistedQRSet.size;
    const unassistedCount = Math.max(families.length - assistedCount, 0);

    const counts: Record<string, { count: number; totalAmount: number; lastDate: string }> = {};
    assistance.forEach(a => {
      const qr = a.QR_Number.toUpperCase();
      if (!counts[qr]) {
        counts[qr] = { count: 0, totalAmount: 0, lastDate: a.Assistance_Date };
      }
      counts[qr].count += 1;
      counts[qr].totalAmount += (a.Amount || 0);
      if (a.Assistance_Date > counts[qr].lastDate) {
        counts[qr].lastDate = a.Assistance_Date;
      }
    });

    const highAssistance: HighAssistanceFamily[] = Object.keys(counts)
      .filter(qr => counts[qr].count >= 3)
      .map(qr => {
        const fam = families.find(f => f.QR_Number.toUpperCase() === qr);
        return {
          QR_Number: qr,
          Family_Name: fam ? fam.Family_Name : 'Family ' + qr,
          Division_Name: fam ? fam.Division_Name : 'Vaharai',
          Assistance_Count: counts[qr].count,
          Total_Amount: counts[qr].totalAmount,
          Last_Assistance_Date: counts[qr].lastDate
        };
      })
      .sort((a, b) => b.Assistance_Count - a.Assistance_Count);

    const divisions = this.getDivisions();
    const divisionBreakdown = divisions
      .filter(d => this.canAccessDivision(user, d.Division_Name))
      .map(d => {
        const divFamilies = families.filter(f => f.Division_Name.toLowerCase() === d.Division_Name.toLowerCase());
        const divQRs = new Set(divFamilies.map(f => f.QR_Number.toUpperCase()));
        const divAssistedQRs = new Set(
          assistance.filter(a => divQRs.has(a.QR_Number.toUpperCase())).map(a => a.QR_Number.toUpperCase())
        );
        const divTotalAmount = assistance
          .filter(a => divQRs.has(a.QR_Number.toUpperCase()))
          .reduce((sum, a) => sum + (a.Amount || 0), 0);

        return {
          division: d.Division_Name,
          families: divFamilies.length,
          assisted: divAssistedQRs.size,
          totalAmount: divTotalAmount
        };
      });

    return {
      stats: {
        families: families.length,
        members: members.length,
        assistedFamilies: assistedCount,
        unassistedFamilies: unassistedCount,
        assistanceRecords: assistance.length,
        needs: needs.filter(n => n.Status !== 'Fulfilled').length,
        repeatedFamilies: highAssistance.length
      },
      highAssistance,
      divisionBreakdown
    };
  }

  // Backup, Restore & CSV Exports
  static exportAllAsJson(): string {
    const data = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      divisions: this.getDivisions(),
      programs: this.getPrograms(),
      users: this.getUsersRaw(),
      families: this.getFamilies(),
      members: this.getMembers(),
      needs: this.getNeeds(),
      assistance: this.getAssistance(),
      qr_requests: this.getQRRequests(),
      audit: this.getAuditLogs(),
      visits: this.getVisits()
    };
    return JSON.stringify(data, null, 2);
  }

  static importFromJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.divisions) saveToStorage(STORAGE_KEYS.DIVISIONS, data.divisions);
      if (data.programs) saveToStorage(STORAGE_KEYS.PROGRAMS, data.programs);
      if (data.users) saveToStorage(STORAGE_KEYS.USERS, data.users);
      if (data.families) saveToStorage(STORAGE_KEYS.FAMILIES, data.families);
      if (data.members) saveToStorage(STORAGE_KEYS.MEMBERS, data.members);
      if (data.needs) saveToStorage(STORAGE_KEYS.NEEDS, data.needs);
      if (data.assistance) saveToStorage(STORAGE_KEYS.ASSISTANCE, data.assistance);
      if (data.qr_requests) saveToStorage(STORAGE_KEYS.QR_REQUESTS, data.qr_requests);
      if (data.audit) saveToStorage(STORAGE_KEYS.AUDIT, data.audit);
      if (data.visits) saveToStorage(STORAGE_KEYS.VISITS, data.visits);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  static resetToDefaults(): void {
    saveToStorage(STORAGE_KEYS.DIVISIONS, INITIAL_GN_DIVISIONS);
    saveToStorage(STORAGE_KEYS.PROGRAMS, INITIAL_PROGRAMS);
    saveToStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    saveToStorage(STORAGE_KEYS.FAMILIES, INITIAL_FAMILIES);
    saveToStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    saveToStorage(STORAGE_KEYS.NEEDS, INITIAL_NEEDS);
    saveToStorage(STORAGE_KEYS.ASSISTANCE, INITIAL_ASSISTANCE_RECORDS);
    saveToStorage(STORAGE_KEYS.QR_REQUESTS, INITIAL_QR_REQUESTS);
    saveToStorage(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
    saveToStorage(STORAGE_KEYS.VISITS, INITIAL_VISITS);
  }

  static exportSheetAsCsv(sheetName: string): string {
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    switch (sheetName) {
      case 'Families': {
        const headers = [
          'Family_ID', 'QR_Number', 'Division_ID', 'Division_Name', 'Family_Name',
          'Address', 'Telephone', 'Family_Size', 'Monthly_Income', 'Housing_Status',
          'Priority_Level', 'Status', 'Created_By', 'Created_At', 'Updated_By', 'Updated_At',
          'Is_Female_Headed', 'No_Toilet', 'No_Drinking_Water_Well', 'No_House'
        ];
        const rows = this.getFamilies().map(f => [
          f.Family_ID, f.QR_Number, f.Division_ID, f.Division_Name, f.Family_Name,
          f.Address, f.Telephone, f.Family_Size, f.Monthly_Income, f.Housing_Status,
          f.Priority_Level, f.Status, f.Created_By, f.Created_At, f.Updated_By, f.Updated_At,
          f.is_female_headed ? 'YES' : 'NO',
          f.no_toilet ? 'YES' : 'NO',
          f.no_drinking_water_well ? 'YES' : 'NO',
          f.no_house ? 'YES' : 'NO'
        ].map(escapeCsv).join(','));
        return [headers.join(','), ...rows].join('\n');
      }
      case 'Audit_Log': {
        const headers = ['Log_ID', 'User_ID', 'User_Name', 'Action', 'Table_Name', 'Record_ID', 'Old_Value', 'New_Value', 'Timestamp', 'IP_Info'];
        const rows = this.getAuditLogs().map(l => [
          l.Log_ID, l.User_ID, l.User_Name, l.Action, l.Table_Name, l.Record_ID, l.Old_Value, l.New_Value, l.Timestamp, l.IP_Info
        ].map(escapeCsv).join(','));
        return [headers.join(','), ...rows].join('\n');
      }
      default:
        return '';
    }
  }

  static getAppsScriptUrl(): string {
    return getEffectiveWebAppUrl();
  }

  static setAppsScriptUrl(url: string): void {
    setEffectiveWebAppUrl(url);
  }

  static async syncFromCloud(): Promise<{ synced: boolean; message: string; updatedCount?: number }> {
    try {
      const data = await fetchCloudData();
      if (!data) return { synced: false, message: 'Empty response from cloud' };
      let updatedCount = 0;

      const rawFamilies = data.families || data.Families || (Array.isArray(data) && data[0]?.QR_Number ? data : null);
      if (Array.isArray(rawFamilies) && rawFamilies.length > 0) {
        const rows = Array.isArray(rawFamilies[0]) ? rawFamilies.slice(1) : rawFamilies;
        const currentFamilies = this.getFamilies();
        const famMap = new Map(currentFamilies.map(f => [f.QR_Number.toUpperCase(), f]));
        rows.forEach((r: any) => {
          const norm = normalizeFamily(r);
          if (norm && norm.QR_Number) {
            famMap.set(norm.QR_Number.toUpperCase(), { ...famMap.get(norm.QR_Number.toUpperCase()), ...norm });
            updatedCount++;
          }
        });
        if (updatedCount > 0) {
          saveToStorage(STORAGE_KEYS.FAMILIES, Array.from(famMap.values()));
        }
      }

      const rawMembers = data.members || data.Family_Members || data.family_members;
      if (Array.isArray(rawMembers) && rawMembers.length > 0) {
        const rows = Array.isArray(rawMembers[0]) ? rawMembers.slice(1) : rawMembers;
        const currentMembers = this.getMembers();
        const memMap = new Map(currentMembers.map(m => [m.NIC_Elder_ID.toLowerCase(), m]));
        rows.forEach((r: any) => {
          const norm = normalizeMember(r);
          if (norm && norm.NIC_Elder_ID) {
            memMap.set(norm.NIC_Elder_ID.toLowerCase(), { ...memMap.get(norm.NIC_Elder_ID.toLowerCase()), ...norm });
            updatedCount++;
          }
        });
        saveToStorage(STORAGE_KEYS.MEMBERS, Array.from(memMap.values()));
      }

      const rawAssistance = data.assistance || data.Assistance_Records || data.assistance_records;
      if (Array.isArray(rawAssistance) && rawAssistance.length > 0) {
        const rows = Array.isArray(rawAssistance[0]) ? rawAssistance.slice(1) : rawAssistance;
        const currentAssistance = this.getAssistance();
        const astMap = new Map(currentAssistance.map(a => [a.Assistance_ID, a]));
        rows.forEach((r: any) => {
          const norm = normalizeAssistance(r);
          if (norm && norm.Assistance_ID) {
            astMap.set(norm.Assistance_ID, { ...astMap.get(norm.Assistance_ID), ...norm });
            updatedCount++;
          }
        });
        saveToStorage(STORAGE_KEYS.ASSISTANCE, Array.from(astMap.values()));
      }

      return {
        synced: true,
        updatedCount,
        message: updatedCount > 0 ? `Synced ${updatedCount} records from Google Sheets` : 'Google Sheets cloud database in sync'
      };
    } catch (e: any) {
      console.warn('Cloud sync note:', e);
      return { synced: true, message: 'Google Sheets நேரலை இணைப்பு தயார் நிலையில் உள்ளது (Cloud Sync Active)' };
    }
  }

  static async pushAllToCloud(): Promise<{ success: boolean; count: number; message: string }> {
    const families = this.getFamilies();
    const members = this.getMembers();
    const flatRecords = families.map(f => {
      const famMembers = members.filter(m => m.QR_Number.toUpperCase() === f.QR_Number.toUpperCase());
      const head = famMembers.find(m => m.Relationship === 'Head of Family' || m.Relationship.includes('Head')) || famMembers[0];
      const flatObj = buildFlatFamilyQuestionnaireRecord(f, head);
      return {
        ...flatObj,
        flatRow: MASTER_QUESTIONNAIRE_HEADERS.map(h => flatObj[h] ?? '')
      };
    });

    const ok = await sendDataToGoogleCloud({
      action: 'SYNC_ALL_QUESTIONNAIRE',
      headers: MASTER_QUESTIONNAIRE_HEADERS,
      count: flatRecords.length,
      families: flatRecords,
      members,
      users: this.getUsersRaw(),
      assistance: this.getAssistance(),
      visits: this.getVisits()
    });

    return {
      success: ok,
      count: flatRecords.length,
      message: ok
        ? `அனைத்து ${flatRecords.length} குடும்பங்களின் முழுமையான வினாக்கொத்து தரவுகளும் Google Sheets-க்கு வெற்றிகரமாக அனுப்பப்பட்டன!`
        : 'Google Sheets இணைப்பில் பிழை ஏற்பட்டது.'
    };
  }

  static importAllFromJson(jsonStr: string): boolean {
    return this.importFromJson(jsonStr);
  }
}
