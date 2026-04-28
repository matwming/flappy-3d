import { createActor } from 'xstate'
import { BoxGeometry, MeshStandardMaterial } from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { createRenderer } from './render/createRenderer'
import { GameLoop } from './loop/GameLoop'
import { InputManager } from './input/InputManager'
import { Bird } from './entities/Bird'
import { PhysicsSystem } from './systems/PhysicsSystem'
import { CollisionSystem } from './systems/CollisionSystem'
import { ObstacleSpawner } from './systems/ObstacleSpawner'
import { ScrollSystem } from './systems/ScrollSystem'
import { ScoreSystem } from './systems/ScoreSystem'
import { ObjectPool } from './pools/ObjectPool'
import { ObstaclePair } from './entities/ObstaclePair'
import { gameMachine, scheduleAutoRestart } from './machine/gameMachine'
import { StorageManager } from './storage/StorageManager'
import { PIPE_WIDTH, PIPE_DEPTH, PIPE_COLOR, POOL_SIZE } from './constants'
import './style.css'

if (!WebGL.isWebGL2Available()) {
  const msg = document.createElement('div')
  msg.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:1.2rem;padding:2rem;text-align:center;background:#1a1a1a;color:#fff'
  msg.textContent =
    'Sorry, this game needs WebGL 2. Please try a recent version of Chrome, Firefox, or Safari.'
  document.body.appendChild(msg)
} else {
  const storage = new StorageManager()
  const bestScore = storage.getBestScore()
  const actor = createActor(gameMachine, { input: { bestScore } })

  const { renderer, scene, camera } = createRenderer()
  const canvas = renderer.domElement

  // Shared pipe geometry + material (placeholder — Plan 02-03 swaps to MeshToonMaterial)
  const pipeGeometry = new BoxGeometry(PIPE_WIDTH, 6, PIPE_DEPTH)
  const pipeMaterial = new MeshStandardMaterial({ color: PIPE_COLOR })

  // Object pool: pre-warmed at boot (D-22)
  const obstaclePool = new ObjectPool<ObstaclePair>(
    () => new ObstaclePair(pipeGeometry, pipeMaterial, scene),
    POOL_SIZE,
  )

  const bird = new Bird(scene)
  const loop = new GameLoop(renderer, scene, camera)
  const input = new InputManager(canvas)
  const physics = new PhysicsSystem(bird, actor)
  const spawner = new ObstacleSpawner(obstaclePool, actor)
  const scrollSystem = new ScrollSystem(obstaclePool, actor)
  const scoreSystem = new ScoreSystem(obstaclePool, actor)
  const collision = new CollisionSystem(bird, obstaclePool, actor)

  input.onFlap(() => {
    const state = actor.getSnapshot().value
    if (state === 'title') {
      actor.send({ type: 'START' })
    } else if (state === 'playing') {
      physics.queueFlap()
      actor.send({ type: 'FLAP' })
    } else if (state === 'gameOver') {
      actor.send({ type: 'RESTART' })
    }
  })

  // System order per D-29: physics → scroll → spawner → score → collision
  loop.add(physics)
  loop.add(scrollSystem)
  loop.add(spawner)
  loop.add(scoreSystem)
  loop.add(collision)

  actor.start()

  actor.subscribe((snapshot) => {
    console.log('[machine]', snapshot.value, snapshot.context.score)
  })

  scheduleAutoRestart(actor)

  loop.start()
}
