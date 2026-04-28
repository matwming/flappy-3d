const STORAGE_KEY = 'flappy-3d:v1'

export interface SettingsV2 {
  sound: boolean
  music: boolean
  reduceMotion: 'auto' | 'on' | 'off'
  palette: 'default' | 'colorblind'
}

export interface LeaderboardEntry {
  score: number
  ts: number
}

const DEFAULT_SETTINGS: SettingsV2 = {
  sound: true,
  music: true,
  reduceMotion: 'auto',
  palette: 'default',
}

interface SaveV1 {
  schemaVersion: 1
  bestScore: number
}

interface SaveV2 {
  schemaVersion: 2
  bestScore: number
  leaderboard: LeaderboardEntry[]
  settings: SettingsV2
}

export class StorageManager {
  private load(): SaveV2 {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) return this.defaults()
      const parsed = JSON.parse(raw) as SaveV1 | SaveV2
      if (parsed.schemaVersion === 1) {
        // Migrate v1 → v2
        return {
          schemaVersion: 2,
          bestScore: parsed.bestScore,
          leaderboard:
            parsed.bestScore > 0 ? [{ score: parsed.bestScore, ts: Date.now() }] : [],
          settings: { ...DEFAULT_SETTINGS },
        }
      }
      if (parsed.schemaVersion === 2) return parsed
      return this.defaults()
    } catch {
      return this.defaults()
    }
  }

  private save(data: SaveV2): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Quota exceeded or disabled — silent fail (game still playable)
    }
  }

  private defaults(): SaveV2 {
    return {
      schemaVersion: 2,
      bestScore: 0,
      leaderboard: [],
      settings: { ...DEFAULT_SETTINGS },
    }
  }

  getBestScore(): number {
    return this.load().bestScore
  }

  setBestScore(score: number): void {
    const data = this.load()
    if (score > data.bestScore) {
      data.bestScore = score
      this.save(data)
    }
  }

  getLeaderboard(): LeaderboardEntry[] {
    return this.load().leaderboard.slice()
  }

  pushLeaderboard(score: number): { isNewBest: boolean; rank: number | null } {
    const data = this.load()
    const before = data.leaderboard.length > 0 ? (data.leaderboard[0]?.score ?? 0) : 0
    data.leaderboard = [...data.leaderboard, { score, ts: Date.now() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    const idx = data.leaderboard.findIndex((e) => e.score === score)
    const rank = idx >= 0 ? idx + 1 : null
    if (score > data.bestScore) data.bestScore = score
    this.save(data)
    return { isNewBest: score > before, rank }
  }

  getSettings(): SettingsV2 {
    return { ...this.load().settings }
  }

  setSettings(partial: Partial<SettingsV2>): void {
    const data = this.load()
    data.settings = { ...data.settings, ...partial }
    this.save(data)
  }
}
