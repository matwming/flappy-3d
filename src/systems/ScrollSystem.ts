import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import type { ObjectPool } from '../pools/ObjectPool'
import type { ObstaclePair } from '../entities/ObstaclePair'
import type { Background } from '../entities/Background'
import { OBSTACLE_DESPAWN_X } from '../constants'
import { difficultyFrom } from './Difficulty'

const TITLE_DEMO_SCROLL_SPEED = 1.8  // world units/sec — visually pleasant, slower than gameplay

type GameActor = Actor<typeof gameMachine>

export class ScrollSystem {
  private readonly pool: ObjectPool<ObstaclePair>
  private readonly actor: GameActor
  private readonly background: Background | null

  constructor(
    pool: ObjectPool<ObstaclePair>,
    actor: GameActor,
    background: Background | null = null,
  ) {
    this.pool = pool
    this.actor = actor
    this.background = background
  }

  // actor.send audit (Phase 5): read-only — no send calls
  step(dt: number): void {
    const state = this.actor.getSnapshot().value
    const isTitleDemo = state === 'title'
    if (!isTitleDemo && state !== 'playing' && state !== 'dying') return

    const score = this.actor.getSnapshot().context.score
    const scrollSpeed = isTitleDemo
      ? TITLE_DEMO_SCROLL_SPEED  // slower, more relaxed feel
      : difficultyFrom(score).scrollSpeed

    const toRelease: ObstaclePair[] = []
    this.pool.forEachActive((pair) => {
      pair.group.position.x -= scrollSpeed * dt
      if (pair.group.position.x < OBSTACLE_DESPAWN_X) {
        pair.hide()
        toRelease.push(pair)
      }
    })
    for (const p of toRelease) this.pool.release(p)

    if (this.background !== null) {
      this.background.scroll(dt, scrollSpeed)
    }
  }
}
