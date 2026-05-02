import { WebGLRenderer, Scene, PerspectiveCamera } from 'three'
import { FIXED_DT, DT_CLAMP_MAX } from '../constants'

interface UpdatableSystem {
  step(dt: number): void
}

type Interpolator = (alpha: number) => void

export class GameLoop {
  private renderer: WebGLRenderer
  private scene: Scene
  private camera: PerspectiveCamera
  private systems: UpdatableSystem[] = []
  private interpolators: Interpolator[] = []
  private accumulator = 0
  private lastTime = 0
  private renderFn: () => void

  constructor(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.renderFn = () => this.renderer.render(this.scene, this.camera)
  }

  add(system: UpdatableSystem): void {
    this.systems.push(system)
  }

  /** Phase 18: register a per-frame interpolation hook that runs AFTER all
   * fixed-step updates and BEFORE render. Receives `alpha = accumulator / FIXED_DT`
   * in [0, 1) — the fractional progress toward the next fixed step. Use to
   * lerp(prev, curr, alpha) for visually smooth motion on >60Hz displays. */
  addInterpolator(fn: Interpolator): void {
    this.interpolators.push(fn)
  }

  setRenderFn(fn: () => void): void {
    this.renderFn = fn
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

    const alpha = this.accumulator / FIXED_DT
    for (const interp of this.interpolators) interp(alpha)

    this.renderFn()
  }
}
