import {
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  Box3,
  Scene,
  Vector3,
} from 'three'
import { WORLD_FLOOR_Y, WORLD_CEILING_Y } from '../constants'
import type { Bird } from '../entities/Bird'
import type { GameLoop } from '../loop/GameLoop'

export class CollisionSystem {
  private bird: Bird
  private loop: GameLoop
  private obstacleBox: Box3
  private obstacleMesh: Mesh<BoxGeometry, MeshStandardMaterial>
  private dead = false

  constructor(bird: Bird, loop: GameLoop, scene: Scene) {
    this.bird = bird
    this.loop = loop

    const geo = new BoxGeometry(0.6, 1.5, 0.6)
    const mat = new MeshStandardMaterial({ color: 0xff5722, wireframe: false })
    this.obstacleMesh = new Mesh(geo, mat)
    this.obstacleMesh.position.set(2, 0, 0)
    scene.add(this.obstacleMesh)

    this.obstacleBox = new Box3().setFromObject(this.obstacleMesh)
  }

  step(_dt: number): void {
    if (this.dead) return

    const birdBox = this.bird.getBoundingBox()
    const pos = this.bird.position
    const vel = this.bird.velocity

    if (birdBox.intersectsBox(this.obstacleBox)) {
      this.die('OBSTACLE', pos, vel)
      return
    }

    if (pos.y < WORLD_FLOOR_Y || pos.y > WORLD_CEILING_Y) {
      this.die('BOUNDS', pos, vel)
    }
  }

  private die(reason: string, pos: Vector3, vel: Vector3): void {
    this.dead = true
    console.warn(
      `[CollisionSystem] COLLISION (${reason}) at`,
      pos.clone(),
      vel.clone(),
    )
    this.loop.stop()
  }

  dispose(scene: Scene): void {
    scene.remove(this.obstacleMesh)
    this.obstacleMesh.geometry.dispose()
    this.obstacleMesh.material.dispose()
  }
}
