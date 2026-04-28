import { createActor } from 'xstate'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { createRenderer } from './render/createRenderer'
import { GameLoop } from './loop/GameLoop'
import { InputManager } from './input/InputManager'
import { Bird } from './entities/Bird'
import { PhysicsSystem } from './systems/PhysicsSystem'
import { CollisionSystem } from './systems/CollisionSystem'
import { gameMachine, scheduleAutoRestart } from './machine/gameMachine'
import { StorageManager } from './storage/StorageManager'
import './style.css'

if (!WebGL.isWebGL2Available()) {
  const msg = document.createElement('div')
  msg.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:1.2rem;padding:2rem;text-align:center;background:#1a1a1a;color:#fff'
  msg.textContent =
    'Sorry, this game needs WebGL 2. Please try a recent version of Chrome, Firefox, or Safari.'
  document.body.appendChild(msg)
} else {
  // Bootstrap: read persisted best score, create actor, then wire systems
  const storage = new StorageManager()
  const bestScore = storage.getBestScore()
  const actor = createActor(gameMachine, { input: { bestScore } })

  const { renderer, scene, camera } = createRenderer()
  const canvas = renderer.domElement

  const bird = new Bird(scene)
  const loop = new GameLoop(renderer, scene, camera)
  const input = new InputManager(canvas)
  // NOTE: actor injection into PhysicsSystem + CollisionSystem constructors happens in plan 02-02
  const physics = new PhysicsSystem(bird)
  const collision = new CollisionSystem(bird, loop, scene)

  // Route flap input: title tap → START, playing tap → FLAP + physics impulse
  input.onFlap(() => {
    const state = actor.getSnapshot().value
    if (state === 'title') {
      actor.send({ type: 'START' })
    } else if (state === 'playing') {
      physics.queueFlap()
      actor.send({ type: 'FLAP' })
    }
  })

  loop.add(physics)
  loop.add(collision)

  // Start actor before loop — actor must be running before any system reads state
  actor.start()

  // Phase 2 debug bridge: log state transitions to console
  actor.subscribe((snapshot) => {
    console.log('[machine]', snapshot.value, snapshot.context.score)
  })

  // Phase 2 demo loop: auto-restart 1500ms after game over
  scheduleAutoRestart(actor)

  loop.start()
}
