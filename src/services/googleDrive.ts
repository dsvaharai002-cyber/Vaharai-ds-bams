import { getGoogleAccessToken } from './auth';
import { DriveBackupItem } from '../types';

export const listDriveBackups = async (): Promise<DriveBackupItem[]> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const query = encodeURIComponent("name contains 'vaharai_ds_backup_' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`;

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
    createdTime: f.createdTime,
    size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : 'Unknown',
  }));
};

export const uploadBackupToDrive = async (snapshotData: any): Promise<DriveBackupItem> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `vaharai_ds_backup_${nowStr}.json`;
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
