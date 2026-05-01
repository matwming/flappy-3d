export function mulberry32(seed: number): () => number {
  let s = seed
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function dailySeed(): number {
  return parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10) % 0xFFFFFFFF
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}
