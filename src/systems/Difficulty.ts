import {
  BASE_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
  BASE_SCROLL_SPEED,
  MAX_SCROLL_SPEED,
  BASE_GAP_HEIGHT,
  MIN_GAP_HEIGHT,
  DIFFICULTY_SCORE_CAP,
} from '../constants'

export interface DifficultyConfig {
  spawnInterval: number
  scrollSpeed: number
  gapHeight: number
}

export function difficultyFrom(score: number): DifficultyConfig {
  const t = Math.min(score, DIFFICULTY_SCORE_CAP) / DIFFICULTY_SCORE_CAP
  return {
    spawnInterval: lerp(BASE_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, t),
    scrollSpeed: lerp(BASE_SCROLL_SPEED, MAX_SCROLL_SPEED, t),
    gapHeight: lerp(BASE_GAP_HEIGHT, MIN_GAP_HEIGHT, t),
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
