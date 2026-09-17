import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const FIRESTORE_DB_ID = firebaseConfig.firestoreDatabaseId;
export const TENANT_ID = '11111111-1111-1111-1111-111111111111'; // Maharashtra Rural Pilot

