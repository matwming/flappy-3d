import {
  Group,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  MeshBasicMaterial,
  CylinderGeometry,
  ConeGeometry,
  Scene,
} from 'three'
import { SKY_KEYFRAMES, SKY_CYCLE_DURATION_S } from '../constants'

const MOUNTAIN_COLOR = 0x4a5568
const TREE_FOLIAGE_COLOR = 0x2d5a27
const TREE_TRUNK_COLOR = 0x4a3527

const SKY_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SKY_FRAGMENT = `
uniform vec3 uTopColor;
uniform vec3 uBottomColor;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(mix(uBottomColor, uTopColor, vUv.y), 1.0);
}
`

export class Background {
  private skyMesh: Mesh<PlaneGeometry, ShaderMaterial>
  private mountainGroup: Group
  private treeGroup: Group
  private cycleElapsed: number = 0

  constructor(scene: Scene) {
    this.skyMesh = this.createSky()
    this.mountainGroup = this.createMountains()
    this.treeGroup = this.createTrees()

    scene.add(this.skyMesh)
    scene.add(this.mountainGroup)
    scene.add(this.treeGroup)
  }

  scroll(dt: number, obstacleScrollSpeed: number): void {
    this.mountainGroup.position.x -= obstacleScrollSpeed * 0.25 * dt
    this.treeGroup.position.x -= obstacleScrollSpeed * 0.6 * dt

    if (this.mountainGroup.position.x < -20) this.mountainGroup.position.x += 20
    if (this.treeGroup.position.x < -20) this.treeGroup.position.x += 20
  }

  // ATMOS-03 / ATMOS-04: lerp sky shader colors over a continuous cycle.
  // Skips when reduced-motion is active — sky holds whatever color it last had.
  cycleSky(dt: number, isReducedMotion: boolean): void {
    if (isReducedMotion) return
    this.cycleElapsed = (this.cycleElapsed + dt) % SKY_CYCLE_DURATION_S
    const segmentDuration = SKY_CYCLE_DURATION_S / SKY_KEYFRAMES.length
    const idx = Math.floor(this.cycleElapsed / segmentDuration)
    const t = (this.cycleElapsed % segmentDuration) / segmentDuration
    const cur = SKY_KEYFRAMES[idx]!
    const nxt = SKY_KEYFRAMES[(idx + 1) % SKY_KEYFRAMES.length]!
    this.skyMesh.material.uniforms.uTopColor!.value.lerpColors(cur.top, nxt.top, t)
    this.skyMesh.material.uniforms.uBottomColor!.value.lerpColors(cur.bottom, nxt.bottom, t)
  }

  resetSkyCycle(): void {
    this.cycleElapsed = 0
    const k0 = SKY_KEYFRAMES[0]!
    this.skyMesh.material.uniforms.uTopColor!.value.copy(k0.top)
    this.skyMesh.material.uniforms.uBottomColor!.value.copy(k0.bottom)
  }

  private createSky(): Mesh<PlaneGeometry, ShaderMaterial> {
    const geometry = new PlaneGeometry(40, 30)
    const k0 = SKY_KEYFRAMES[0]!
    const material = new ShaderMaterial({
      uniforms: {
        uTopColor: { value: k0.top.clone() },
        uBottomColor: { value: k0.bottom.clone() },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      depthWrite: false,
    })
    const mesh = new Mesh(geometry, material)
    mesh.position.set(0, 0, -10)
    return mesh
  }

  private createMountains(): Group {
    const group = new Group()

    const positions: number[] = []
    const peakCount = 6
    const baseY = -2.5
    const peakWidth = 4.5
    for (let i = 0; i < peakCount; i++) {
      const cx = -15 + i * 6
      const height = 2.5 + Math.random() * 1.5
      positions.push(cx - peakWidth / 2, baseY, 0)
      positions.push(cx, baseY + height, 0)
      positions.push(cx + peakWidth / 2, baseY, 0)
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.computeVertexNormals()

    const material = new MeshBasicMaterial({
      color: MOUNTAIN_COLOR,
      depthWrite: false,
    })
    const mesh = new Mesh(geometry, material)
    mesh.position.z = -7
    group.add(mesh)

    return group
  }

  private createTrees(): Group {
    const group = new Group()

    const trunkGeometry = new CylinderGeometry(0.08, 0.08, 0.8, 5)
    const foliageGeometry = new ConeGeometry(0.4, 1.5, 5)
    const trunkMaterial = new MeshBasicMaterial({ color: TREE_TRUNK_COLOR })
    const foliageMaterial = new MeshBasicMaterial({ color: TREE_FOLIAGE_COLOR })

    const treeCount = 8
    for (let i = 0; i < treeCount; i++) {
      const x = -12 + i * 3.2
      const yOffset = Math.random() * 0.3

      const trunk = new Mesh(trunkGeometry, trunkMaterial)
      trunk.position.set(x, -3.4 + yOffset, -4)

      const foliage = new Mesh(foliageGeometry, foliageMaterial)
      foliage.position.set(x, -2.3 + yOffset, -4)

      group.add(trunk)
      group.add(foliage)
    }

    return group
  }
}
