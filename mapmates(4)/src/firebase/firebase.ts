import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, TwitterAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore, getDoc, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import { getMessaging, onMessage, getToken, isSupported } from 'firebase/messaging';
import { getDatabase, ref, onDisconnect, set, onValue, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';
import { toast } from 'sonner';

// Log config presence (not values)
console.log('Firebase Config Status:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  projectId: firebaseConfig.projectId
});

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
console.log('Firestore Database ID:', databaseId);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with explicit settings for better connectivity in this environment
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, databaseId);
} catch (e) {
  // If already initialized, get the current instance
  dbInstance = getFirestore(app, databaseId);
}
export const db = dbInstance;

export const rtdb = getDatabase(app);
export { ref, onDisconnect, set, onValue, rtdbTimestamp };

// Safe messaging initialization
export let messaging: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      try {
        messaging = getMessaging(app);
        console.log("Firebase Messaging initialized successfully.");
      } catch (e) {
        console.warn('Failed to initialize Firebase Messaging:', e);
      }
    }
  }).catch(err => {
    console.warn('Error checking for Firebase Messaging support:', err);
  });
}

// Error Handling Infrastructure
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    uid?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');
export const twitterProvider = new TwitterAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
export const facebookProvider = new OAuthProvider('facebook.com');
