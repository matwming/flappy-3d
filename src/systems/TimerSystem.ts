import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'

type GameActor = Actor<typeof gameMachine>

const TIMER_DURATION = 60 // seconds

export class TimerSystem {
  private actor: GameActor
  timeRemaining: number = TIMER_DURATION
  private hasFired: boolean = false

  constructor(actor: GameActor) {
    this.actor = actor
  }

  reset(): void {
    this.timeRemaining = TIMER_DURATION
    this.hasFired = false
  }

  step(dt: number): void {
    const snap = this.actor.getSnapshot()
    if (snap.value !== 'playing') return
    if (snap.context.mode !== 'timeAttack') return

    if (this.timeRemaining > 0) {
      this.timeRemaining -= dt
      if (this.timeRemaining < 0) this.timeRemaining = 0
    }

    if (this.timeRemaining <= 0 && !this.hasFired) {
      this.hasFired = true
      if (this.actor.getSnapshot().status === 'active') {
        this.actor.send({ type: 'TIME_UP' })
      }
    }
  }
}
