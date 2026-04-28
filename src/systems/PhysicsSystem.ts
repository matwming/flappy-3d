import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import { GRAVITY, FLAP_IMPULSE, MAX_FALL_SPEED } from '../constants'
import type { Bird } from '../entities/Bird'

type GameActor = Actor<typeof gameMachine>

export class PhysicsSystem {
  private bird: Bird
  private actor: GameActor
  private flapQueued = false

  constructor(bird: Bird, actor: GameActor) {
    this.bird = bird
    this.actor = actor
  }

  queueFlap(): void {
    this.flapQueued = true
  }

  step(dt: number): void {
    const state = this.actor.getSnapshot().value

    if (state === 'dying') {
      this.bird.mesh.rotation.z += 1.5 * dt
    } else if (state === 'playing' || state === 'title') {
      this.bird.mesh.rotation.z = 0
    }

    if (state !== 'playing' && state !== 'dying') {
      this.bird.syncMesh()
      return
    }

    if (this.flapQueued) {
      this.bird.velocity.y = FLAP_IMPULSE
      this.flapQueued = false
    }

    this.bird.velocity.y += GRAVITY * dt

    if (this.bird.velocity.y < MAX_FALL_SPEED) {
      this.bird.velocity.y = MAX_FALL_SPEED
    }

    this.bird.position.y += this.bird.velocity.y * dt

    this.bird.syncMesh()
  }
}
