import React, { useState, useEffect } from 'react';
import { User, Family } from './types';
import { StorageService } from './services/storageService';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { FamilyRegistryView } from './components/FamilyRegistryView';
import { AssistanceDeliveryView } from './components/AssistanceDeliveryView';
import { NeedsAssessmentView } from './components/NeedsAssessmentView';
import { QrRequestsView } from './components/QrRequestsView';
import { ProgramsAndUsersView } from './components/ProgramsAndUsersView';
import { AuditLogView } from './components/AuditLogView';
import { GoogleSheetsSyncView } from './components/GoogleSheetsSyncView';
import { ElderlyRegistryView } from './components/ElderlyRegistryView';
import { DisabilityRegistryView } from './components/DisabilityRegistryView';
import { ReceptionView } from './components/ReceptionView';
import { QrScannerModal } from './components/QrScannerModal';
import { FamilyDetailModal } from './components/FamilyDetailModal';
import { LoginView } from './components/LoginView';
import { AIStrategicReportView } from './components/AIStrategicReportView';
import { TRANSLATIONS, Language } from './utils/translations';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const session = StorageService.getCurrentSession();
    return session?.user || null;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const session = StorageService.getCurrentSession();
    return session?.user?.Role === 'Receptionist' ? 'reception' : 'dashboard';
  });

  const [currentLang, setCurrentLang] = useState<Language>(() => {
    return (localStorage.getItem('vaharai_lang') as Language) || 'ta'; // Default to Tamil as primary local language
  });

  // Global modals
  const [showScanner, setShowScanner] = useState(false);
  const [inspectedFamily, setInspectedFamily] = useState<Family | null>(null);
  const [assistancePreselectedFamily, setAssistancePreselectedFamily] = useState<Family | null>(null);
  const [transferRequestParams, setTransferRequestParams] = useState<{ oldNIC: string; qrNumber: string } | null>(null);

  // Google Sheets Cloud Sync Status
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState(
    currentLang === 'ta'
      ? 'Google Sheets நேரலை இணைப்பு தயார் நிலையில் உள்ளது.'
      : 'Google Sheets Cloud synchronization active.'
  );

  // Cloud Sync on App Mount
  useEffect(() => {
    let mounted = true;
    const loadCloud = async () => {
      setLoadingCloud(true);
      try {
        const result = await StorageService.syncFromCloud();
        if (!mounted) return;
        if (result.synced) {
          setCloudMessage(
            currentLang === 'ta'
              ? 'Google Sheets நேரலைத் தரவுத்தளம் வெற்றிகரமாக இணைக்கப்பட்டது.'
              : 'Google Sheets cloud database synced successfully.'
          );
        } else {
          setCloudMessage(
            currentLang === 'ta'
              ? 'Google Sheets நேரலை கிளவுட் இணைப்பு தயார் நிலையில் உள்ளது (LocalStorage நீக்கப்பட்டது).'
              : 'Google Sheets Direct Cloud Mode active (LocalStorage disabled).'
          );
        }
      } catch {
        if (!mounted) return;
        setCloudMessage(
          currentLang === 'ta'
            ? 'Google Sheets நேரலை கிளவுட் இணைப்பு தயார் நிலையில் உள்ளது.'
            : 'Google Sheets Direct Cloud Mode active.'
        );
      } finally {
        if (mounted) setLoadingCloud(false);
      }
    };
    loadCloud();
    return () => {
      mounted = false;
    };
  }, [currentLang]);

  // Requirement #1: Receptionist can ONLY view reception information!
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.Role === 'Receptionist') {
      if (activeTab !== 'reception') {
        setActiveTab('reception');
      }
    } else {
      if (activeTab === 'governance' && currentUser.Role !== 'Super_Admin' && currentUser.Role !== 'Super Admin') {
        setActiveTab('dashboard');
      }
      if (activeTab === 'assistance' && currentUser.Role === 'Auditor') {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  const handleManualSync = async () => {
    setLoadingCloud(true);
    setCloudMessage(
      currentLang === 'ta'
        ? 'Google Sheets உடன் இணைக்கப்படுகிறது...'
        : 'Connecting and syncing with Google Sheets...'
    );
    try {
      const result = await StorageService.syncFromCloud();
      setCloudMessage(
        result.synced
          ? (currentLang === 'ta' ? 'Google Sheets நேரலைத் தரவுத்தளம் இணைக்கப்பட்டது!' : 'Google Sheets cloud database synced successfully.')
          : (currentLang === 'ta' ? 'உள்ளக சேமிப்பகம் புதுப்பிக்கப்பட்டது.' : 'Local database up to date.')
      );
    } catch {
      setCloudMessage(
        currentLang === 'ta'
          ? 'உள்ளக சேமிப்பக முறை இயங்குகிறது.'
          : 'Operating in offline local cache mode (fetch failed).'
      );
    } finally {
      setLoadingCloud(false);
    }
  };

  const handleToggleLang = () => {
    setCurrentLang(prev => {
      const next = prev === 'en' ? 'ta' : 'en';
      localStorage.setItem('vaharai_lang', next);
      return next;
    });
  };

  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
  };

  const handleSelectFamilyFromAnywhere = (family: Family) => {
    setInspectedFamily(family);
  };

  const handleRecordAssistanceForFamily = (family: Family) => {
    if (currentUser?.Role === 'Receptionist') return;
    setAssistancePreselectedFamily(family);
    setActiveTab('assistance');
  };

  const handleRequestTransferForMember = (oldNIC: string, qrNumber: string) => {
    if (currentUser?.Role === 'Receptionist') return;
    setTransferRequestParams({ oldNIC, qrNumber });
    setActiveTab('requests');
  };

  // If user is not logged in, show the login view
  if (!currentUser) {
    return (
      <LoginView
        currentLang={currentLang}
        onToggleLang={handleToggleLang}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveTab(user.Role === 'Receptionist' ? 'reception' : 'dashboard');
        }}
      />
    );
  }

  const isReceptionist = currentUser.Role === 'Receptionist';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Header with Responsive Condensed Submenus */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        onNavigate={tab => {
          // If receptionist, restrict strictly to reception (Requirement #1)
          if (currentUser.Role === 'Receptionist') {
            setActiveTab('reception');
          } else {
            setActiveTab(tab);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLogout={handleLogout}
        onOpenScanner={() => setShowScanner(true)}
        currentLang={currentLang}
        onToggleLang={handleToggleLang}
      />

      {/* Cloud Status Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-1.5 text-center text-xs text-blue-900 font-medium flex items-center justify-center gap-2 no-print">
        <span className={`h-2 w-2 rounded-full ${loadingCloud ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></span>
        <span>{cloudMessage}</span>
        <button
          type="button"
          onClick={handleManualSync}
          disabled={loadingCloud}
          className="ml-2 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer disabled:opacity-50"
        >
          {loadingCloud ? (currentLang === 'ta' ? 'இணைக்கப்படுகிறது...' : 'Syncing...') : (currentLang === 'ta' ? 'இப்போதே இணைக்க' : 'Sync Now')}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6">
        {/* If Receptionist: STRICTLY RECEPTION VIEW (Requirement #1) */}
        {isReceptionist ? (
          <ReceptionView
            currentUser={currentUser}
            currentLang={currentLang}
            onSelectFamily={handleSelectFamilyFromAnywhere}
            onOpenScanner={() => setShowScanner(true)}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                currentUser={currentUser}
                currentLang={currentLang}
                onNavigate={setActiveTab}
                onSelectFamily={handleSelectFamilyFromAnywhere}
                onOpenScanner={() => setShowScanner(true)}
              />
            )}

            {activeTab === 'ai_report' && (
              <AIStrategicReportView
                currentUser={currentUser}
                currentLang={currentLang}
                onSelectFamily={handleSelectFamilyFromAnywhere}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'reception' && (
              <ReceptionView
                currentUser={currentUser}
                currentLang={currentLang}
                onSelectFamily={handleSelectFamilyFromAnywhere}
                onOpenScanner={() => setShowScanner(true)}
              />
            )}

            {activeTab === 'registry' && (
              <FamilyRegistryView
                currentUser={currentUser}
                currentLang={currentLang}
                onRecordAssistance={handleRecordAssistanceForFamily}
                onRequestTransfer={handleRequestTransferForMember}
              />
            )}

            {activeTab === 'elderly' && (
              <ElderlyRegistryView
                currentUser={currentUser}
                currentLang={currentLang}
                onRecordAssistance={handleRecordAssistanceForFamily}
                onRequestTransfer={handleRequestTransferForMember}
              />
            )}

            {activeTab === 'disability' && (
              <DisabilityRegistryView
                currentUser={currentUser}
                currentLang={currentLang}
                onRecordAssistance={handleRecordAssistanceForFamily}
                onRequestTransfer={handleRequestTransferForMember}
              />
            )}

            {activeTab === 'assistance' && currentUser.Role !== 'Auditor' && (
              <AssistanceDeliveryView
                currentUser={currentUser}
                currentLang={currentLang}
                preselectedFamily={assistancePreselectedFamily}
                onViewFamily={handleSelectFamilyFromAnywhere}
              />
            )}

            {activeTab === 'needs' && (
              <NeedsAssessmentView
                currentUser={currentUser}
                currentLang={currentLang}
                onSelectFamily={handleSelectFamilyFromAnywhere}
              />
            )}

            {activeTab === 'requests' && (
              <QrRequestsView
                currentUser={currentUser}
                currentLang={currentLang}
                initialQR={transferRequestParams?.qrNumber || ''}
                initialOldNIC={transferRequestParams?.oldNIC || ''}
              />
            )}

            {activeTab === 'governance' && (currentUser.Role === 'Super_Admin' || currentUser.Role === 'Super Admin') && (
              <ProgramsAndUsersView
                currentUser={currentUser}
                currentLang={currentLang}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogView
                currentUser={currentUser}
                currentLang={currentLang}
              />
            )}

            {activeTab === 'sync' && (
              <GoogleSheetsSyncView
                currentLang={currentLang}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 text-center no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {currentLang === 'ta'
              ? 'பிரதேச செயலகம் – கோரளைப்பற்று வடக்கு (வாகரை) • மட்டக்களப்பு மாவட்டம்'
              : 'Divisional Secretariat – Vaharai • Batticaloa District • Beneficiary Assistance Management System'}
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {currentLang === 'ta'
              ? '16 கிராம சேவகர் பிரிவுகள் • Google Apps Script நேரலை இணைப்பு'
              : '16 GN Divisions • Google Apps Script Enabled'}
          </span>
        </div>
      </footer>

      {/* Modals */}
      {showScanner && (
        <QrScannerModal
          currentUser={currentUser}
          currentLang={currentLang}
          onClose={() => setShowScanner(false)}
          onSelectFamily={handleSelectFamilyFromAnywhere}
          onRecordAssistance={handleRecordAssistanceForFamily}
        />
      )}

      {inspectedFamily && (
        <FamilyDetailModal
          family={inspectedFamily}
          currentUser={currentUser}
          currentLang={currentLang}
          onClose={() => setInspectedFamily(null)}
          onFamilyUpdated={() => {
            const ref = StorageService.getFamily(currentUser, inspectedFamily.QR_Number);
            if (ref.family) setInspectedFamily(ref.family);
          }}
          onRecordAssistance={handleRecordAssistanceForFamily}
          onRequestTransfer={handleRequestTransferForMember}
        />
      )}
    </div>
  );
}
