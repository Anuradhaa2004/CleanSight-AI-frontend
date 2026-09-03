import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration for CleanSight AI (Authentication)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAHJLDhz_KwvYN0RGy8yqmcfWaRazWtn2o",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cleansight-ai-8feaf.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cleansight-ai-8feaf",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cleansight-ai-8feaf.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "697701158098",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:697701158098:web:57169b2c76637271ebf10b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-01YD5015GV"
};

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication service
export const auth = getAuth(app);

export default app;
