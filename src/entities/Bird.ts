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
  TextureLoader,
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
    if (this.currentImage === null) {
      this.mesh.material = mat
    }
  }

  /** Phase 17: swap body geometry to a different shape preset. No-op if
   * an image is currently overriding the body. Default scale (squash-stretch)
   * is preserved. */
  setShape(shape: BirdShape): void {
    this.currentShape = shape
    if (this.currentImage !== null) return  // image-mode wins; will apply on clear
    this.applyShapeGeometry()
  }

  private applyShapeGeometry(): void {
    this.mesh.geometry.dispose()
    this.mesh.geometry = createShapeGeometry(this.currentShape)
    this.mesh.scale.set(1, 0.65, 0.8)  // restore default squash silhouette
  }

  /** Phase 17: when dataURL is provided, replace body with a textured plane
   * (so the image displays crisply); when null, restore selected shape +
   * toon material. Wings hide in image-mode (they make less sense framing
   * a personal photo). */
  setImage(dataURL: string | null): void {
    this.currentImage = dataURL
    if (dataURL === null) {
      this.applyShapeGeometry()
      if (this.baseMaterial !== null) this.mesh.material = this.baseMaterial
      this.disposeImageResources()
      this.leftWing.visible = true
      this.rightWing.visible = true
      return
    }

    // Image mode: PlaneGeometry + MeshBasicMaterial(map)
    this.mesh.geometry.dispose()
    this.mesh.geometry = new PlaneGeometry(0.8, 0.8)
    this.mesh.scale.set(1, 1, 1)  // no squash on a textured plane

    this.disposeImageResources()
    const tex = new TextureLoader().load(dataURL)
    tex.colorSpace = SRGBColorSpace
    this.imageTexture = tex
    this.imageMaterial = new MeshBasicMaterial({ map: tex, transparent: true })
    this.mesh.material = this.imageMaterial

    this.leftWing.visible = false
    this.rightWing.visible = false
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
  }
}
