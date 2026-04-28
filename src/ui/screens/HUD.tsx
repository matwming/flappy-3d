import { h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Actor } from 'xstate'
import type { gameMachine } from '../../machine/gameMachine'
import { Button } from '../components/Button'

type GameActor = Actor<typeof gameMachine>

interface Props {
  active: boolean
  actor: GameActor
  score: number
  onPause: () => void
}

export function HUD({ active, actor: _actor, score, onPause }: Props) {
  const [displayScore, setDisplayScore] = useState(score)
  const [popping, setPopping] = useState(false)
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (score !== displayScore) {
      setDisplayScore(score)
      // Trigger .score-pop class for 280ms
      setPopping(false)
      // Use double-rAF to ensure class toggle resets properly
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPopping(true)
          if (popTimer.current !== null) clearTimeout(popTimer.current)
          popTimer.current = setTimeout(() => setPopping(false), 280)
        })
      })
    }
    return () => {
      if (popTimer.current !== null) clearTimeout(popTimer.current)
    }
  }, [score])

  return h(
    'div',
    { className: 'hud-screen' + (active ? ' active' : '') },
    h(
      'div',
      {
        className: 'hud-score' + (popping ? ' score-pop' : ''),
        'aria-live': 'polite',
        'aria-atomic': 'true',
      },
      displayScore,
    ),
    h(Button, { className: 'hud-pause-btn', onClick: onPause, 'aria-label': 'Pause' }, '⏸'),
  )
}
