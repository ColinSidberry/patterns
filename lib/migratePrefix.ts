// One-time rename of the legacy localStorage key prefix to `patterns:` (the
// app was renamed). Idempotent and cheap — safe to run on every boot. The old
// prefix is built from fragments so a future global find-replace can't touch
// it and the literal never appears in source.
const OLD = 'flow' + 'path:'
const NEW = 'patterns:'

export function migrateKeyPrefix(): boolean {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(OLD)) keys.push(k)
    }
    if (keys.length === 0) return false
    for (const k of keys) {
      const nk = NEW + k.slice(OLD.length)
      const v = localStorage.getItem(k)
      if (v !== null && localStorage.getItem(nk) === null) localStorage.setItem(nk, v)
      localStorage.removeItem(k)
    }
    return true
  } catch {
    return false
  }
}
