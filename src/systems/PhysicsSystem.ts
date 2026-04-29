import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import { GRAVITY, FLAP_IMPULSE, MAX_FALL_SPEED, WORLD_CEILING_Y } from '../constants'
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

  // actor.send audit (Phase 5): read-only — no send calls
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

    // Clamp at ceiling — flapping into the sky shouldn't kill (only the floor does).
    // Original Flappy Bird treated the top of the screen as a soft cap, not a death.
    if (this.bird.position.y > WORLD_CEILING_Y) {
      this.bird.position.y = WORLD_CEILING_Y
      this.bird.velocity.y = 0
    }

    this.bird.syncMesh()
  }
}
