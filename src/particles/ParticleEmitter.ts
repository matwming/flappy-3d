import {
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Scene,
  Vector3,
  AdditiveBlending,
} from 'three'

interface Particle { age: number; lifespan: number; vx: number; vy: number; vz: number }

export class ParticleEmitter {
  readonly points: Points
  private particles: Particle[]
  private positions: Float32Array
  private active = false

  constructor(scene: Scene, count = 30) {
    this.particles = Array.from({ length: count }, () => ({ age: 0, lifespan: 0.8, vx: 0, vy: 0, vz: 0 }))
    this.positions = new Float32Array(count * 3)

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3))

    const material = new PointsMaterial({
      color: 0xffd166,
      size: 0.18,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    this.points = new Points(geometry, material)
    this.points.visible = false
    scene.add(this.points)
  }

  burst(origin: Vector3): void {
    this.active = true
    this.points.visible = true
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (!p) continue
      p.age = 0
      p.lifespan = 0.6 + Math.random() * 0.4
      p.vx = (Math.random() - 0.5) * 6
      p.vy = (Math.random() - 0.5) * 6 + 1
      p.vz = (Math.random() - 0.5) * 2
      this.positions[i * 3 + 0] = origin.x
      this.positions[i * 3 + 1] = origin.y
      this.positions[i * 3 + 2] = origin.z
    }
    this.markUpdated()
  }

  step(dt: number): void {
    if (!this.active) return
    let anyAlive = false
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (!p) continue
      p.age += dt
      if (p.age >= p.lifespan) continue
      anyAlive = true
      // gravity
      p.vy -= 12 * dt
      this.positions[i * 3 + 0] = (this.positions[i * 3 + 0] ?? 0) + p.vx * dt
      this.positions[i * 3 + 1] = (this.positions[i * 3 + 1] ?? 0) + p.vy * dt
      this.positions[i * 3 + 2] = (this.positions[i * 3 + 2] ?? 0) + p.vz * dt
    }
    this.markUpdated()
    if (!anyAlive) {
      this.active = false
      this.points.visible = false
    }
  }

  private markUpdated(): void {
    const attr = this.points.geometry.getAttribute('position')
    attr.needsUpdate = true
  }
}
