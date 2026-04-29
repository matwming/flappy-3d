// Augment Window for beforeinstallprompt (not in TS DOM lib)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
declare global {
  interface Window {
    deferredInstallPrompt?: BeforeInstallPromptEvent
  }
}

import { createActor } from 'xstate'
import { BoxGeometry } from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { createRenderer } from './render/createRenderer'
import { createComposer } from './render/createComposer'
import { createToonGradient, createToonMaterial, applyColorblindPalette, applyDefaultPalette } from './render/toonMaterial'
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
import { gameMachine } from './machine/gameMachine'
import { StorageManager } from './storage/StorageManager'
import { AudioManager } from './audio/AudioManager'
import { UIBridge } from './ui/UIBridge'
import { squashStretch, screenShake } from './anim/anim'
import { createParticles } from './particles/createParticles'
import { prefersReducedMotion } from './a11y/motion'
import { PIPE_WIDTH, PIPE_DEPTH, PIPE_COLOR, POOL_SIZE } from './constants'
import './style.css'
import './ui/styles.css'

if (!WebGL.isWebGL2Available()) {
  const msg = document.createElement('div')
  msg.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:1.2rem;padding:2rem;text-align:center;background:#1a1a1a;color:#fff'
  msg.textContent =
    'Sorry, this game needs WebGL 2. Please try a recent version of Chrome, Firefox, or Safari.'
  document.body.appendChild(msg)
} else {
  const ac = new AbortController()
  const { renderer, scene, camera } = createRenderer(ac.signal)
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

  // Apply stored palette at startup (per D-13)
  const storedSettings = storage.getSettings()
  if (storedSettings.palette === 'colorblind') {
    applyColorblindPalette(birdMaterial, pipeMaterial)
  }

  const ui = new UIBridge(actor, audio, storage, (palette) => {
    if (palette === 'colorblind') {
      applyColorblindPalette(birdMaterial, pipeMaterial)
    } else {
      applyDefaultPalette(birdMaterial, pipeMaterial)
    }
  })
  const particles = createParticles(scene)

  input.onFlap(() => {
    const state = actor.getSnapshot().value
    if (state === 'title') {
      actor.send({ type: 'START' })
    } else if (state === 'playing') {
      physics.queueFlap()
      actor.send({ type: 'FLAP' })
      audio.playFlap()
      if (!prefersReducedMotion(storage)) {
        squashStretch(bird.mesh)
      }
    } else if (state === 'gameOver') {
      actor.send({ type: 'RESTART' })
    }
  })

  loop.add(physics)
  loop.add(scrollSystem)
  loop.add(spawner)
  loop.add(scoreSystem)
  loop.add(collision)
  loop.add({ step: (dt: number) => particles.step(dt) })

  const composerResult = createComposer(renderer, scene, camera, ac.signal)
  if (composerResult !== null) {
    loop.setRenderFn(composerResult.render)
  }

  actor.start()

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && actor.getSnapshot().value === 'playing') {
        actor.send({ type: 'PAUSE' })
      }
    },
    { signal: ac.signal },
  )

  // Capture beforeinstallprompt for deferred PWA install CTA (per D-10)
  window.addEventListener(
    'beforeinstallprompt',
    (e) => {
      e.preventDefault()
      window.deferredInstallPrompt = e as BeforeInstallPromptEvent
    },
    { signal: ac.signal },
  )

  ui.mount()

  // Reset bird + clear obstacles when the machine emits 'roundStarted'
  // (i.e. on START or RESTART, but not on RESUME). Driven by the machine's
  // emitted event so main.ts doesn't need to track state-transition history.
  let roundCount = 0
  actor.on('roundStarted', () => {
    roundCount++
    bird.position.set(0, 0, 0)
    bird.velocity.set(0, 0, 0)
    bird.mesh.rotation.z = 0
    bird.syncMesh()
    const toRelease: ObstaclePair[] = []
    obstaclePool.forEachActive((pair) => {
      pair.hide()
      toRelease.push(pair)
    })
    for (const p of toRelease) obstaclePool.release(p)

    if (import.meta.env.DEV) {
      const mem = renderer.info.memory
      console.log(
        `[mem probe] round=${roundCount} geometries=${mem.geometries} textures=${mem.textures}`,
      )
      if (roundCount >= 3 && mem.geometries > roundCount + 5) {
        console.warn('[mem probe] geometry count growing — possible leak')
      }
    }
  })

  let lastScore = 0
  let prevState: string | undefined

  actor.subscribe((snapshot) => {
    const s = snapshot.value as string
    if (import.meta.env.DEV) {
      console.log('[machine]', s, 'score:', snapshot.context.score)
    }

    // Music control: play in 'playing', fade on 'dying', stop elsewhere
    if (s === 'playing') {
      audio.setMusicPlaying(true)
    } else if (s === 'dying') {
      audio.fadeMusicOut(600)
      audio.playDeath()
    } else if (s === 'paused') {
      audio.setMusicPlaying(false)
    } else if (s === 'gameOver' || s === 'title') {
      audio.setMusicPlaying(false)
    }

    // Juice on dying transition (screen shake + particle burst) — gated behind reduced motion
    if (s === 'dying' && prevState !== 'dying') {
      if (!prefersReducedMotion(storage)) {
        screenShake(camera)
        particles.burst({ x: bird.position.x, y: bird.position.y, z: bird.position.z })
      }
    }

    // Score SFX on each increment
    if (s === 'playing' && snapshot.context.score > lastScore) {
      audio.playScore()
    }
    lastScore = snapshot.context.score
    prevState = s
  })

  loop.start()
}
