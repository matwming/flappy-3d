import { h } from 'preact'
import { useEffect } from 'preact/hooks'
import type { Actor } from 'xstate'
import type { gameMachine } from '../../machine/gameMachine'
import { Button } from '../components/Button'

type GameActor = Actor<typeof gameMachine>

interface Props {
  active: boolean
  actor: GameActor
}

export function PauseScreen({ active, actor }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && active) {
        actor.send({ type: 'RESUME' })
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [active, actor])

  return h(
    'div',
    { className: 'screen pause-screen' + (active ? ' active' : '') },
    h('h2', { className: 'pause-heading' }, 'Paused'),
    h(
      'div',
      { className: 'btn-row' },
      h(Button, { onClick: () => actor.send({ type: 'RESUME' }) }, 'Resume'),
      h(Button, { onClick: () => actor.send({ type: 'START' }) }, 'Back to Title'),
    ),
  )
}
