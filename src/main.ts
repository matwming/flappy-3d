import { createActor } from 'xstate'
import { BoxGeometry } from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { createRenderer } from './render/createRenderer'
import { createComposer } from './render/createComposer'
import { createToonGradient, createToonMaterial } from './render/toonMaterial'
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
import { Background } from './entities/Background'
import { gameMachine, scheduleAutoRestart } from './machine/gameMachine'
import { StorageManager } from './storage/StorageManager'
import { AudioManager } from './audio/AudioManager'
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
  const { renderer, scene, camera } = createRenderer()
  const canvas = renderer.domElement

  const storage = new StorageManager()
  const actor = createActor(gameMachine, {
    input: { bestScore: storage.getBestScore() },
  })

  const gradient = createToonGradient()
  const birdMaterial = createToonMaterial(gradient, 0xff7043)
  const pipeMaterial = createToonMaterial(gradient, PIPE_COLOR)

  const bird = new Bird(scene)
  bird.mesh.material = birdMaterial

  const pipeGeometry = new BoxGeometry(PIPE_WIDTH, 6, PIPE_DEPTH)
  const obstaclePool = new ObjectPool<ObstaclePair>(
    () => new ObstaclePair(pipeGeometry, pipeMaterial, scene),
    POOL_SIZE,
  )

  const background = new Background(scene)

  const loop = new GameLoop(renderer, scene, camera)
  const input = new InputManager(canvas)
  const physics = new PhysicsSystem(bird, actor)
  const scrollSystem = new ScrollSystem(obstaclePool, actor, background)
  const spawner = new ObstacleSpawner(obstaclePool, actor)
  const scoreSystem = new ScoreSystem(obstaclePool, actor)
  const collision = new CollisionSystem(bird, obstaclePool, actor)

  const audio = new AudioManager()

  input.onFlap(() => {
    const state = actor.getSnapshot().value
    if (state === 'title') {
      actor.send({ type: 'START' })
    } else if (state === 'playing') {
      physics.queueFlap()
      actor.send({ type: 'FLAP' })
      audio.playFlap()
    } else if (state === 'gameOver') {
      actor.send({ type: 'RESTART' })
    }
  })

  loop.add(physics)
  loop.add(scrollSystem)
  loop.add(spawner)
  loop.add(scoreSystem)
  loop.add(collision)

  const composerResult = createComposer(renderer, scene, camera)
  if (composerResult !== null) {
    loop.setRenderFn(composerResult.render)
  }

  actor.start()

  let lastScore = 0

  actor.subscribe((snapshot) => {
    const s = snapshot.value as string
    console.log('[machine]', s, 'score:', snapshot.context.score, 'best:', snapshot.context.bestScore)

    // Music control: play in 'playing', fade on 'dying', stop elsewhere
    if (s === 'playing') {
      audio.setMusicPlaying(true)
    } else if (s === 'dying') {
      audio.fadeMusicOut(600)
      audio.playDeath()
    } else if (s === 'gameOver' || s === 'title') {
      audio.setMusicPlaying(false)
    }

    // Score SFX on each increment
    if (s === 'playing' && snapshot.context.score > lastScore) {
      audio.playScore()
    }
    lastScore = snapshot.context.score
  })

  scheduleAutoRestart(actor)

  loop.start()
}
