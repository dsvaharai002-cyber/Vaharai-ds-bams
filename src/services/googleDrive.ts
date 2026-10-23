import { getGoogleAccessToken, isGoogleDriveAuthenticated } from './auth';
import { DriveBackupItem } from '../types';

export const DEFAULT_DESIGNATED_FILE_ID = '1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2';
export const DEFAULT_DESIGNATED_FILE_URL = 'https://drive.google.com/file/d/1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2/view?usp=sharing';

const STORAGE_KEYS = {
  DESIGNATED_FILE_ID: 'vaharai_ds_designated_drive_file_id',
  AUTO_SYNC_ENABLED: 'vaharai_ds_drive_auto_sync_enabled',
  LAST_DRIVE_SYNC: 'vaharai_ds_last_drive_sync_meta',
};

export interface DriveSyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string;
  fileId?: string;
  message?: string;
}

let currentSyncStatus: DriveSyncStatus = {
  state: 'idle',
  fileId: DEFAULT_DESIGNATED_FILE_ID,
};

const statusListeners = new Set<(status: DriveSyncStatus) => void>();

export const getDriveSyncStatus = (): DriveSyncStatus => {
  if (typeof window !== 'undefined') {
    const savedMeta = localStorage.getItem(STORAGE_KEYS.LAST_DRIVE_SYNC);
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        return { ...currentSyncStatus, ...parsed };
      } catch {
        // ignore
      }
    }
  }
  return currentSyncStatus;
};

const notifyStatusChange = (status: Partial<DriveSyncStatus>) => {
  currentSyncStatus = { ...currentSyncStatus, ...status };
  if (typeof window !== 'undefined' && status.lastSyncedAt) {
    localStorage.setItem(STORAGE_KEYS.LAST_DRIVE_SYNC, JSON.stringify(currentSyncStatus));
  }
  statusListeners.forEach((listener) => {
    try {
      listener(currentSyncStatus);
    } catch {
      // ignore
    }
  });
};

export const onDriveSyncStatusChange = (listener: (status: DriveSyncStatus) => void): (() => void) => {
  statusListeners.add(listener);
  listener(getDriveSyncStatus());
  return () => {
    statusListeners.delete(listener);
  };
};

/**
 * Extracts Google Drive file ID from a full sharing URL or returns the clean ID.
 */
export const extractDriveFileId = (input: string): string => {
  if (!input) return DEFAULT_DESIGNATED_FILE_ID;
  const trimmed = input.trim();
  // Match https://drive.google.com/file/d/<FILE_ID>/...
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Match id=<FILE_ID>
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  // Raw file ID (contains alphanumeric, dashes, underscores)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed || DEFAULT_DESIGNATED_FILE_ID;
};

export const getDesignatedDriveFileId = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEYS.DESIGNATED_FILE_ID);
    if (saved) return saved;
  }
  return DEFAULT_DESIGNATED_FILE_ID;
};

export const setDesignatedDriveFileId = (idOrUrl: string): string => {
  const extracted = extractDriveFileId(idOrUrl);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.DESIGNATED_FILE_ID, extracted);
  }
  notifyStatusChange({ fileId: extracted });
  return extracted;
};

export const isDriveAutoSyncEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED);
    return val === null ? true : val === 'true'; // Enabled by default
  }
  return true;
};

export const setDriveAutoSyncEnabled = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC_ENABLED, String(enabled));
  }
};

/**
 * Fetch and parse data from the designated Google Drive file.
 */
export const fetchFromDesignatedDriveFile = async (customFileId?: string): Promise<any | null> => {
  const fileId = customFileId || getDesignatedDriveFileId();
  const token = getGoogleAccessToken();

  notifyStatusChange({ state: 'syncing', fileId, message: 'டிரைவ் கோப்பிலிருந்து வாசிக்கப்படுகிறது...' });

  try {
    if (token) {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        notifyStatusChange({
          state: 'synced',
          fileId,
          lastSyncedAt: new Date().toISOString(),
          message: 'டிரைவ் கோப்பிலிருந்து தரவுகள் வெற்றிகரமாக பெறப்பட்டது.',
        });
        return data;
      }
    }

    // Fallback: public view link proxy / direct fetch if file is publicly shared
    try {
      const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const res = await fetch(publicUrl);
      if (res.ok) {
        const text = await res.text();
        const data = JSON.parse(text);
        notifyStatusChange({
          state: 'synced',
          fileId,
          lastSyncedAt: new Date().toISOString(),
          message: 'டிரைவ் கோப்பிலிருந்து தரவுகள் பொது இணைப்பின் ஊடாக பெறப்பட்டது.',
        });
        return data;
      }
    } catch {
      // CORS might block public download without auth
    }

    throw new Error('Google Drive access token required or file permission denied');
  } catch (err: any) {
    notifyStatusChange({
      state: 'error',
      fileId,
      message: err.message || 'டிரைவ் கோப்பை வாசிக்க முடியவில்லை.',
    });
    return null;
  }
};

/**
 * Saves/updates data directly into the designated Google Drive file.
 * Uses PATCH media to update in-place without creating duplicate files.
 */
export const saveToDesignatedDriveFile = async (
  snapshotData: any,
  customFileId?: string
): Promise<{ success: boolean; fileId: string; fileName: string; timestamp: string }> => {
  const token = getGoogleAccessToken();
  if (!token) {
    notifyStatusChange({
      state: 'error',
      message: 'கூகிள் டிரைவ் உள்நுழையப்படவில்லை. தயவுசெய்து Google Drive உடன் இணைக்கவும்.',
    });
    throw new Error('Google Drive is not authenticated. Please connect Google Drive first.');
  }

  let fileId = customFileId || getDesignatedDriveFileId();
  notifyStatusChange({ state: 'syncing', fileId, message: 'டிரைவ் கோப்பில் சேமிக்கப்படுகிறது...' });

  const fileContent = JSON.stringify(snapshotData, null, 2);

  try {
    // Attempt 1: In-place PATCH update of the designated file
    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const response = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (response.ok) {
      const now = new Date().toISOString();
      notifyStatusChange({
        state: 'synced',
        fileId,
        lastSyncedAt: now,
        message: 'குறிக்கப்பட்ட கூகிள் டிரைவ் கோப்பில் வெற்றிகரமாக சேமிக்கப்பட்டது!',
      });
      return {
        success: true,
        fileId,
        fileName: 'vaharai_ds_master_database.json',
        timestamp: now,
      };
    }

    // If 404 (file doesn't exist in this user's Drive or was trashed), create a new designated master file
    if (response.status === 404 || response.status === 403) {
      console.warn(`Target file ${fileId} not writable or not found (${response.status}). Creating a new master file in user's Drive...`);
      const newBackup = await uploadBackupToDrive(snapshotData, 'vaharai_ds_master_central_database.json');
      setDesignatedDriveFileId(newBackup.id);
      fileId = newBackup.id;

      const now = new Date().toISOString();
      notifyStatusChange({
        state: 'synced',
        fileId: newBackup.id,
        lastSyncedAt: now,
        message: `புதிய முதன்மை டிரைவ் கோப்பு உருவாக்கப்பட்டு சேமிக்கப்பட்டது (${newBackup.id})`,
      });
      return {
        success: true,
        fileId: newBackup.id,
        fileName: newBackup.name,
        timestamp: now,
      };
    }

    const errText = await response.text();
    throw new Error(`Google Drive Save Error: ${response.status} ${errText}`);
  } catch (err: any) {
    notifyStatusChange({
      state: 'error',
      fileId,
      message: err.message || 'டிரைவ் கோப்பில் சேமிக்க முடியவில்லை.',
    });
    throw err;
  }
};

/**
 * Debounced Auto-Drive Sync scheduler
 */
let driveAutoSyncTimer: any = null;

export const scheduleAutoDriveSync = (snapshotData?: any) => {
  if (typeof window === 'undefined') return;
  if (!isDriveAutoSyncEnabled()) return;
  if (!isGoogleDriveAuthenticated()) return;

  if (driveAutoSyncTimer) clearTimeout(driveAutoSyncTimer);

  driveAutoSyncTimer = setTimeout(async () => {
    try {
      // Lazy load createDatabaseSnapshot if needed
      const data = snapshotData || (window as any).__vaharai_create_snapshot?.();
      if (data) {
        await saveToDesignatedDriveFile(data);
        console.log('[Auto-Drive-Sync] Automatically updated designated Google Drive file.');
      }
    } catch (err) {
      console.warn('[Auto-Drive-Sync] Failed:', err);
    }
  }, 1500);
};

// ================= Standard Backup List, Download, and Delete ================= //

export const listDriveBackups = async (): Promise<DriveBackupItem[]> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const query = encodeURIComponent("name contains 'vaharai_ds_' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size,modifiedTime)&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    createdTime: f.modifiedTime || f.createdTime,
    size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : 'Unknown',
  }));
};

export const uploadBackupToDrive = async (snapshotData: any, customName?: string): Promise<DriveBackupItem> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = customName || `vaharai_ds_backup_${nowStr}.json`;
  const fileContent = JSON.stringify(snapshotData, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Koralaipattu North Vaharai Divisional Secretariat Database Backup',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }

  const file = await response.json();
  return {
    id: file.id,
    name: file.name,
    createdTime: new Date().toISOString(),
    size: `${(fileContent.length / 1024).toFixed(1)} KB`,
  };
};

export const downloadDriveBackup = async (fileId: string): Promise<any> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Download failed: ${response.status} ${errorText}`);
  }

  return await response.json();
};

export const deleteDriveBackup = async (fileId: string): Promise<void> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`Delete failed: ${response.status} ${errorText}`);
  }
};
