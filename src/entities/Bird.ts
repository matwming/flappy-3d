import {
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  Vector3,
  Box3,
  Scene,
} from 'three'

export class Bird {
  readonly mesh: Mesh<SphereGeometry, MeshStandardMaterial>
  readonly position: Vector3 = new Vector3(0, 0, 0)
  readonly velocity: Vector3 = new Vector3(0, 0, 0)
  private readonly boundingBox: Box3 = new Box3()

  constructor(scene: Scene) {
    const geo = new SphereGeometry(0.35, 16, 10)
    const mat = new MeshStandardMaterial({ color: 0xff7043 })
    this.mesh = new Mesh(geo, mat)
    this.mesh.scale.set(1, 0.65, 0.8)
    scene.add(this.mesh)
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
  }
}
