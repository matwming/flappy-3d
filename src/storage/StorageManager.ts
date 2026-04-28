// localStorage key: 'flappy-3d:v1'
// Schema version 1 — Phase 3 will extend with settings + leaderboard

interface SaveV1 {
  schemaVersion: 1
  bestScore: number
}

export class StorageManager {
  private static readonly KEY = 'flappy-3d:v1'

  // Migration hook: parse raw JSON and validate schemaVersion.
  // Returns null if key absent, parse fails, or schemaVersion !== 1.
  private loadRaw(): SaveV1 | null {
    try {
      const raw = localStorage.getItem(StorageManager.KEY)
      if (raw === null) return null
      const parsed: unknown = JSON.parse(raw)
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        (parsed as { schemaVersion?: unknown }).schemaVersion !== 1
      ) {
        return null
      }
      const data = parsed as { schemaVersion: 1; bestScore: unknown }
      if (typeof data.bestScore !== 'number') return null
      return { schemaVersion: 1, bestScore: data.bestScore }
    } catch {
      return null
    }
  }

  // Returns stored bestScore, or 0 if key absent, JSON parse fails, or schemaVersion !== 1.
  // Never throws.
  getBestScore(): number {
    const save = this.loadRaw()
    return save !== null ? save.bestScore : 0
  }

  // Writes to localStorage only if score > current stored bestScore.
  // Catches and ignores write errors (e.g., private browsing quota exceeded).
  setBestScore(score: number): void {
    const current = this.getBestScore()
    if (score <= current) return
    try {
      const save: SaveV1 = { schemaVersion: 1, bestScore: score }
      localStorage.setItem(StorageManager.KEY, JSON.stringify(save))
    } catch {
      // Ignore QuotaExceededError and other write failures — game continues without persisting
    }
  }
}
