import type { StorageManager } from '../storage/StorageManager'

let cachedReduceMotion: boolean | null = null
const listeners: Array<(reduce: boolean) => void> = []

export function prefersReducedMotion(storage: StorageManager): boolean {
  if (cachedReduceMotion !== null) return cachedReduceMotion
  const setting = storage.getSettings().reduceMotion
  if (setting === 'on') cachedReduceMotion = true
  else if (setting === 'off') cachedReduceMotion = false
  else cachedReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return cachedReduceMotion
}

export function refreshReducedMotion(storage: StorageManager): void {
  cachedReduceMotion = null
  const v = prefersReducedMotion(storage)
  for (const cb of listeners) cb(v)
}

export function subscribeReducedMotion(cb: (reduce: boolean) => void): () => void {
  listeners.push(cb)
  return () => {
    const i = listeners.indexOf(cb)
    if (i >= 0) listeners.splice(i, 1)
  }
}
