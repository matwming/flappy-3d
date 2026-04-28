import { GRAVITY, FLAP_IMPULSE, MAX_FALL_SPEED } from '../constants'
import type { Bird } from '../entities/Bird'

export class PhysicsSystem {
  private bird: Bird
  private flapQueued = false

  constructor(bird: Bird) {
    this.bird = bird
  }

  queueFlap(): void {
    this.flapQueued = true
  }

  step(dt: number): void {
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
