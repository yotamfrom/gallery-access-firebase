import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim()
};

if (!firebaseConfig.apiKey) {
    console.error('CRITICAL: Firebase API Key is missing! Firebase will likely fail to initialize.');
}

// Initialize Firebase with safety check
let app;
let storage: any = null;
let auth: any = null;
let db: any = null;

try {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error('❌ Firebase: Failed to initialize app or services', e);
}

export { storage, auth, db };
