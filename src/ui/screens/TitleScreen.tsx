import { h } from 'preact'
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
}

export function TitleScreen({ active, actor, leaderboard, onSettings }: Props) {
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
  )
}
