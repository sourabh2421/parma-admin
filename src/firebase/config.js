import { initializeApp, getApps } from 'firebase/app'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  initializeAuth,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(Boolean)
}

let appInstance = null
let authInstance = null

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
  }
  return appInstance
}

/**
 * Auth persistence: `local` (default) survives browser restart; `session` clears when the tab/window session ends (better on shared devices).
 * Set `VITE_AUTH_PERSISTENCE=session` or `local` in `.env`.
 */
function resolveAuthPersistence() {
  const mode = import.meta.env.VITE_AUTH_PERSISTENCE?.trim().toLowerCase()
  return mode === 'session' ? browserSessionPersistence : browserLocalPersistence
}

export function getFirebaseAuth() {
  const app = getFirebaseApp()
  if (!app) return null
  if (!authInstance) {
    try {
      authInstance = initializeAuth(app, { persistence: resolveAuthPersistence() })
    } catch (err) {
      if (err?.code === 'auth/already-initialized') {
        authInstance = getAuth(app)
      } else {
        throw err
      }
    }
  }
  return authInstance
}

export function getFirebaseDb() {
  const app = getFirebaseApp()
  return app ? getFirestore(app) : null
}
