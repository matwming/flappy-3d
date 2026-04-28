import { h, render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import type { Actor, SnapshotFrom } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import type { AudioManager } from '../audio/AudioManager'
import type { StorageManager } from '../storage/StorageManager'
import type { LeaderboardEntry } from '../storage/StorageManager'
import { TitleScreen } from './screens/TitleScreen'
import { HUD } from './screens/HUD'
import { PauseScreen } from './screens/PauseScreen'
import { GameOverScreen } from './screens/GameOverScreen'
import { SettingsModal } from './screens/SettingsModal'

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
    render(
      h(App, { actor: this.actor, audio: this.audio, storage: this.storage }),
      this.mountEl,
    )
  }

  dispose(): void {
    if (this.mountEl) render(null, this.mountEl)
  }
}

function App(props: AppProps) {
  const [snap, setSnap] = useState<Snap>(props.actor.getSnapshot())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    props.storage.getLeaderboard(),
  )
  const [priorBest, setPriorBest] = useState<number>(() => props.storage.getBestScore())

  useEffect(() => {
    let prevValue = props.actor.getSnapshot().value as string
    const sub = props.actor.subscribe((s) => {
      const nextValue = s.value as string
      // When entering gameOver, capture priorBest BEFORE leaderboard push, then push
      if (nextValue === 'gameOver' && prevValue !== 'gameOver') {
        const pb = props.storage.getBestScore()
        setPriorBest(pb)
        props.storage.pushLeaderboard(s.context.score)
        setLeaderboard(props.storage.getLeaderboard())
      }
      prevValue = nextValue
      setSnap(s)
    })
    return () => sub.unsubscribe()
  }, [])

  const value = snap.value as string

  return h(
    'div',
    null,
    h(TitleScreen, {
      active: value === 'title',
      actor: props.actor,
      leaderboard,
      onSettings: () => setSettingsOpen(true),
    }),
    h(HUD, {
      active: value === 'playing' || value === 'dying',
      actor: props.actor,
      score: snap.context.score,
      onPause: () => props.actor.send({ type: 'PAUSE' }),
    }),
    h(PauseScreen, {
      active: value === 'paused',
      actor: props.actor,
    }),
    h(GameOverScreen, {
      active: value === 'gameOver',
      actor: props.actor,
      score: snap.context.score,
      priorBest,
      leaderboard,
    }),
    settingsOpen
      ? h(SettingsModal, {
          storage: props.storage,
          audio: props.audio,
          onClose: () => setSettingsOpen(false),
        })
      : null,
  )
}
