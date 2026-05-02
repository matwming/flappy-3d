import { WebGLRenderer, Scene, PerspectiveCamera, Vector2 } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import {
  BLOOM_STRENGTH,
  BLOOM_RADIUS,
  BLOOM_THRESHOLD,
  VIGNETTE_OFFSET,
  VIGNETTE_DARKNESS,
} from '../constants'

export type QualityTier = 'low' | 'medium' | 'high' | 'auto'

export interface ComposerResult {
  composer: EffectComposer
  render: () => void
}

interface TierConfig {
  enabled: boolean
  bloomScale: number       // multiplied into UnrealBloomPass resolution Vector2 (lower = cheaper)
  bloomStrength: number
  vignette: boolean
}

const TIER_CONFIGS: Record<Exclude<QualityTier, 'auto'>, TierConfig> = {
  low:    { enabled: false, bloomScale: 0,    bloomStrength: 0,                vignette: false },
  medium: { enabled: true,  bloomScale: 0.5,  bloomStrength: BLOOM_STRENGTH * 0.7, vignette: false },
  high:   { enabled: true,  bloomScale: 1.0,  bloomStrength: BLOOM_STRENGTH,   vignette: true  },
}

/** Resolve 'auto' to a concrete tier based on device capability. The previous
 * binary heuristic (mobile or hardwareConcurrency ≤ 4 → off) is preserved as
 * "auto → low/medium" but no longer all-or-nothing for high-end mobile. */
export function resolveTier(t: QualityTier): Exclude<QualityTier, 'auto'> {
  if (t !== 'auto') return t
  const isMobile = /Mobile|Android/i.test(navigator.userAgent)
  const hc = navigator.hardwareConcurrency ?? 0
  if (hc >= 8 && !isMobile) return 'high'
  if (hc >= 4) return 'medium'
  return 'low'
}

export function createComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  signal?: AbortSignal,
  tier: QualityTier = 'auto',
): ComposerResult | null {
  const cfg = TIER_CONFIGS[resolveTier(tier)]
  if (!cfg.enabled) return null

  const w = window.innerWidth
  const h = window.innerHeight

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(
    new UnrealBloomPass(
      new Vector2(w * cfg.bloomScale, h * cfg.bloomScale),
      cfg.bloomStrength,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    ),
  )

  if (cfg.vignette) {
    const vignettePass = new ShaderPass(VignetteShader)
    const offsetUniform = vignettePass.uniforms['offset']
    if (offsetUniform) offsetUniform.value = VIGNETTE_OFFSET
    const darknessUniform = vignettePass.uniforms['darkness']
    if (darknessUniform) darknessUniform.value = VIGNETTE_DARKNESS
    composer.addPass(vignettePass)
  }

  composer.addPass(new OutputPass())

  window.addEventListener('resize', () => {
    composer.setSize(window.innerWidth, window.innerHeight)
  }, { signal })

  return {
    composer,
    render: () => composer.render(),
  }
}
