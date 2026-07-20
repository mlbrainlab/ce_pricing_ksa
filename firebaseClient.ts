import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

const firebaseAuth = getAuth(app);
export const auth = firebaseAuth;

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
    try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

export const logoutGoogle = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
        throw error;
    }
};
