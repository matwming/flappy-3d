import { gsap } from 'gsap'
import type { Object3D } from 'three'

// Squash-and-stretch on flap (D-23 / ANIM-02)
export function squashStretch(target: Object3D): void {
  gsap.to(target.scale, {
    x: 1.15, y: 1.4, z: 1.15,
    duration: 0.04,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1,
    overwrite: true,
  })
}

// Screen shake on death (D-24 / ANIM-04)
export function screenShake(camera: Object3D, baseX = 0, baseY = 0): void {
  const tl = gsap.timeline({
    onComplete: () => camera.position.set(baseX, baseY, camera.position.z),
  })
  // 5 keyframes x ~50ms = ~250ms total, decaying amplitude
  const offsets = [
    { x: 0.30, y: 0.20, dur: 0.05 },
    { x: -0.55, y: -0.35, dur: 0.05 },
    { x: 0.40, y: 0.25, dur: 0.05 },
    { x: -0.20, y: -0.15, dur: 0.05 },
    { x: 0.00, y: 0.00, dur: 0.05 },
  ]
  for (const o of offsets) {
    tl.to(camera.position, { x: baseX + o.x, y: baseY + o.y, duration: o.dur, ease: 'power1.inOut' })
  }
}

// Score pop CSS class trigger (D-25 / ANIM-03)
export function scorePop(el: HTMLElement | null): void {
  if (!el) return
  el.classList.remove('score-pop')
  // force reflow
  void el.offsetWidth
  el.classList.add('score-pop')
}
