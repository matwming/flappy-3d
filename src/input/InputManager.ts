export class InputManager {
  private controller = new AbortController()
  private flapCallbacks: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement) {
    const { signal } = this.controller

    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === ' ') {
          e.preventDefault()
          this.triggerFlap()
        }
      },
      { signal },
    )

    canvas.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        if (!e.isPrimary) return
        this.triggerFlap()
      },
      { signal },
    )
  }

  onFlap(cb: () => void): void {
    this.flapCallbacks.push(cb)
  }

  destroy(): void {
    this.controller.abort()
    this.flapCallbacks = []
  }

  private triggerFlap(): void {
    for (const cb of this.flapCallbacks) {
      cb()
    }
  }
}
