'use client'

// Boot gate for cloud sync. No-ops entirely if Firebase isn't configured, so
// the app keeps working on pure localStorage until the project is set up.
//
// When configured: tracks Google auth, starts the localStorage↔Firestore
// mirror on sign-in, and shows a small status pill (bottom-right) to sign in /
// out. On a fresh device the cloud hydrates into localStorage after the page
// has already rendered empty, so we reload once to surface the pulled data.

import { useEffect, useState } from 'react'
import { firebaseConfigured, getFirebase } from '@/lib/firebase'
import { startCloudSync } from '@/lib/cloudSync'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

const RELOADED_FLAG = 'patterns:__hydrate_reloaded'

export function CloudSyncGate() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured()) { setReady(true); return }
    const fb = getFirebase()
    if (!fb) { setReady(true); return }

    // Reload once after a fresh-device hydrate so pages re-read localStorage.
    const onHydrated = () => {
      if (!sessionStorage.getItem(RELOADED_FLAG)) {
        sessionStorage.setItem(RELOADED_FLAG, '1')
        window.location.reload()
      }
    }
    window.addEventListener('patterns:cloud-hydrated', onHydrated)

    const unsub = onAuthStateChanged(fb.auth, (u) => {
      setUser(u)
      setReady(true)
      if (u) void startCloudSync(u.uid)
    })
    return () => { unsub(); window.removeEventListener('patterns:cloud-hydrated', onHydrated) }
  }, [])

  if (!firebaseConfigured()) return null

  const signIn = () => {
    const fb = getFirebase()
    if (fb) void signInWithPopup(fb.auth, new GoogleAuthProvider())
  }
  const out = () => {
    const fb = getFirebase()
    if (fb) void signOut(fb.auth)
  }

  return (
    <div className="fixed bottom-3 right-3 z-50">
      {!ready ? null : user ? (
        <button
          onClick={out}
          title={`Synced as ${user.email ?? 'signed in'} — click to sign out`}
          className="rounded-full bg-[#313244] px-3 py-1 text-xs text-[#a6adc8] hover:text-[#cdd6f4]"
        >
          ☁ synced
        </button>
      ) : (
        <button
          onClick={signIn}
          className="rounded-full bg-[#313244] px-3 py-1 text-xs text-[#cdd6f4] hover:bg-[#45475a]"
        >
          Sign in to sync
        </button>
      )}
    </div>
  )
}
