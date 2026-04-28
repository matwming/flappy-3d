import { Group, Mesh, BoxGeometry, Material, Box3, Scene } from 'three'

const PIPE_HEIGHT = 6

export class ObstaclePair {
  readonly group: Group
  private topMesh: Mesh<BoxGeometry, Material>
  private bottomMesh: Mesh<BoxGeometry, Material>
  private topBox: Box3 = new Box3()
  private bottomBox: Box3 = new Box3()
  passed = false

  constructor(geometry: BoxGeometry, material: Material, scene: Scene) {
    this.group = new Group()
    this.topMesh = new Mesh(geometry, material)
    this.bottomMesh = new Mesh(geometry, material)
    this.group.add(this.topMesh)
    this.group.add(this.bottomMesh)
    this.group.visible = false
    scene.add(this.group)
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
