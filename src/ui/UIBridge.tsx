import { h, render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import type { Actor, SnapshotFrom } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import type { AudioManager } from '../audio/AudioManager'
import type { StorageManager } from '../storage/StorageManager'

type GameActor = Actor<typeof gameMachine>
type Snap = SnapshotFrom<typeof gameMachine>

interface AppProps {
  actor: GameActor
  audio: AudioManager
  storage: StorageManager
}

export class UIBridge {
  private actor: GameActor
  private audio: AudioManager
  private storage: StorageManager
  private mountEl: HTMLElement | null = null

  constructor(actor: GameActor, audio: AudioManager, storage: StorageManager) {
    this.actor = actor
    this.audio = audio
    this.storage = storage
  }

  mount(): void {
    this.mountEl = document.getElementById('ui-root')
    if (!this.mountEl) throw new Error('#ui-root not found in DOM')
    // App component defined below; Plan 03-03 replaces with full screen routing
    render(
      h(App, { actor: this.actor, audio: this.audio, storage: this.storage }),
      this.mountEl,
    )
  }

  dispose(): void {
    if (this.mountEl) render(null, this.mountEl)
  }
}

// Stub App — Plan 03-03 replaces with full screen routing
function App(props: AppProps) {
  const [snap, setSnap] = useState<Snap>(props.actor.getSnapshot())
  useEffect(() => {
    const sub = props.actor.subscribe((s) => setSnap(s))
    return () => sub.unsubscribe()
  }, [props.actor])

  // Suppress unused-variable warnings for audio/storage (used by Plan 03-03 screens)
  void props.audio
  void props.storage

  return h(
    'div',
    { className: 'screen active' },
    h('p', null, 'Phase 3 Plan 02 stub — screens come in Plan 03-03. State: ' + String(snap.value)),
  )
}
