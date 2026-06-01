# Patterns

An interactive study tool for algorithm and system-design interview prep. Instead of grinding problems one at a time, Patterns groups them by the underlying **pattern** (two pointers, sliding window, tree DFS, …) and tracks your fluency per pattern, so prep is organized around transferable techniques rather than a flat problem count.

## Features

- **Pattern-grouped curriculum** — ~145 curated problems organized into pattern families, each with a "when to use" and a code skeleton.
- **Spaced repetition (SM-2)** — per-problem review scheduling with Anki-style Hard/Good/Easy modifiers; a problem is "fluent" after repeated successful reviews.
- **Guided study flow** — each problem walks Understand → Approach → Walkthrough, with step-by-step visualizations (array pointers, linked lists, grid BFS) driven by hover and playback.
- **Daily plan** — a goal-aware queue (new + due) that paces you toward a target date across your chosen study days.
- **Offline-first cloud sync** — all study state lives in `localStorage` for instant, offline reads, mirrored to Firestore so it's durable and syncs across devices. The app is fully usable without signing in; sign-in only enables sync of *your* data.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Firebase (Firestore + Auth)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

### Cloud sync (optional)

Sync is a no-op until Firebase is configured — the app runs on `localStorage` alone otherwise. To enable it, create a Firebase project (Firestore + Google sign-in) and add a `.env` with:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Firestore security rules live in `firestore.rules` (each user can read/write only their own document).

## Architecture notes

- **Local-first storage:** the app reads/writes `localStorage` synchronously during render. `lib/cloudSync.ts` mirrors those keys to Firestore on a short interval (and on tab-hide), hydrates on boot, and applies inbound changes via a realtime listener — all additive, so the core study logic never depends on the network.
- **Conflict handling:** last-write-wins per key via an `updatedAt` timestamp — appropriate for a single user across their own devices.
