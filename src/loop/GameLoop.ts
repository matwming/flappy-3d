import { WebGLRenderer, Scene, PerspectiveCamera } from 'three'
import { FIXED_DT, DT_CLAMP_MAX } from '../constants'

interface UpdatableSystem {
  step(dt: number): void
}

export class GameLoop {
  private renderer: WebGLRenderer
  private scene: Scene
  private camera: PerspectiveCamera
  private systems: UpdatableSystem[] = []
  private accumulator = 0
  private lastTime = 0

  constructor(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
  }

  add(system: UpdatableSystem): void {
    this.systems.push(system)
  }

  start(): void {
    this.lastTime = 0
    this.accumulator = 0
    this.renderer.setAnimationLoop((now: number) => this.tick(now))
  }

  stop(): void {
    this.renderer.setAnimationLoop(null)
  }

  private tick(now: number): void {
    const rawDt = this.lastTime === 0 ? 0 : (now - this.lastTime) / 1000
    this.lastTime = now
    const dt = Math.min(rawDt, DT_CLAMP_MAX)

    this.accumulator += dt

    while (this.accumulator >= FIXED_DT) {
      for (const system of this.systems) {
        system.step(FIXED_DT)
      }
      this.accumulator -= FIXED_DT
    }

    this.renderer.render(this.scene, this.camera)
  }
}
