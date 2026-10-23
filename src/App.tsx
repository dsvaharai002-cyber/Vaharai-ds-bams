import React, { useState, useEffect } from 'react';
import { User, Beneficiary, QueueToken, GNDivision, SystemAuditLog, AssistanceRecord } from './types';
import { Language } from './translations/i18n';
import {
  loadUsers,
  saveUsers,
  loadBeneficiaries,
  saveBeneficiaries,
  loadTokens,
  saveTokens,
  loadDivisions,
  loadAuditLogs,
  logAuditAction,
  loadAssistanceRecords,
  saveAssistanceRecords,
  fetchCentralDatabase,
  pushToCentralDatabase,
  restoreDatabaseFromSnapshot,
  isServerApiAvailable,
  createDatabaseSnapshot,
} from './services/storage';
import {
  getActiveUserSession,
  setActiveUserSession,
  signInWithGoogleDrive,
  getGoogleDriveUser,
  isGoogleDriveAuthenticated,
} from './services/auth';
import {
  fetchFromDesignatedDriveFile,
  saveToDesignatedDriveFile,
  getDesignatedDriveFileId,
  onDriveSyncStatusChange,
  DriveSyncStatus,
  getDriveSyncStatus,
} from './services/googleDrive';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { BeneficiariesView } from './components/BeneficiariesView';
import { ReceptionTokenView } from './components/ReceptionTokenView';
import { LiveCounterDisplayView } from './components/LiveCounterDisplayView';
import { StaffManagementView } from './components/StaffManagementView';
import { CsvManagementView } from './components/CsvManagementView';
import { DriveBackupView } from './components/DriveBackupView';
import { AiReportView } from './components/AiReportView';
import { ServiceAuditView } from './components/ServiceAuditView';
import { AssistanceDistributionView } from './components/AssistanceDistributionView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<User | null>(() => getActiveUserSession());
  const [lang, setLang] = useState<Language>('ta');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Persistent Databases
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() => loadBeneficiaries());
  const [tokens, setTokens] = useState<QueueToken[]>(() => loadTokens());
  const [divisions, setDivisions] = useState<GNDivision[]>(() => loadDivisions());
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => loadAuditLogs());
  const [assistanceRecords, setAssistanceRecords] = useState<AssistanceRecord[]>(() => loadAssistanceRecords());

  // Cloud & Drive Sync Status State
  const [driveSyncStatus, setDriveSyncStatus] = useState<DriveSyncStatus>(() => getDriveSyncStatus());
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => isGoogleDriveAuthenticated());
  const [driveUser, setDriveUser] = useState(() => getGoogleDriveUser());
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string>('');

  // Quick Barcode Scanner Modal
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // Restore active user session if exists
  useEffect(() => {
    const session = getActiveUserSession();
    if (session) {
      const found = users.find((u) => u.id === session.id);
      if (found) {
        setCurrentUser(found);
        if (found.role === 'Reception Registrar') {
          setCurrentTab('reception');
        } else if (found.role === 'NORMAL') {
          setCurrentTab('live-display');
        }
      }
    }
  }, []);

  // Listen for Google Drive sync status updates
  useEffect(() => {
    const unsubscribe = onDriveSyncStatusChange((st) => {
      setDriveSyncStatus(st);
      setIsDriveConnected(isGoogleDriveAuthenticated());
      setDriveUser(getGoogleDriveUser());
    });
    return unsubscribe;
  }, []);

  // Real-Time Cross-Tab / Cross-Window Synchronization on the same machine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('vaharai_ds_sync_channel');
      channel.onmessage = () => {
        handleDatabaseReload();
      };
    }

    const handleLocalUpdate = () => {
      handleDatabaseReload();
    };
    window.addEventListener('vaharai_db_updated', handleLocalUpdate);

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('vaharai_ds_')) {
        handleDatabaseReload();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('vaharai_db_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Central Google Drive Master File & Server Synchronization across multiple office computers
  useEffect(() => {
    let isMounted = true;

    // Boot: Attempt to load from the designated Google Drive file first
    const pullFromDesignatedDrive = async () => {
      if (isGoogleDriveAuthenticated()) {
        try {
          const driveData = await fetchFromDesignatedDriveFile();
          if (driveData && isMounted && Array.isArray(driveData.beneficiaries)) {
            restoreDatabaseFromSnapshot(driveData);
            handleDatabaseReload();
            console.log('[Google Drive] Boot: Master database loaded from designated file.');
          }
        } catch (e) {
          console.warn('[Google Drive] Boot fetch warning:', e);
        }
      }
    };

    const syncInit = async () => {
      await pullFromDesignatedDrive();

      // Check server API only if available
      try {
        if (isServerApiAvailable()) {
          const central = await fetchCentralDatabase();
          if (central && isMounted) {
            restoreDatabaseFromSnapshot(central);
            handleDatabaseReload();
          } else if (isServerApiAvailable()) {
            await pushToCentralDatabase();
          }
        }
      } catch (err) {
        console.warn('Initial central sync failed:', err);
      }
    };

    syncInit();

    // Polling interval:
    // 1. If Google Drive is authenticated, check designated file every 25 seconds for remote changes
    // 2. If Server API is available, poll server
    const syncInterval = setInterval(async () => {
      if (!isMounted) return;

      if (isGoogleDriveAuthenticated()) {
        try {
          const driveData = await fetchFromDesignatedDriveFile();
          if (driveData && isMounted && Array.isArray(driveData.beneficiaries)) {
            const currentCount = loadBeneficiaries().length;
            if (driveData.beneficiaries.length !== currentCount) {
              restoreDatabaseFromSnapshot(driveData);
              handleDatabaseReload();
            }
          }
        } catch {
          // silent offline fallback
        }
      }

      if (isServerApiAvailable()) {
        try {
          const central = await fetchCentralDatabase();
          if (central && isMounted) {
            if (Array.isArray(central.tokens)) setTokens(central.tokens);
            if (Array.isArray(central.beneficiaries)) setBeneficiaries(central.beneficiaries);
            if (Array.isArray(central.assistance)) setAssistanceRecords(central.assistance);
            if (Array.isArray(central.auditLogs)) setAuditLogs(central.auditLogs);
          }
        } catch {
          // offline fallback
        }
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveUserSession(user);
    if (user.role === 'Reception Registrar') {
      setCurrentTab('reception');
    } else if (user.role === 'NORMAL') {
      setCurrentTab('live-display');
    } else {
      setCurrentTab('dashboard');
    }
    logAuditAction(user.id, user.name, 'USER_LOGIN', `Logged in with role: ${user.role}`);
    setAuditLogs(loadAuditLogs());
  };

  const handleLogout = () => {
    if (currentUser) {
      logAuditAction(currentUser.id, currentUser.name, 'USER_LOGOUT', 'Logged out');
    }
    setCurrentUser(null);
    setActiveUserSession(null);
    setAuditLogs(loadAuditLogs());
  };

  const handleAuditLog = (action: string, details: string) => {
    if (currentUser) {
      logAuditAction(currentUser.id, currentUser.name, action, details);
      setAuditLogs(loadAuditLogs());
    }
  };

  const handleUpdateUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    saveUsers(newUsers);
    if (currentUser) {
      const updatedSelf = newUsers.find((u) => u.id === currentUser.id);
      if (updatedSelf) {
        setCurrentUser(updatedSelf);
        setActiveUserSession(updatedSelf);
      }
    }
  };

  const handleUpdateBeneficiaries = (newItems: Beneficiary[]) => {
    setBeneficiaries(newItems);
    saveBeneficiaries(newItems);
  };

  const handleUpdateTokens = (newTokens: QueueToken[]) => {
    setTokens(newTokens);
    saveTokens(newTokens);
  };

  const handleUpdateAssistanceRecords = (newRecords: AssistanceRecord[]) => {
    setAssistanceRecords(newRecords);
    saveAssistanceRecords(newRecords);
  };

  const handleDatabaseReload = () => {
    setUsers(loadUsers());
    setBeneficiaries(loadBeneficiaries());
    setTokens(loadTokens());
    setDivisions(loadDivisions());
    setAuditLogs(loadAuditLogs());
    setAssistanceRecords(loadAssistanceRecords());
  };

  const handleQuickSyncNow = async () => {
    setIsManualSyncing(true);
    setSyncToastMessage('');
    try {
      if (isGoogleDriveAuthenticated()) {
        const driveData = await fetchFromDesignatedDriveFile();
        if (driveData && driveData.beneficiaries) {
          restoreDatabaseFromSnapshot(driveData);
          handleDatabaseReload();
          setSyncToastMessage(lang === 'ta' ? 'டிரைவ் கோப்பிலிருந்து தரவுகள் பெறப்பட்டன!' : 'Pulled latest from Drive file!');
        } else {
          const snapshot = createDatabaseSnapshot();
          await saveToDesignatedDriveFile(snapshot);
          setSyncToastMessage(lang === 'ta' ? 'டிரைவ் கோப்பில் சேமிக்கப்பட்டது!' : 'Saved to Drive file!');
        }
      } else if (isServerApiAvailable()) {
        const central = await fetchCentralDatabase();
        if (central) {
          restoreDatabaseFromSnapshot(central);
          handleDatabaseReload();
          setSyncToastMessage(lang === 'ta' ? 'சர்வர் தரவுகள் புதுப்பிக்கப்பட்டன!' : 'Server data refreshed!');
        }
      } else {
        setSyncToastMessage(lang === 'ta' ? 'டிரைவை இணைக்க வலதுபுறம் உள்ள பொத்தானை அழுத்தவும்' : 'Connect Google Drive to sync across browsers');
      }
    } catch (err: any) {
      setSyncToastMessage(err.message || 'Sync failed');
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncToastMessage(''), 4000);
    }
  };

  const handleConnectDriveDirect = async () => {
    try {
      setIsManualSyncing(true);
      await signInWithGoogleDrive();
      setIsDriveConnected(true);
      setDriveUser(getGoogleDriveUser());
      const driveData = await fetchFromDesignatedDriveFile();
      if (driveData && driveData.beneficiaries) {
        restoreDatabaseFromSnapshot(driveData);
        handleDatabaseReload();
      } else {
        await saveToDesignatedDriveFile(createDatabaseSnapshot());
      }
      setSyncToastMessage(lang === 'ta' ? 'கூகிள் டிரைவ் வெற்றிகரமாக இணைக்கப்பட்டது!' : 'Google Drive connected successfully!');
    } catch (e: any) {
      console.warn('Drive direct connect:', e);
      setSyncToastMessage(e.message || 'Drive connect failed');
      // If admin, open Drive settings tab to show alternatives
      if (currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN 1' || currentUser?.role === 'ADMIN 2') {
        setCurrentTab('drive');
      }
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncToastMessage(''), 5000);
    }
  };

  const handleDownloadQuickBackup = () => {
    const snapshot = createDatabaseSnapshot();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vaharai_ds_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setSyncToastMessage(lang === 'ta' ? 'JSON காப்புப்பிரதி பதிவிறக்கப்பட்டது!' : 'JSON backup downloaded!');
    setTimeout(() => setSyncToastMessage(''), 4000);
  };

  const handleUploadQuickBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const snapshot = JSON.parse(text);
        restoreDatabaseFromSnapshot(snapshot);
        handleDatabaseReload();
        setSyncToastMessage(lang === 'ta' ? 'தரவுகள் வெற்றிகரமாக மீட்டமைக்கப்பட்டன!' : 'Database successfully restored!');
      } catch (err: any) {
        setSyncToastMessage(lang === 'ta' ? 'செல்லுபடியற்ற JSON கோப்பு!' : 'Invalid JSON file!');
      } finally {
        setTimeout(() => setSyncToastMessage(''), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // If user signed out, show official login screen
  if (!currentUser) {
    return (
      <LoginView
        users={users}
        lang={lang}
        setLang={setLang}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Safety checks for Role-based Tab Access
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isAdmin = currentUser.role === 'ADMIN 1' || currentUser.role === 'ADMIN 2' || isSuperAdmin;
  const isReception = currentUser.role === 'Reception Registrar';
  const isNormal = currentUser.role === 'NORMAL'; // Dedicated Live Counter TV user

  const safeTab = 
    isNormal
      ? 'live-display'
      : currentTab === 'staff' && !isSuperAdmin
      ? 'dashboard'
      : currentTab === 'beneficiaries' && isReception
      ? 'reception'
      : currentTab === 'assistance' && (isReception || isNormal)
      ? 'dashboard'
      : currentTab === 'drive' && !isAdmin
      ? 'dashboard'
      : currentTab === 'ai-report' && !isAdmin
      ? 'dashboard'
      : currentTab === 'service-audit' && !isAdmin
      ? 'dashboard'
      : currentTab;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* 3-Zone Header */}
      <Header
        currentUser={currentUser}
        currentTab={safeTab}
        setCurrentTab={setCurrentTab}
        lang={lang}
        setLang={setLang}
        onLogout={handleLogout}
        onOpenScanner={() => setShowScanner(true)}
      />

      {/* Cloud & Drive Real-Time Sync Bar */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 no-print shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDriveConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDriveConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>

            <span className="font-bold text-slate-800">
              {lang === 'ta' ? 'டிரைவ் நேரடி ஒத்திசைவு:' : 'Drive Live Sync:'}
            </span>

            {isDriveConnected ? (
              <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                  {lang === 'ta' ? 'இணைக்கப்பட்டுள்ளது' : 'Connected'} ({driveUser?.email || 'Google Drive'})
                </span>
                <span className="text-slate-400 hidden md:inline">|</span>
                <span className="text-[11px] text-slate-600 font-mono hidden md:inline">
                  {lang === 'ta' ? 'கோப்பு:' : 'File:'} {getDesignatedDriveFileId().slice(0, 8)}...
                </span>
                {driveSyncStatus.lastSyncedAt && (
                  <span className="text-[10px] text-slate-500">
                    ({lang === 'ta' ? 'கடைசி:' : 'Last:'} {new Date(driveSyncStatus.lastSyncedAt).toLocaleTimeString()})
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-800">
                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-semibold">
                  {lang === 'ta' ? 'டிரைவ் இணைக்கப்படவில்லை (லோக்கல் ஸ்டோரேஜ் மட்டும்)' : 'Local Storage Only (Drive Disconnected)'}
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  {lang === 'ta'
                    ? 'பல வுரவுசர்களில் தகவலைப் பார்க்க கூகிள் டிரைவை இணைக்கவும்'
                    : 'Connect Drive for cross-browser sync'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {syncToastMessage && (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-[11px] font-semibold animate-fade-in">
                {syncToastMessage}
              </span>
            )}

            <button
              type="button"
              onClick={handleQuickSyncNow}
              disabled={isManualSyncing}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 border border-slate-300"
              title="Pull latest data or push local changes"
            >
              <span className={isManualSyncing ? 'animate-spin' : ''}>🔄</span>
              <span>{isManualSyncing ? (lang === 'ta' ? 'ஒத்திசைக்கிறது...' : 'Syncing...') : (lang === 'ta' ? 'இப்போதே ஒத்திசை' : 'Sync Now')}</span>
            </button>

            {/* Quick Local JSON Backup & Restore Buttons (Resilient Offline/Cross-Browser) */}
            <button
              type="button"
              onClick={handleDownloadQuickBackup}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 border border-slate-300"
              title={lang === 'ta' ? 'முழுமையான தரவுத்தளத்தை JSON கோப்பாக சேமிக்கவும்' : 'Save full database backup to JSON file'}
            >
              <span>💾</span>
              <span>{lang === 'ta' ? 'JSON காப்பு' : 'Download Backup'}</span>
            </button>

            <label
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 border border-slate-300 cursor-pointer"
              title={lang === 'ta' ? 'JSON காப்புப்பிரதி கோப்பிலிருந்து தரவுகளை ஏற்றவும்' : 'Restore database from JSON file'}
            >
              <span>⬆️</span>
              <span>{lang === 'ta' ? 'கோப்பை ஏற்று' : 'Restore'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleUploadQuickBackup}
                className="hidden"
              />
            </label>

            {!isDriveConnected ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleConnectDriveDirect}
                  disabled={isManualSyncing}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span>☁️</span>
                  <span>{lang === 'ta' ? 'கூகிள் டிரைவை இணைக்க' : 'Connect Google Drive'}</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setCurrentTab('drive')}
                    className="px-2 py-1 text-slate-600 hover:text-slate-900 text-[11px] font-medium underline"
                  >
                    {lang === 'ta' ? 'அமைப்புகள்' : 'Settings'}
                  </button>
                )}
              </div>
            ) : (
              isAdmin && (
                <button
                  type="button"
                  onClick={() => setCurrentTab('drive')}
                  className="px-2 py-1 text-slate-600 hover:text-slate-900 text-[11px] font-medium underline"
                >
                  {lang === 'ta' ? 'டிரைவ் கோப்பு அமைப்புகள்' : 'Drive File Settings'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main View Area with strict overflow safety */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 no-print overflow-x-hidden">
        {safeTab === 'dashboard' && (
          <DashboardView
            beneficiaries={beneficiaries}
            tokens={tokens}
            divisions={divisions}
            users={users}
            auditLogs={auditLogs}
            currentUser={currentUser}
            lang={lang}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {safeTab === 'beneficiaries' && (
          <BeneficiariesView
            beneficiaries={beneficiaries}
            divisions={divisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'reception' && (
          <ReceptionTokenView
            tokens={tokens}
            beneficiaries={beneficiaries}
            divisions={divisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateTokens={handleUpdateTokens}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onAuditLog={handleAuditLog}
            onNavigateToLiveDisplay={() => setCurrentTab('live-display')}
          />
        )}

        {safeTab === 'live-display' && (
          <LiveCounterDisplayView
            tokens={tokens}
            beneficiaries={beneficiaries}
            divisions={divisions}
            lang={lang}
            onUpdateTokens={handleUpdateTokens}
            onAuditLog={handleAuditLog}
            isNormalUser={isNormal}
          />
        )}

        {safeTab === 'ai-report' && (
          <AiReportView
            beneficiaries={beneficiaries}
            tokens={tokens}
            divisions={divisions}
            currentUser={currentUser}
            lang={lang}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'assistance' && (
          <AssistanceDistributionView
            assistanceRecords={assistanceRecords}
            beneficiaries={beneficiaries}
            divisions={divisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateAssistanceRecords={handleUpdateAssistanceRecords}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'csv' && (
          <CsvManagementView
            beneficiaries={beneficiaries}
            users={users}
            divisions={divisions}
            assistanceRecords={assistanceRecords}
            currentUser={currentUser}
            lang={lang}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onUpdateUsers={handleUpdateUsers}
            onUpdateAssistanceRecords={handleUpdateAssistanceRecords}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'drive' && (
          <DriveBackupView
            currentUser={currentUser}
            lang={lang}
            onDatabaseReload={handleDatabaseReload}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'service-audit' && (
          <ServiceAuditView
            tokens={tokens}
            beneficiaries={beneficiaries}
            divisions={divisions}
            users={users}
            currentUser={currentUser}
            lang={lang}
            onUpdateTokens={handleUpdateTokens}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'staff' && (
          <StaffManagementView
            users={users}
            divisions={divisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateUsers={handleUpdateUsers}
            onAuditLog={handleAuditLog}
          />
        )}
      </main>

      {/* Barcode / NIC Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal
          beneficiaries={beneficiaries}
          lang={lang}
          onSelectBeneficiary={() => {
            if (!isReception && !isNormal) {
              setCurrentTab('beneficiaries');
            } else if (isReception) {
              setCurrentTab('reception');
            } else {
              setCurrentTab('live-display');
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Official Civic Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 text-center text-xs text-slate-500 no-print w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 {lang === 'ta' ? 'கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகம் · மட்டக்களப்பு மாவட்டம்' : 'Divisional Secretariat Koralaipattu North (Vaharai) · Batticaloa District'}
          </span>
          <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-mono text-slate-400 flex-wrap justify-center">
            <span>Live Display: Normal User Support</span>
            <span>·</span>
            <span>Roles: SuperAdmin, Admin 1, Admin 2</span>
            <span>·</span>
            <span>Cloud: Google Drive</span>
            <span>·</span>
            <span>Print: Thermal 58/80mm & PDF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
