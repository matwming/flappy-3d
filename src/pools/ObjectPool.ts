export class ObjectPool<T> {
  private readonly free: T[] = []
  private readonly active: T[] = []

  constructor(factory: () => T, size: number) {
    for (let i = 0; i < size; i++) {
      this.free.push(factory())
    }
  }

  acquire(): T | null {
    const item = this.free.pop()
    if (item === undefined) return null
    this.active.push(item)
    return item
  }

  release(item: T): void {
    const idx = this.active.indexOf(item)
    if (idx === -1) return
    this.active.splice(idx, 1)
    this.free.push(item)
  }

  forEachActive(cb: (item: T) => void): void {
    for (const item of this.active) {
      cb(item)
    }
  }
}
