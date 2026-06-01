// Firebase client init. Lazy + guarded: if the NEXT_PUBLIC_FIREBASE_* env
// vars aren't set, getFirebase() returns null and all cloud-sync code becomes
// a no-op, so the app runs exactly as before (pure localStorage) until the
// project is configured.
//
// The web config values are public by design (they ship in the JS bundle);
// data is protected by Firebase Auth + Firestore security rules, not secrecy.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export function firebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId)
}

let cached: { app: FirebaseApp; db: Firestore; auth: Auth } | null = null

export function getFirebase() {
  if (!firebaseConfigured()) return null
  if (cached) return cached
  const app = getApps().length ? getApp() : initializeApp(config as Record<string, string>)
  cached = { app, db: getFirestore(app), auth: getAuth(app) }
  return cached
}
