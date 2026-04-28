import type { Scene } from 'three'
import { ParticleEmitter } from './ParticleEmitter'

export interface ParticleSystemAdapter {
  burst(origin: { x: number; y: number; z: number }): void
  step(dt: number): void
}

export function createParticles(scene: Scene): ParticleSystemAdapter {
  // Using bespoke fallback — three.quarks integration deferred to a future polish pass.
  // Bespoke fallback is ~80 lines and zero dependency risk; sufficient for single-fire
  // death burst aesthetic. Saves ~42KB gzipped vs three.quarks.
  return new ParticleEmitter(scene, 30)
}
