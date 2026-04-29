import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Color,
  DirectionalLight,
  HemisphereLight,
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from 'three'

export function createRenderer(signal?: AbortSignal): {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
} {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')
  if (!canvas) {
    throw new Error('Canvas #scene not found')
  }

  canvas.style.touchAction = 'none'

  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = false

  const scene = new Scene()
  scene.background = new Color(0x87ceeb)

  const camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  )
  camera.position.set(0, 0, 8)

  const keyLight = new DirectionalLight(0xffffff, 2.5)
  keyLight.position.set(3, 5, 4)
  keyLight.castShadow = false
  scene.add(keyLight)

  const fillLight = new HemisphereLight(0x87ceeb, 0x444444, 0.8)
  scene.add(fillLight)

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }, { signal })

  return { renderer, scene, camera }
}
