import WebGL from 'three/addons/capabilities/WebGL.js'
import { createRenderer } from './render/createRenderer'
import { GameLoop } from './loop/GameLoop'
import { InputManager } from './input/InputManager'
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

  const loop = new GameLoop(renderer, scene, camera)
  const input = new InputManager(canvas)

  input.onFlap(() => {
    console.log('[InputManager] flap received')
  })

  loop.start()
}
