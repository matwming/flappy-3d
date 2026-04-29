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

export interface ComposerResult {
  composer: EffectComposer
  render: () => void
}

export function createComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  signal?: AbortSignal,
): ComposerResult | null {
  const isLowTier =
    navigator.hardwareConcurrency <= 4 ||
    /Mobile|Android/i.test(navigator.userAgent)

  if (isLowTier) {
    return null
  }

  const w = window.innerWidth
  const h = window.innerHeight

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(
    new UnrealBloomPass(
      new Vector2(w, h),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    ),
  )

  const vignettePass = new ShaderPass(VignetteShader)
  const offsetUniform = vignettePass.uniforms['offset']
  if (offsetUniform) offsetUniform.value = VIGNETTE_OFFSET
  const darknessUniform = vignettePass.uniforms['darkness']
  if (darknessUniform) darknessUniform.value = VIGNETTE_DARKNESS
  composer.addPass(vignettePass)

  composer.addPass(new OutputPass())

  window.addEventListener('resize', () => {
    composer.setSize(window.innerWidth, window.innerHeight)
  }, { signal })

  return {
    composer,
    render: () => composer.render(),
  }
}
