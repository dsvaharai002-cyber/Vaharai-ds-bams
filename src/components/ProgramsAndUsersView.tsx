import React, { useState } from 'react';
import { User, AssistanceProgram } from '../types';
import { StorageService } from '../services/storageService';
import { TRANSLATIONS, Language } from '../utils/translations';
import {
  Shield,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  Power,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';

interface ProgramsAndUsersViewProps {
  currentUser: User;
  currentLang?: Language;
}

export const ProgramsAndUsersView: React.FC<ProgramsAndUsersViewProps> = ({
  currentUser,
  currentLang = 'en'
}) => {
  const t = TRANSLATIONS[currentLang];
  const isTa = currentLang === 'ta';
  const isSuperAdmin = currentUser.Role === 'Super_Admin' || currentUser.Role === 'Super Admin';

  const [activeTab, setActiveTab] = useState<'programs' | 'users'>(isSuperAdmin ? 'users' : 'programs');
  const [programs, setPrograms] = useState<AssistanceProgram[]>(() => StorageService.getPrograms());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsersRaw());
  const divisions = StorageService.getDivisions();

  const [showAddProgram, setShowAddProgram] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [programForm, setProgramForm] = useState({
    Program_Name: '',
    Program_Type: 'Livelihood',
    Description: ''
  });

  const [userForm, setUserForm] = useState({
    User_ID: '',
    Password: '',
    Name: '',
    Role: 'GN Officer' as User['Role'],
    Division: divisions[0]?.Division_Name || 'Panichchankerni'
  });

  const [editUserForm, setEditUserForm] = useState({
    originalUserId: '',
    User_ID: '',
    Password: '',
    Name: '',
    Role: 'GN Officer' as User['Role'],
    Division: 'ALL',
    Status: 'Active' as 'Active' | 'Inactive'
  });

  const refreshAll = () => {
    setPrograms([...StorageService.getPrograms()]);
    setUsers([...StorageService.getUsersRaw()]);
  };

  const isMasterDivisionRole = (role: User['Role']) => {
    return (
      role === 'Super Admin' ||
      role === 'Super_Admin' ||
      role === 'Data Entry Officer' ||
      role === 'Data_Entry_Officer' ||
      role === 'Assistance Officer' ||
      role === 'Assistance_Officer' ||
      role === 'Auditor' ||
      role === 'Receptionist'
    );
  };

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      StorageService.addProgram(currentUser, {
        Program_Name: programForm.Program_Name,
        Program_Type: programForm.Program_Type,
        Description: programForm.Description,
        Status: 'Active'
      });
      refreshAll();
      setShowAddProgram(false);
      setProgramForm({ Program_Name: '', Program_Type: 'Livelihood', Description: '' });
      setFeedback({
        type: 'success',
        message: isTa ? 'உதவித் திட்டம் வெற்றிகரமாக உருவாக்கப்பட்டது.' : 'Assistance program created successfully.'
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      StorageService.createUser(currentUser, {
        User_ID: userForm.User_ID,
        Password: userForm.Password,
        Name: userForm.Name,
        Role: userForm.Role,
        Division: isMasterDivisionRole(userForm.Role) ? 'ALL' : userForm.Division
      });
      refreshAll();
      setShowAddUser(false);
      setUserForm({
        User_ID: '',
        Password: '',
        Name: '',
        Role: 'GN Officer',
        Division: divisions[0]?.Division_Name || 'Panichchankerni'
      });
      setFeedback({
        type: 'success',
        message: isTa ? 'புதிய உத்தியோகத்தர் கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது.' : 'New officer account created successfully.'
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setEditUserForm({
      originalUserId: u.User_ID,
      User_ID: u.User_ID,
      Password: u.Password || '',
      Name: u.Name,
      Role: u.Role,
      Division: u.Division,
      Status: u.Status
    });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      StorageService.updateUser(currentUser, editUserForm.originalUserId, {
        User_ID: editUserForm.User_ID,
        Password: editUserForm.Password,
        Name: editUserForm.Name,
        Role: editUserForm.Role,
        Division: isMasterDivisionRole(editUserForm.Role) ? 'ALL' : editUserForm.Division,
        Status: editUserForm.Status
      });
      refreshAll();
      setEditingUser(null);
      setFeedback({
        type: 'success',
        message: isTa
          ? `பயனர் கணக்கு (${editUserForm.User_ID}) வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது.`
          : `User account (${editUserForm.User_ID}) updated successfully.`
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const handleToggleUserStatus = (u: User) => {
    if (u.User_ID.toLowerCase() === currentUser.User_ID.toLowerCase()) {
      setFeedback({
        type: 'error',
        message: isTa ? 'உங்கள் சொந்த முதன்மை நிர்வாகி கணக்கை செயலிழக்கச் செய்ய முடியாது.' : 'Cannot deactivate your own Super Admin account.'
      });
      return;
    }
    try {
      const nextStatus = u.Status === 'Active' ? 'Inactive' : 'Active';
      StorageService.updateUser(currentUser, u.User_ID, { Status: nextStatus });
      refreshAll();
      setFeedback({
        type: 'success',
        message: isTa
          ? `${u.Name} கணக்கு நிலை '${nextStatus}' ஆக மாற்றப்பட்டது.`
          : `${u.Name} status changed to ${nextStatus}.`
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const handleDeleteUser = (u: User) => {
    if (u.User_ID.toLowerCase() === currentUser.User_ID.toLowerCase()) {
      setFeedback({
        type: 'error',
        message: isTa ? 'உங்கள் சொந்த முதன்மை நிர்வாகி கணக்கை நீக்க முடியாது.' : 'Cannot delete your own Super Admin account.'
      });
      return;
    }
    try {
      StorageService.deleteUser(currentUser, u.User_ID);
      refreshAll();
      setFeedback({
        type: 'success',
        message: isTa ? `${u.Name} (${u.User_ID}) பயனர் கணக்கு நீக்கப்பட்டது.` : `Deleted user account ${u.User_ID}.`
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const getRoleLabel = (role: User['Role']) => {
    if (isTa) {
      if (role === 'Super_Admin' || role === 'Super Admin') return 'முதன்மை நிர்வாகி (Super Admin)';
      if (role === 'Data_Entry_Officer' || role === 'Data Entry Officer') return 'தகவல் பதிவு உத்தியோகத்தர் (Data Entry Officer)';
      if (role === 'GN_Officer' || role === 'GN Officer') return 'கிராம அலுவலர் (GN Officer)';
      if (role === 'Assistance_Officer' || role === 'Assistance Officer') return 'உதவி வழங்கல் உத்தியோகத்தர்';
      if (role === 'Auditor') return 'கணக்காய்வாளர் (Auditor)';
      if (role === 'Receptionist') return 'வரவேற்பு உத்தியோகத்தர் (Receptionist)';
    }
    return role.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            {isTa ? 'பயனர் முகாமைத்துவம் & உதவித் திட்டங்கள் (Super Admin பூரண அதிகாரம்)' : t.programsAndUsersTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isTa
              ? 'உத்தியோகத்தர்களைப் பதிவு செய்தல், கடவுச்சொல் / பதவி / பிரிவு திருத்துதல், செயற்படுத்தல் மற்றும் நீக்குதல் பூரண அதிகாரம்.'
              : 'Full Super Admin authority to register, edit, assign divisions, activate/deactivate, and delete user accounts.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isTa ? 'உத்தியோகத்தர் கணக்குகள் முகாமை' : 'User Management'} ({users.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('programs')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'programs'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isTa ? 'உதவித் திட்டங்கள்' : 'Assistance Programs'} ({programs.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex gap-2 items-center ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Users Management Tab (Full Super Admin Authority) */}
      {activeTab === 'users' && isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isTa ? 'அங்கீகரிக்கப்பட்ட உத்தியோகத்தர் கணக்குகள் & அதிகார முகாமைத்துவம்' : 'Authorized Officer Accounts & Full Access Control'}
                </h3>
                <p className="text-xs text-slate-600">
                  {isTa
                    ? 'புதிய உத்தியோகத்தர்களை இணைக்கவும், பதவி (Super Admin, தகவல் பதிவு உத்தியோகத்தர், கிராம அலுவலர், வரவேற்பாளர்) மற்றும் கடவுச்சொல்லை மாற்றவும்.'
                    : 'Register new officers, assign roles (Super Admin, Data Entry Officer, GN Officer, Receptionist), reset passwords, or remove users.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isTa ? 'புதிய பயனர் கணக்கு உருவாக்கு' : 'Register New User'}</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 font-mono">{t.userId}</th>
                    <th className="px-3.5 py-3">{isTa ? 'உத்தியோகத்தர் பெயர்' : 'Full Name'}</th>
                    <th className="px-3.5 py-3">{isTa ? 'கடவுச்சொல் (Password)' : 'Password'}</th>
                    <th className="px-3.5 py-3">{isTa ? 'பதவி (Role)' : 'Role'}</th>
                    <th className="px-3.5 py-3">{t.gnDivision}</th>
                    <th className="px-3.5 py-3 text-center">{isTa ? 'நிலை' : 'Status'}</th>
                    <th className="px-3.5 py-3 text-right">{isTa ? 'முகாமைத்துவம் (Actions)' : 'Manage'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => {
                    const isVisible = Boolean(showPasswords[u.User_ID]);
                    return (
                      <tr key={u.User_ID} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-3 font-mono font-bold text-emerald-700">{u.User_ID}</td>
                        <td className="px-3.5 py-3 font-semibold text-slate-900">{u.Name}</td>
                        <td className="px-3.5 py-3 font-mono text-slate-600">
                          <div className="inline-flex items-center gap-1.5">
                            <span>{isVisible ? (u.Password || 'Admin@123') : '••••••••'}</span>
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, [u.User_ID]: !isVisible }))}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                              title={isTa ? 'கடவுச்சொல்லைக் காண்பி' : 'Show/Hide Password'}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {getRoleLabel(u.Role)}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-slate-700 font-medium">
                          {u.Division === 'ALL'
                            ? (isTa ? 'அனைத்து 16 பிரிவுகளும் (ALL)' : 'All 16 Divisions (Master)')
                            : u.Division}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.Status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {u.Status === 'Active' ? (isTa ? 'செயலில் (Active)' : 'Active') : (isTa ? 'முடக்கப்பட்டுள்ளது' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditUserModal(u)}
                              className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md inline-flex items-center gap-1 cursor-pointer"
                              title={isTa ? 'பயனர் விபரங்களைத் திருத்துக' : 'Edit User'}
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{isTa ? 'திருத்து' : 'Edit'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className={`p-1.5 rounded-md border cursor-pointer ${
                                u.Status === 'Active'
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              }`}
                              title={u.Status === 'Active' ? (isTa ? 'கணக்கை தற்காலிகமாக முடக்கு' : 'Deactivate') : (isTa ? 'கணக்கை மீளச் செயற்படுத்து' : 'Activate')}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            {u.User_ID.toLowerCase() !== currentUser.User_ID.toLowerCase() && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md cursor-pointer"
                                title={isTa ? 'பயனர் கணக்கை நீக்கு' : 'Delete User'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Programs Tab */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              {isTa ? 'செயலில் உள்ள திட்டங்கள்' : 'Available Assistance Programs'}
            </h3>
            <button
              onClick={() => setShowAddProgram(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTa ? 'புதிய திட்டம்' : 'Add Program'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map(prog => (
              <div
                key={prog.Program_ID}
                className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-2.5 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {prog.Program_ID}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {prog.Status}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{prog.Program_Name}</h4>
                  <span className="text-[10px] text-slate-500 font-medium">{prog.Program_Type}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {prog.Description}
                </p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{isTa ? 'ஆரம்பம்:' : 'Started:'} {prog.Start_Date || '-'}</span>
                  <span>{prog.Created_By || 'admin01'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Program Modal */}
      {showAddProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {isTa ? 'புதிய உதவித் திட்டம் உருவாக்குதல்' : 'Create Assistance Program'}
              </h3>
              <button onClick={() => setShowAddProgram(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProgram} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'திட்டத்தின் பெயர்' : 'Program Name'} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isTa ? 'உதா: வெள்ள நிவாரண உலருணவுத் திட்டம்' : 'e.g. Drought Relief Food Packs'}
                  value={programForm.Program_Name}
                  onChange={e => setProgramForm({ ...programForm, Program_Name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'திட்ட வகை' : 'Program Type'}
                </label>
                <select
                  value={programForm.Program_Type}
                  onChange={e => setProgramForm({ ...programForm, Program_Type: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none cursor-pointer"
                >
                  <option value="Livelihood">{isTa ? 'வாழ்வாதாரம் (Livelihood)' : 'Livelihood'}</option>
                  <option value="Housing">{isTa ? 'வீடமைப்பு (Housing)' : 'Housing'}</option>
                  <option value="Education">{isTa ? 'கல்வி (Education)' : 'Education'}</option>
                  <option value="Emergency Relief">{isTa ? 'அவசர நிவாரணம்' : 'Emergency Relief'}</option>
                  <option value="Health">{isTa ? 'சுகாதாரம் (Health)' : 'Health'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'விளக்கம்' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={programForm.Description}
                  onChange={e => setProgramForm({ ...programForm, Description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddProgram(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  {isTa ? 'திட்டத்தை சேமிக்க' : 'Save Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {isTa ? 'புதிய உத்தியோகத்தர் கணக்கு உருவாக்கு' : 'Create Officer Account'}
              </h3>
              <button onClick={() => setShowAddUser(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.userId} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. gn017 / data02"
                    value={userForm.User_ID}
                    onChange={e => setUserForm({ ...userForm, User_ID: e.target.value.toLowerCase().trim() })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.password} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Officer@123"
                    value={userForm.Password}
                    onChange={e => setUserForm({ ...userForm, Password: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'உத்தியோகத்தர் முழுப் பெயர்' : 'Officer Full Name'} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. K. Vigneswaran"
                  value={userForm.Name}
                  onChange={e => setUserForm({ ...userForm, Name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTa ? 'பதவி (Role)' : 'Role'}
                  </label>
                  <select
                    value={userForm.Role}
                    onChange={e => setUserForm({ ...userForm, Role: e.target.value as User['Role'] })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="GN Officer">{isTa ? 'கிராம அலுவலர் (GN Officer)' : 'GN Officer'}</option>
                    <option value="Data Entry Officer">{isTa ? 'தகவல் பதிவு உத்தியோகத்தர் (Data Entry)' : 'Data Entry Officer'}</option>
                    <option value="Assistance Officer">{isTa ? 'உதவி வழங்கல் உத்தியோகத்தர்' : 'Assistance Officer'}</option>
                    <option value="Receptionist">{isTa ? 'வரவேற்பு உத்தியோகத்தர் (Receptionist)' : 'Receptionist'}</option>
                    <option value="Auditor">{isTa ? 'கணக்காய்வாளர் (Auditor)' : 'Auditor'}</option>
                    <option value="Super Admin">{isTa ? 'முதன்மை நிர்வாகி (Super Admin)' : 'Super Admin'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.gnDivision}
                  </label>
                  <select
                    disabled={isMasterDivisionRole(userForm.Role)}
                    value={isMasterDivisionRole(userForm.Role) ? 'ALL' : userForm.Division}
                    onChange={e => setUserForm({ ...userForm, Division: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                  >
                    {isMasterDivisionRole(userForm.Role) && (
                      <option value="ALL">{isTa ? 'அனைத்து 16 பிரிவுகளும் (ALL)' : 'All 16 Divisions (ALL)'}</option>
                    )}
                    {divisions.map(d => (
                      <option key={d.GN_Code} value={d.Division_Name}>
                        {d.Division_Name} ({d.GN_Code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  {isTa ? 'கணக்கை உருவாக்கு' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal (Super Admin Full Authority) */}
      {editingUser && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-indigo-50/60">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-700" />
                <span>{isTa ? 'உத்தியோகத்தர் கணக்கு முகாமை & திருத்தம்' : 'Edit & Manage Officer Account'}</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.userId} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editUserForm.User_ID}
                    onChange={e => setEditUserForm({ ...editUserForm, User_ID: e.target.value.toLowerCase().trim() })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTa ? 'புதிய கடவுச்சொல் (Password)' : 'Password'} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editUserForm.Password}
                    onChange={e => setEditUserForm({ ...editUserForm, Password: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'உத்தியோகத்தர் முழுப் பெயர்' : 'Officer Full Name'} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editUserForm.Name}
                  onChange={e => setEditUserForm({ ...editUserForm, Name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTa ? 'பதவி (Role)' : 'Role'}
                  </label>
                  <select
                    value={editUserForm.Role}
                    onChange={e => setEditUserForm({ ...editUserForm, Role: e.target.value as User['Role'] })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="GN Officer">{isTa ? 'கிராம அலுவலர் (GN Officer)' : 'GN Officer'}</option>
                    <option value="Data Entry Officer">{isTa ? 'தகவல் பதிவு உத்தியோகத்தர் (Data Entry)' : 'Data Entry Officer'}</option>
                    <option value="Assistance Officer">{isTa ? 'உதவி வழங்கல் உத்தியோகத்தர்' : 'Assistance Officer'}</option>
                    <option value="Receptionist">{isTa ? 'வரவேற்பு உத்தியோகத்தர் (Receptionist)' : 'Receptionist'}</option>
                    <option value="Auditor">{isTa ? 'கணக்காய்வாளர் (Auditor)' : 'Auditor'}</option>
                    <option value="Super Admin">{isTa ? 'முதன்மை நிர்வாகி (Super Admin)' : 'Super Admin'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.gnDivision}
                  </label>
                  <select
                    disabled={isMasterDivisionRole(editUserForm.Role)}
                    value={isMasterDivisionRole(editUserForm.Role) ? 'ALL' : editUserForm.Division}
                    onChange={e => setEditUserForm({ ...editUserForm, Division: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                  >
                    {isMasterDivisionRole(editUserForm.Role) && (
                      <option value="ALL">{isTa ? 'அனைத்து 16 பிரிவுகளும் (ALL)' : 'All 16 Divisions (ALL)'}</option>
                    )}
                    {divisions.map(d => (
                      <option key={d.GN_Code} value={d.Division_Name}>
                        {d.Division_Name} ({d.GN_Code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTa ? 'கணக்கு நிலை (Account Status)' : 'Account Status'}
                </label>
                <select
                  value={editUserForm.Status}
                  onChange={e => setEditUserForm({ ...editUserForm, Status: e.target.value as 'Active' | 'Inactive' })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none cursor-pointer"
                >
                  <option value="Active">{isTa ? 'செயலில் உள்ளது (Active)' : 'Active'}</option>
                  <option value="Inactive">{isTa ? 'முடக்கப்பட்டுள்ளது (Inactive)' : 'Inactive'}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  {isTa ? 'மாற்றங்களைச் சேமிக்க' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
