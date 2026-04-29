import { Group, Mesh, BoxGeometry, Material, MeshToonMaterial, Box3, Scene } from 'three'

const PIPE_HEIGHT = 6

export class ObstaclePair {
  readonly group: Group
  private topMesh: Mesh<BoxGeometry, MeshToonMaterial>
  private bottomMesh: Mesh<BoxGeometry, MeshToonMaterial>
  private topBox: Box3 = new Box3()
  private bottomBox: Box3 = new Box3()
  private readonly pairMaterial: MeshToonMaterial
  passed = false

  constructor(geometry: BoxGeometry, material: Material, scene: Scene) {
    this.group = new Group()
    // Clone per-pair so setColor() affects only this pair's meshes (D-17)
    this.pairMaterial = (material as MeshToonMaterial).clone()
    this.topMesh = new Mesh(geometry, this.pairMaterial)
    this.bottomMesh = new Mesh(geometry, this.pairMaterial)
    this.group.add(this.topMesh)
    this.group.add(this.bottomMesh)
    this.group.visible = false
    scene.add(this.group)
  }

  setColor(colorHex: number): void {
    this.pairMaterial.color.set(colorHex)
  }

  reset(x: number, gapCenterY: number, gapHeight: number): void {
    this.passed = false
    this.group.visible = true
    this.group.position.x = x
    this.topMesh.position.y = gapCenterY + gapHeight / 2 + PIPE_HEIGHT / 2
    this.bottomMesh.position.y = gapCenterY - gapHeight / 2 - PIPE_HEIGHT / 2
  }

  getAABBs(): [Box3, Box3] {
    this.topBox.setFromObject(this.topMesh)
    this.bottomBox.setFromObject(this.bottomMesh)
    return [this.topBox, this.bottomBox]
  }

  hide(): void {
    this.group.visible = false
  }
}
