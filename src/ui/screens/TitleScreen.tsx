import { h } from 'preact'
import { useEffect } from 'preact/hooks'
import type { Actor } from 'xstate'
import type { gameMachine } from '../../machine/gameMachine'
import type { LeaderboardEntry } from '../../storage/StorageManager'
import { Button } from '../components/Button'
import { LeaderboardList } from '../components/LeaderboardList'

type GameActor = Actor<typeof gameMachine>

interface Props {
  active: boolean
  actor: GameActor
  leaderboard: LeaderboardEntry[]
  onSettings: () => void
  onInstall?: () => void
  showInstall?: boolean
}

export function TitleScreen({ active, actor, leaderboard, onSettings, onInstall, showInstall }: Props) {
  useEffect(() => {
    const ac = new AbortController()
    const handleKey = (e: KeyboardEvent) => {
      if (!active) return
      if (e.key === 'Enter') actor.send({ type: 'START' })
    }
    document.addEventListener('keydown', handleKey, { signal: ac.signal })
    return () => ac.abort()
  }, [active, actor])

  return h(
    'div',
    {
      className: 'screen title-screen' + (active ? ' active' : ''),
      onClick: (e: MouseEvent) => {
        // Only trigger START if click is not on a button
        const target = e.target as HTMLElement
        if (target.tagName !== 'BUTTON') {
          actor.send({ type: 'START' })
        }
      },
    },
    h(
      Button,
      {
        className: 'title-settings-btn',
        onClick: (e: MouseEvent) => { e.stopPropagation(); onSettings() },
        'aria-label': 'Settings',
      },
      '⚙️',
    ),
    h('h1', { className: 'title-heading' }, 'FLAPPY 3D'),
    h(
      'div',
      { style: 'margin: 8px 0 16px; width: 100%; max-width: 300px;' },
      h(LeaderboardList, { entries: leaderboard, max: 3 }),
    ),
    h('p', { className: 'title-cta' }, 'Tap anywhere to start'),
    (showInstall && leaderboard.length >= 1)
      ? h(Button, {
          className: 'install-cta',
          onClick: (e: MouseEvent) => { e.stopPropagation(); onInstall?.() },
        }, 'Install App →')
      : null,
  )
}
