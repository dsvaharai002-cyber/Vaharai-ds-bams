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
} from './services/storage';
import { getActiveUserSession, setActiveUserSession } from './services/auth';
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

  // Quick Barcode Scanner Modal
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // Auto-login to Super Admin (User 789) if no active session for instant testing
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
    } else {
      const defaultSuperAdmin = users.find((u) => u.id === '789') || users[0];
      if (defaultSuperAdmin) {
        setCurrentUser(defaultSuperAdmin);
        setActiveUserSession(defaultSuperAdmin);
      }
    }
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
