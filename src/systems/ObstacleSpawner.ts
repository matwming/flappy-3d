import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import type { ObjectPool } from '../pools/ObjectPool'
import type { ObstaclePair } from '../entities/ObstaclePair'
import { OBSTACLE_SPAWN_X, GAP_CENTER_RANGE, PIPE_COLOR_CYCLE } from '../constants'
import { difficultyFrom } from './Difficulty'
import type { DifficultyConfig } from './Difficulty'

const TITLE_DEMO_DIFFICULTY: DifficultyConfig = {
  spawnInterval: 2.2,  // seconds — slower cadence, fewer pipes on screen
  scrollSpeed: 1.8,    // matches TITLE_DEMO_SCROLL_SPEED in ScrollSystem
  gapHeight: 3.2,      // wider than gameplay BASE_GAP_HEIGHT (2.6) — easy/relaxed
}

type GameActor = Actor<typeof gameMachine>

export class ObstacleSpawner {
  private readonly pool: ObjectPool<ObstaclePair>
  private readonly actor: GameActor
  private elapsed = 0
  private spawnIndex = 0
  private colorblindMode = false

  constructor(pool: ObjectPool<ObstaclePair>, actor: GameActor) {
    this.pool = pool
    this.actor = actor
  }

  resetColorIndex(): void {
    this.spawnIndex = 0
  }

  setColorblindMode(on: boolean): void {
    this.colorblindMode = on
  }

  // actor.send audit (Phase 5 D-08): this system is read-only (getSnapshot only).
  // No actor.send guard required.
  step(dt: number): void {
    const state = this.actor.getSnapshot().value
    const isTitleDemo = state === 'title'

    if (!isTitleDemo && state !== 'playing') {
      this.elapsed = 0
      return
    }

    this.elapsed += dt

    const difficulty: DifficultyConfig = isTitleDemo
      ? TITLE_DEMO_DIFFICULTY
      : difficultyFrom(this.actor.getSnapshot().context.score)

    if (this.elapsed >= difficulty.spawnInterval) {
      this.elapsed = 0
      const pair = this.pool.acquire()
      if (pair === null) return
      const gapCenterY = (Math.random() * 2 - 1) * GAP_CENTER_RANGE
      pair.reset(OBSTACLE_SPAWN_X, gapCenterY, difficulty.gapHeight)
      // Color cycling (BEAUTY-08): skip when colorblind palette active (D-19)
      if (!this.colorblindMode) {
        const color = PIPE_COLOR_CYCLE[this.spawnIndex % PIPE_COLOR_CYCLE.length]
        if (color !== undefined) pair.setColor(color)
      }
      this.spawnIndex++
    }
  }
}
