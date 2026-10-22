import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  type User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types';

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token storage (DO NOT store in localStorage per guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initFirebaseAuth = (
  onSuccess?: (user: FirebaseUser, token: string) => void,
  onFail?: () => void
) => {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(fbUser, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token cleared or expired
        if (onFail) onFail();
      }
    } else {
      cachedAccessToken = null;
      if (onFail) onFail();
    }
  });
};

export const signInWithGoogleDrive = async (): Promise<{ user: { email?: string | null; displayName?: string | null }; accessToken: string }> => {
  isSigningIn = true;
  try {
    // Attempt standard Firebase Auth popup
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Drive access token from credential');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.warn('Firebase sign-in error, testing fallback options:', err);

    // If unauthorized-domain error, try Google Identity Services (GIS) token client if loaded
    if (
      err.code === 'auth/unauthorized-domain' ||
      err.message?.includes('auth/unauthorized-domain') ||
      err.message?.includes('unauthorized domain')
    ) {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        try {
          const gisResult = await requestAccessTokenViaGis();
          return gisResult;
        } catch (gisErr: any) {
          console.error('GIS fallback also failed:', gisErr);
        }
      }
    }

    throw err;
  } finally {
    isSigningIn = false;
  }
};

const requestAccessTokenViaGis = async (): Promise<{ user: { email: string; displayName: string }; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services library is not loaded.'));
      return;
    }
    const oAuthClientId = (firebaseConfig as any).oAuthClientId;
    if (!oAuthClientId) {
      reject(new Error('No oAuthClientId configured in firebase-applet-config.json'));
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: oAuthClientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          if (resp.access_token) {
            cachedAccessToken = resp.access_token;
            let email = 'Google Account';
            let displayName = 'Drive User';
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              });
              if (res.ok) {
                const info = await res.json();
                email = info.email || email;
                displayName = info.name || displayName;
              }
            } catch {
              // fallback
            }
            resolve({
              user: { email, displayName },
              accessToken: resp.access_token,
            });
          } else {
            reject(new Error('No access token received from Google Identity Services'));
          }
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e);
    }
  });
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const disconnectGoogleDrive = async () => {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  cachedAccessToken = null;
};

// Application Session Storage (for DS Staff User ID / Password login)
const ACTIVE_SESSION_KEY = 'vaharai_ds_active_user';

export const getActiveUserSession = (): User | null => {
  try {
    const raw = sessionStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setActiveUserSession = (user: User | null) => {
  if (user) {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  }
};
