import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import type { ObjectPool } from '../pools/ObjectPool'
import type { ObstaclePair } from '../entities/ObstaclePair'
import { OBSTACLE_SPAWN_X, GAP_CENTER_RANGE } from '../constants'
import { difficultyFrom } from './Difficulty'

type GameActor = Actor<typeof gameMachine>

export class ObstacleSpawner {
  private readonly pool: ObjectPool<ObstaclePair>
  private readonly actor: GameActor
  private elapsed = 0

  constructor(pool: ObjectPool<ObstaclePair>, actor: GameActor) {
    this.pool = pool
    this.actor = actor
  }

  step(dt: number): void {
    if (this.actor.getSnapshot().value !== 'playing') {
      this.elapsed = 0
      return
    }

    this.elapsed += dt

    const score = this.actor.getSnapshot().context.score
    const difficulty = difficultyFrom(score)

    if (this.elapsed >= difficulty.spawnInterval) {
      this.elapsed = 0
      const pair = this.pool.acquire()
      if (pair === null) return
      const gapCenterY = (Math.random() * 2 - 1) * GAP_CENTER_RANGE
      pair.reset(OBSTACLE_SPAWN_X, gapCenterY, difficulty.gapHeight)
    }
  }
}
