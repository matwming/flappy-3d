import type { DifficultyPreset } from '../constants'

const STORAGE_KEY = 'flappy-3d:v1'

// GameMode is duplicated here so StorageManager has zero dependency on src/machine/.
// TypeScript structural typing makes this compatible with gameMachine.ts's GameMode.
export type GameMode = 'endless' | 'timeAttack' | 'daily'
export type BirdShape = 'sphere' | 'cube' | 'pyramid'

export interface SettingsV2 {
  sound: boolean
  music: boolean
  reduceMotion: 'auto' | 'on' | 'off'
  palette: 'default' | 'colorblind'
  flapTrail: boolean  // Phase 7 BEAUTY-06; default false
}

export interface SettingsV3 extends SettingsV2 {
  lastMode: GameMode
  cameraBob: boolean  // Phase 15 POLISH-03; default false (opt-in, motion-sensitive)
}

export interface SettingsV4 extends SettingsV3 {
  difficulty: DifficultyPreset  // Phase 16 v1.5; default 'easy' (fresh) or 'normal' (existing migrated)
  birdShape: BirdShape           // Phase 17 v1.5; default 'sphere'
  birdImage: string | null       // Phase 17 v1.5; data URL (PNG, ≤256×256), null = use shape
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
  flapTrail: false,
}

const DEFAULT_SETTINGS_V3: SettingsV3 = {
  ...DEFAULT_SETTINGS,
  lastMode: 'endless',
  cameraBob: false,
}

const DEFAULT_SETTINGS_V4: SettingsV4 = {
  ...DEFAULT_SETTINGS_V3,
  difficulty: 'easy',  // fresh-install default — easier for new players (v1.5)
  birdShape: 'sphere',
  birdImage: null,
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

interface SaveV3 {
  schemaVersion: 3
  bestScore: number
  settings: SettingsV3
  leaderboardByMode: {
    endless: LeaderboardEntry[]
    timeAttack: LeaderboardEntry[]
    daily: LeaderboardEntry[]
  }
  dailyAttempts: Record<string, { count: number; best: number }>
}

interface SaveV4 extends Omit<SaveV3, 'schemaVersion' | 'settings'> {
  schemaVersion: 4
  settings: SettingsV4
}

export class StorageManager {
  private load(): SaveV4 {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) return this.defaults()
      const parsed = JSON.parse(raw) as SaveV1 | SaveV2 | SaveV3 | SaveV4
      if (parsed.schemaVersion === 1) {
        // v1 → v4: no leaderboard in v1; existing user → 'normal' difficulty
        return {
          schemaVersion: 4,
          bestScore: parsed.bestScore,
          settings: { ...DEFAULT_SETTINGS_V4, difficulty: 'normal' },
          leaderboardByMode: {
            endless: parsed.bestScore > 0 ? [{ score: parsed.bestScore, ts: Date.now() }] : [],
            timeAttack: [],
            daily: [],
          },
          dailyAttempts: {},
        }
      }
      if (parsed.schemaVersion === 2) {
        // v2 → v4: existing user → 'normal' difficulty
        return {
          schemaVersion: 4,
          bestScore: parsed.bestScore,
          settings: { ...DEFAULT_SETTINGS_V4, ...parsed.settings, difficulty: 'normal' },
          leaderboardByMode: { endless: parsed.leaderboard, timeAttack: [], daily: [] },
          dailyAttempts: {},
        }
      }
      if (parsed.schemaVersion === 3) {
        // v3 → v4: existing user → 'normal' difficulty (don't surprise-buff to easy)
        return {
          schemaVersion: 4,
          bestScore: parsed.bestScore,
          settings: { ...DEFAULT_SETTINGS_V4, ...parsed.settings, difficulty: 'normal' },
          leaderboardByMode: parsed.leaderboardByMode,
          dailyAttempts: parsed.dailyAttempts,
        }
      }
      if (parsed.schemaVersion === 4) return parsed as SaveV4
      return this.defaults()
    } catch {
      return this.defaults()
    }
  }

  private save(data: SaveV4): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Quota exceeded or disabled — silent fail (game still playable)
    }
  }

  private defaults(): SaveV4 {
    return {
      schemaVersion: 4,
      bestScore: 0,
      settings: { ...DEFAULT_SETTINGS_V4 },
      leaderboardByMode: { endless: [], timeAttack: [], daily: [] },
      dailyAttempts: {},
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

  /** @deprecated Use getLeaderboard(mode) */
  getLeaderboard(): LeaderboardEntry[]
  getLeaderboard(mode: GameMode): LeaderboardEntry[]
  getLeaderboard(mode: GameMode = 'endless'): LeaderboardEntry[] {
    return this.load().leaderboardByMode[mode].slice()
  }

  /** Push entry to mode-specific leaderboard. Returns isNewBest and rank within that mode's list. */
  pushLeaderboard(mode: GameMode, entry: LeaderboardEntry): { isNewBest: boolean; rank: number | null }
  /** @deprecated Use pushLeaderboard(mode, entry) */
  pushLeaderboard(score: number): { isNewBest: boolean; rank: number | null }
  pushLeaderboard(
    modeOrScore: GameMode | number,
    entry?: LeaderboardEntry,
  ): { isNewBest: boolean; rank: number | null } {
    const mode: GameMode = typeof modeOrScore === 'number' ? 'endless' : modeOrScore
    const e: LeaderboardEntry =
      entry ?? { score: modeOrScore as number, ts: Date.now() }

    const data = this.load()
    const bucket = data.leaderboardByMode[mode]
    const before = bucket.length > 0 ? (bucket[0]?.score ?? 0) : 0
    const updated = [...bucket, e].sort((a, b) => b.score - a.score).slice(0, 5)
    data.leaderboardByMode[mode] = updated
    const idx = updated.findIndex((x) => x.score === e.score && x.ts === e.ts)
    const rank = idx >= 0 ? idx + 1 : null
    if (e.score > data.bestScore) data.bestScore = e.score
    this.save(data)
    return { isNewBest: e.score > before, rank }
  }

  getDailyAttempt(date: string): { count: number; best: number } | null {
    const data = this.load()
    return data.dailyAttempts[date] ?? null
  }

  recordDailyAttempt(date: string, score: number): void {
    const data = this.load()
    const existing = data.dailyAttempts[date]
    if (existing === undefined) {
      data.dailyAttempts[date] = { count: 1, best: score }
    } else {
      existing.count++
      if (score > existing.best) existing.best = score
    }
    this.save(data)
  }

  getSettings(): SettingsV4 {
    return { ...DEFAULT_SETTINGS_V4, ...this.load().settings }
  }

  setSettings(partial: Partial<SettingsV4>): void {
    const data = this.load()
    data.settings = { ...data.settings, ...partial }
    this.save(data)
  }

  getLastMode(): GameMode {
    return this.load().settings.lastMode ?? 'endless'
  }

  setLastMode(mode: GameMode): void {
    const data = this.load()
    data.settings = { ...data.settings, lastMode: mode }
    this.save(data)
  }
}
