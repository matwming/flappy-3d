import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import { WORLD_FLOOR_Y } from '../constants'
import type { Bird } from '../entities/Bird'
import type { ObjectPool } from '../pools/ObjectPool'
import type { ObstaclePair } from '../entities/ObstaclePair'

type GameActor = Actor<typeof gameMachine>

export class CollisionSystem {
  private bird: Bird
  private pool: ObjectPool<ObstaclePair>
  private actor: GameActor

  constructor(bird: Bird, pool: ObjectPool<ObstaclePair>, actor: GameActor) {
    this.bird = bird
    this.pool = pool
    this.actor = actor
  }

  step(_dt: number): void {
    if (this.actor.getSnapshot().value !== 'playing') return

    const birdBox = this.bird.getBoundingBox()
    const pos = this.bird.position

    if (pos.y < WORLD_FLOOR_Y) {
      this.hit()
      return
    }

    let collided = false
    this.pool.forEachActive((pair) => {
      if (collided) return
      const [topBox, bottomBox] = pair.getAABBs()
      if (birdBox.intersectsBox(topBox) || birdBox.intersectsBox(bottomBox)) {
        collided = true
      }
    })

    if (collided) {
      this.hit()
    }
  }

  private hit(): void {
    if (this.actor.getSnapshot().status !== 'active') return
    this.actor.send({ type: 'HIT' })
  }
}
