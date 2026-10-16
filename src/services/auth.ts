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

export const signInWithGoogleDrive = async (): Promise<{ user: FirebaseUser; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Drive access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error('Google sign in error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const disconnectGoogleDrive = async () => {
  await signOut(auth);
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
