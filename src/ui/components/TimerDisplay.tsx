import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import type { TimerSystem } from '../../systems/TimerSystem'

interface Props {
  timerSystem: TimerSystem
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${rem.toString().padStart(2, '0')}`
}

export function TimerDisplay({ timerSystem }: Props) {
  const [display, setDisplay] = useState(() => formatTime(timerSystem.timeRemaining))

  useEffect(() => {
    const ac = new AbortController()
    const id = setInterval(() => {
      if (ac.signal.aborted) return
      setDisplay(formatTime(timerSystem.timeRemaining))
    }, 1000)
    return () => {
      ac.abort()
      clearInterval(id)
    }
  }, [timerSystem])

  const remaining = Math.max(0, Math.ceil(timerSystem.timeRemaining))
  const urgent = remaining <= 10

  return h(
    'div',
    {
      className: 'hud-timer' + (urgent ? ' timer-urgent' : ''),
      'aria-live': 'polite',
      'aria-atomic': 'true',
      'aria-label': `Time remaining: ${display}`,
    },
    display,
  )
}
