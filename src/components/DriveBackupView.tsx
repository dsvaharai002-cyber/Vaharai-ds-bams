import React, { useState, useEffect } from 'react';
import { User, DriveBackupItem } from '../types';
import { Language, translations } from '../translations/i18n';
import {
  signInWithGoogleDrive,
  getGoogleAccessToken,
  disconnectGoogleDrive,
} from '../services/auth';
import {
  listDriveBackups,
  uploadBackupToDrive,
  downloadDriveBackup,
  deleteDriveBackup,
} from '../services/googleDrive';
import {
  createDatabaseSnapshot,
  restoreDatabaseFromSnapshot,
} from '../services/storage';

interface DriveBackupViewProps {
  currentUser: User;
  lang: Language;
  onDatabaseReload: () => void;
  onAuditLog: (action: string, details: string) => void;
}

export const DriveBackupView: React.FC<DriveBackupViewProps> = ({
  currentUser,
  lang,
  onDatabaseReload,
  onAuditLog,
}) => {
  const t = translations[lang];

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string>('');
  const [driveBackups, setDriveBackups] = useState<DriveBackupItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Confirmation dialog state for destructive/mutating operations
  const [confirmModalItem, setConfirmModalItem] = useState<DriveBackupItem | null>(null);

  useEffect(() => {
    const token = getGoogleAccessToken();
    if (token) {
      setIsConnected(true);
      fetchBackups();
    }
  }, []);

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { user } = await signInWithGoogleDrive();
      setIsConnected(true);
      setGoogleUserEmail(user.email || 'Connected Google Account');
      setStatusMessage(lang === 'ta' ? 'கூகிள் டிரைவ் வெற்றிகரமாக இணைக்கப்பட்டது!' : 'Google Drive connected successfully!');
      await fetchBackups();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to authenticate with Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
    setIsConnected(false);
    setGoogleUserEmail('');
    setDriveBackups([]);
  };

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const list = await listDriveBackups();
      setDriveBackups(list);
    } catch (err: any) {
      console.error('Fetch backups error:', err);
      // Non fatal, maybe empty
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDriveBackup = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const snapshot = createDatabaseSnapshot();
      const newFile = await uploadBackupToDrive(snapshot);
      setStatusMessage(`${t.backupSuccess} (${newFile.name})`);
      onAuditLog('DRIVE_BACKUP', `Uploaded database backup to Google Drive: ${newFile.name}`);
      await fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to backup to Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!confirmModalItem) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const snapshot = await downloadDriveBackup(confirmModalItem.id);
      restoreDatabaseFromSnapshot(snapshot);
      onDatabaseReload();
      onAuditLog('DRIVE_RESTORE', `Restored database from Google Drive backup: ${confirmModalItem.name}`);
      setStatusMessage(`${t.restoreSuccess} (${confirmModalItem.name})`);
      setConfirmModalItem(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore backup from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBackup = async (item: DriveBackupItem) => {
    if (!window.confirm(lang === 'ta' ? 'இந்த காப்புப்பிரதியை கூகிள் டிரைவிலிருந்து நிச்சயமாக நீக்க வேண்டுமா?' : `Delete ${item.name} from Google Drive?`)) {
      return;
    }
    setIsLoading(true);
    try {
      await deleteDriveBackup(item.id);
      onAuditLog('DRIVE_DELETE', `Deleted Google Drive backup file: ${item.name}`);
      await fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete file from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  // Local JSON File export
  const handleDownloadLocalBackup = () => {
    const snapshot = createDatabaseSnapshot();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const nowStr = new Date().toISOString().slice(0, 10);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vaharai_ds_local_backup_${nowStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onAuditLog('LOCAL_BACKUP', 'Exported local database JSON backup file');
  };

  const handleUploadLocalBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(t.confirmRestore)) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const snapshot = JSON.parse(text);
        restoreDatabaseFromSnapshot(snapshot);
        onDatabaseReload();
        setStatusMessage(t.restoreSuccess);
        onAuditLog('LOCAL_RESTORE', `Restored database from local file: ${file.name}`);
      } catch (err: any) {
        setErrorMessage(lang === 'ta' ? 'செல்லுபடியற்ற JSON காப்புப்பிரதி கோப்பு!' : 'Invalid JSON backup file!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">☁️</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {t.driveTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.driveSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors border border-red-200"
            >
              {lang === 'ta' ? 'இணைப்பைத் துண்டி' : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={handleConnectGoogle}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{t.connectDrive}</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
          ✓ {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Cloud Drive Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              ></span>
              <span className="text-xs font-bold text-slate-800">
                {isConnected ? t.driveStatusConnected : t.driveStatusDisconnected}
              </span>
            </div>
            {googleUserEmail && (
              <span className="text-xs font-mono text-slate-500 mt-1 block">
                {googleUserEmail}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCreateDriveBackup}
              disabled={!isConnected || isLoading}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
            >
              <span>💾</span>
              <span>{t.backupNow}</span>
            </button>
            <button
              onClick={fetchBackups}
              disabled={!isConnected || isLoading}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              🔄 {t.refresh}
            </button>
          </div>
        </div>

        {/* Backups List */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.backupsList}
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              {driveBackups.length} {t.records}
            </span>
          </div>

          {!isConnected ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-lg">
              <p>
                {lang === 'ta'
                  ? 'உங்கள் கூகிள் டிரைவில் உள்ள காப்புப்பிரதிகளைப் பார்க்க "கூகிள் கணக்குடன் இணைக்கவும்" பொத்தானை அழுத்தவும்.'
                  : 'Connect with Google to view and sync your cloud database backups.'}
              </p>
            </div>
          ) : driveBackups.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-slate-100 rounded-lg">
              {lang === 'ta'
                ? 'கூகிள் டிரைவில் காப்புப்பிரதிகள் எதுவும் இல்லை. மேலே உள்ள "இப்போதே காப்புப்பிரதி எடுக்கவும்" பொத்தானை அழுத்தவும்.'
                : 'No backups found on Google Drive. Click "Backup Snapshot to Google Drive Now" to create your first cloud archive.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {driveBackups.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📄</span>
                    <div>
                      <div className="font-mono font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {new Date(item.createdTime).toLocaleString()} · {item.size}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmModalItem(item)}
                      className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-xs font-semibold transition-colors"
                    >
                      ↩️ {t.restoreFromDrive}
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(item)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete from Drive"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Local File Backup & Recovery Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          {lang === 'ta' ? 'கணினி உள்ளூர் காப்புப்பிரதி (Local Backup / JSON)' : 'Local Machine Backup & Recovery'}
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          {lang === 'ta'
            ? 'இணைய இணைப்பு இல்லாத போதும் संपूर्ण தரவுத்தளத்தை JSON கோப்பாக சேமித்து வைத்துக்கொள்ளலாம்.'
            : 'Download or upload complete JSON snapshots locally for disaster recovery without internet access.'}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleDownloadLocalBackup}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            💾 {t.localExport}
          </button>

          <label className="cursor-pointer px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium transition-colors shadow-xs">
            <span>📥 {t.localImport}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleUploadLocalBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive Restore Operation */}
      {confirmModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-2 text-amber-600 pb-2 border-b border-slate-100">
              <span className="text-xl">⚠️</span>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'ta' ? 'தரவுத்தள மீட்டெடுப்பு உறுதிப்படுத்தல்' : 'Confirm Database Restore'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              {t.confirmRestore}
            </p>

            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700">
              <div><span className="font-semibold">File:</span> {confirmModalItem.name}</div>
              <div><span className="font-semibold">Time:</span> {new Date(confirmModalItem.createdTime).toLocaleString()}</div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setConfirmModalItem(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleRestoreBackup}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {lang === 'ta' ? 'மீட்டெடுக்கவும் (Confirm Restore)' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
