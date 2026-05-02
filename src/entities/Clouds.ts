import { PlaneGeometry, MeshBasicMaterial, Mesh, TextureLoader, Scene } from 'three'

const CLOUD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><path d="M40,80 Q20,80 20,60 Q20,40 50,40 Q60,20 90,30 Q120,10 150,40 Q180,40 180,60 Q180,80 160,80 Z" fill="#ffffff" opacity="0.95"/></svg>`
const CLOUD_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(CLOUD_SVG)}`

const COUNT = 5
const CLOUD_Z = -7
const SPAWN_X = 20
const DESPAWN_X = -20

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export class Clouds {
  private meshes: Mesh[]

  constructor(scene: Scene) {
    const geometry = new PlaneGeometry(2.5, 1.25)
    const texture = new TextureLoader().load(CLOUD_DATA_URL)
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
    })

    this.meshes = []
    for (let i = 0; i < COUNT; i++) {
      const mesh = new Mesh(geometry, material)
      mesh.position.z = CLOUD_Z
      this.meshes.push(mesh)
      scene.add(mesh)
    }

    this.reset()
  }

  step(dt: number, scrollSpeed: number): void {
    for (const mesh of this.meshes) {
      mesh.position.x -= scrollSpeed * 0.5 * dt
      if (mesh.position.x < DESPAWN_X) {
        mesh.position.x = SPAWN_X
        mesh.position.y = randRange(1.5, 3.5)
        const s = randRange(0.7, 1.3)
        mesh.scale.set(s, s, 1)
      }
    }
  }

  reset(): void {
    for (const mesh of this.meshes) {
      mesh.position.x = randRange(-15, 15)
      mesh.position.y = randRange(1.5, 3.5)
      const s = randRange(0.7, 1.3)
      mesh.scale.set(s, s, 1)
    }
  }
}
