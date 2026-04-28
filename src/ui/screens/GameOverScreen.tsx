import { h } from 'preact'
import { useEffect } from 'preact/hooks'
import type { Actor } from 'xstate'
import type { gameMachine } from '../../machine/gameMachine'
import type { LeaderboardEntry } from '../../storage/StorageManager'
import { Button } from '../components/Button'
import { LeaderboardList } from '../components/LeaderboardList'
import { NewBestBadge } from '../components/NewBestBadge'

type GameActor = Actor<typeof gameMachine>

interface Props {
  active: boolean
  actor: GameActor
  score: number
  priorBest: number
  leaderboard: LeaderboardEntry[]
}

export function GameOverScreen({ active, actor, score, priorBest, leaderboard }: Props) {
  const isNewBest = score > 0 && score > priorBest

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && active) {
        actor.send({ type: 'RESTART' })
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [active, actor])

  return h(
    'div',
    {
      className: 'screen gameover-screen' + (active ? ' active' : ''),
      onClick: (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName !== 'BUTTON') {
          actor.send({ type: 'RESTART' })
        }
      },
    },
    h('h2', { className: 'gameover-heading' }, 'Game Over'),
    h('div', { className: 'gameover-score' }, score),
    isNewBest ? h(NewBestBadge, null) : h('p', { className: 'gameover-pb' }, 'Best: ' + priorBest),
    h('div', { style: 'margin: 8px 0; width: 100%; max-width: 300px;' },
      h(LeaderboardList, { entries: leaderboard, max: 5 }),
    ),
    h('p', { className: 'gameover-cta' }, 'Tap to restart'),
    h(
      'div',
      { className: 'btn-row' },
      h(Button, { onClick: (e: MouseEvent) => { e.stopPropagation(); actor.send({ type: 'RESTART' }) } }, 'Restart'),
      h(Button, { onClick: (e: MouseEvent) => { e.stopPropagation(); actor.send({ type: 'START' }) } }, 'Back to Title'),
    ),
  )
}
