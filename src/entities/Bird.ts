import {
  Mesh,
  SphereGeometry,
  BoxGeometry,
  ConeGeometry,
  PlaneGeometry,
  BufferGeometry,
  MeshStandardMaterial,
  MeshToonMaterial,
  MeshBasicMaterial,
  Material,
  Texture,
  CanvasTexture,
  SRGBColorSpace,
  Vector3,
  Box3,
  Scene,
  DoubleSide,
} from 'three'
import type { BirdShape } from '../storage/StorageManager'

const GHOST_COUNT = 3
const GHOST_OPACITIES = [0.6, 0.4, 0.2] as const
const GHOST_SCALES = [0.95, 0.90, 0.85] as const
const GHOST_FADE_SPEED = 1 / 0.18 // opacity → 0 in 180ms

const GEOMETRIC_SHAPES: ReadonlySet<BirdShape> = new Set(['sphere', 'cube', 'pyramid'])
const EMOJI_FOR_SHAPE: Record<string, string> = {
  bird: '🐦',
  cat:  '🐱',
  dog:  '🐶',
  frog: '🐸',
}

export class Bird {
  readonly mesh: Mesh<BufferGeometry, Material>
  readonly leftWing: Mesh<BoxGeometry, MeshToonMaterial>
  readonly rightWing: Mesh<BoxGeometry, MeshToonMaterial>
  readonly position: Vector3 = new Vector3(0, 0, 0)
  readonly velocity: Vector3 = new Vector3(0, 0, 0)
  private readonly boundingBox: Box3 = new Box3()
  private ghosts: Mesh<SphereGeometry, MeshBasicMaterial>[] = []
  private ghostHead = 0  // ring buffer head index

  // Phase 17: shape + image swapping
  private currentShape: BirdShape = 'sphere'
  private currentImage: string | null = null
  private baseMaterial: Material | null = null  // toon (rim-lit) — restore after image clear
  private imageMaterial: MeshBasicMaterial | null = null
  private imageTexture: Texture | null = null

  constructor(scene: Scene) {
    const geo = new SphereGeometry(0.35, 16, 10)
    const mat: Material = new MeshStandardMaterial({ color: 0xff7043 })
    this.mesh = new Mesh(geo, mat)
    this.mesh.scale.set(1, 0.65, 0.8)
    scene.add(this.mesh)

    // Wing meshes — thin boxes, children of bird.mesh so they inherit squashStretch
    const wingGeo = new BoxGeometry(0.6, 0.05, 0.3)
    const wingMat = new MeshToonMaterial({ color: 0xff7043, side: DoubleSide })
    this.leftWing = new Mesh(wingGeo, wingMat)
    this.leftWing.position.set(-0.4, 0, 0)
    this.mesh.add(this.leftWing)

    this.rightWing = new Mesh(wingGeo, wingMat.clone())
    this.rightWing.position.set(0.4, 0, 0)
    this.mesh.add(this.rightWing)

    // Pre-create ghost meshes (flap trail — BEAUTY-06, D-09)
    const ghostGeo = new SphereGeometry(0.35, 8, 6)  // lower poly — they're ephemeral
    for (let i = 0; i < GHOST_COUNT; i++) {
      const ghostMat = new MeshBasicMaterial({
        color: 0xff7043,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const ghost = new Mesh(ghostGeo, ghostMat)
      const s = GHOST_SCALES[i] ?? 0.85
      ghost.scale.set(s, s * 0.65, s * 0.8)
      ghost.visible = false
      scene.add(ghost)
      this.ghosts.push(ghost)
    }
  }

  /** Phase 17: register the toon (rim-lit) material as the body's "base" so we
   * can restore it after the user clears their custom image. main.ts calls
   * this after assigning bird.mesh.material = birdMaterial. */
  setBaseMaterial(mat: Material): void {
    this.baseMaterial = mat
    if (this.currentImage === null && GEOMETRIC_SHAPES.has(this.currentShape)) {
      this.mesh.material = mat
    }
  }

  /** Swap body to a different shape preset. Geometric shapes use the toon
   * (rim-lit) base material; emoji shapes use a CanvasTexture-on-plane.
   * No-op if a custom uploaded image is currently overriding the body. */
  setShape(shape: BirdShape): void {
    this.currentShape = shape
    if (this.currentImage !== null) return  // uploaded image wins; will apply on clear
    this.applyShape()
  }

  private applyShape(): void {
    this.mesh.geometry.dispose()
    this.disposeImageResources()

    if (GEOMETRIC_SHAPES.has(this.currentShape)) {
      this.mesh.geometry = createShapeGeometry(this.currentShape)
      this.mesh.scale.set(1, 0.65, 0.8)  // squash silhouette
      if (this.baseMaterial !== null) this.mesh.material = this.baseMaterial
      this.leftWing.visible = true
      this.rightWing.visible = true
    } else {
      // Emoji animal preset → flat plane with rendered emoji texture
      const emoji = EMOJI_FOR_SHAPE[this.currentShape]
      if (emoji === undefined) return
      this.mesh.geometry = new PlaneGeometry(0.9, 0.9)
      this.mesh.scale.set(1, 1, 1)
      const tex = createEmojiCanvasTexture(emoji, 256)
      this.imageTexture = tex
      this.imageMaterial = new MeshBasicMaterial({ map: tex, transparent: true })
      this.mesh.material = this.imageMaterial
      this.leftWing.visible = false
      this.rightWing.visible = false
    }
  }

  /** Apply a user-uploaded image as the body texture. Pass null to clear
   * (restores the currently selected shape). */
  setImage(dataURL: string | null): void {
    this.currentImage = dataURL
    if (dataURL === null) {
      this.applyShape()
      return
    }

    // Image mode — flat plane with the uploaded image as a CanvasTexture.
    // Why CanvasTexture (not TextureLoader): TextureLoader.load is async and
    // returns a Texture with no image yet — on iOS Safari we observed the
    // texture sometimes never finished uploading from a data URL. Drawing
    // through HTMLImageElement → canvas → CanvasTexture is more robust.
    this.mesh.geometry.dispose()
    this.mesh.geometry = new PlaneGeometry(0.9, 0.9)
    this.mesh.scale.set(1, 1, 1)
    this.disposeImageResources()
    this.leftWing.visible = false
    this.rightWing.visible = false

    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (ctx === null) return
    // Show a transparent placeholder until the image loads
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    this.imageTexture = tex
    this.imageMaterial = new MeshBasicMaterial({ map: tex, transparent: true })
    this.mesh.material = this.imageMaterial

    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      tex.needsUpdate = true
    }
    img.onerror = () => {
      // Leave the placeholder transparent if decode fails
    }
    img.src = dataURL
  }

  private disposeImageResources(): void {
    if (this.imageTexture !== null) {
      this.imageTexture.dispose()
      this.imageTexture = null
    }
    if (this.imageMaterial !== null) {
      this.imageMaterial.dispose()
      this.imageMaterial = null
    }
  }

  // Called on each flap — snapshots current bird world position into next ghost slot
  snapshotGhost(): void {
    const idx = this.ghostHead % GHOST_COUNT
    const ghost = this.ghosts[idx]
    if (!ghost) return
    ghost.position.copy(this.mesh.position)
    ghost.material.opacity = GHOST_OPACITIES[idx] ?? 0.2
    ghost.visible = true
    this.ghostHead = (this.ghostHead + 1) % GHOST_COUNT
  }

  // Called every frame from main game loop to fade ghosts
  stepGhosts(dt: number): void {
    for (const ghost of this.ghosts) {
      if (!ghost.visible) continue
      ghost.material.opacity -= GHOST_FADE_SPEED * dt
      if (ghost.material.opacity <= 0) {
        ghost.material.opacity = 0
        ghost.visible = false
      }
    }
  }

  // Called on roundStarted — hide all ghosts and reset ring buffer
  resetGhosts(): void {
    this.ghostHead = 0
    for (const ghost of this.ghosts) {
      ghost.visible = false
      ghost.material.opacity = 0
    }
  }

  getBoundingBox(): Box3 {
    this.boundingBox.setFromObject(this.mesh)
    return this.boundingBox
  }

  syncMesh(): void {
    this.mesh.position.copy(this.position)
  }

  dispose(scene: Scene): void {
    scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.disposeImageResources()
    // Wings are children of mesh (removed above); dispose their GPU resources
    this.leftWing.geometry.dispose()
    this.leftWing.material.dispose()
    this.rightWing.geometry.dispose()
    this.rightWing.material.dispose()
    for (const ghost of this.ghosts) {
      scene.remove(ghost)
      ghost.geometry.dispose()
      ghost.material.dispose()
    }
  }
}

function createShapeGeometry(shape: BirdShape): BufferGeometry {
  switch (shape) {
    case 'sphere':  return new SphereGeometry(0.35, 16, 10)
    case 'cube':    return new BoxGeometry(0.55, 0.55, 0.55)
    case 'pyramid': return new ConeGeometry(0.4, 0.7, 4)  // 4-sided cone = pyramid
    default:        return new SphereGeometry(0.35, 16, 10)  // fallback for emoji shapes (caller uses plane)
  }
}

/** Render a single emoji centered on a transparent square canvas, return as
 * a CanvasTexture for use as a Three.js material map. Synchronous — the canvas
 * exists immediately, so the GPU upload happens on next render. */
function createEmojiCanvasTexture(emoji: string, size: number): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx !== null) {
    ctx.font = `${size * 0.85}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, size / 2, size / 2)
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}
