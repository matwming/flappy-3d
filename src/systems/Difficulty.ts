import {
  BASE_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
  BASE_SCROLL_SPEED,
  MAX_SCROLL_SPEED,
  BASE_GAP_HEIGHT,
  MIN_GAP_HEIGHT,
  DIFFICULTY_SCORE_CAP,
  DIFFICULTY_MULTIPLIERS,
} from '../constants'
import type { DifficultyPreset } from '../constants'

export interface DifficultyConfig {
  spawnInterval: number
  scrollSpeed: number
  gapHeight: number
}

export function difficultyFrom(
  score: number,
  preset: DifficultyPreset = 'normal',
): DifficultyConfig {
  const t = Math.min(score, DIFFICULTY_SCORE_CAP) / DIFFICULTY_SCORE_CAP
  const m = DIFFICULTY_MULTIPLIERS[preset]
  return {
    spawnInterval: lerp(BASE_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, t) * m.spawn,
    scrollSpeed: lerp(BASE_SCROLL_SPEED, MAX_SCROLL_SPEED, t) * m.scroll,
    gapHeight: lerp(BASE_GAP_HEIGHT, MIN_GAP_HEIGHT, t) * m.gap,
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
