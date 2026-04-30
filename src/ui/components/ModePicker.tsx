import { h } from 'preact'
import type { GameMode } from '../../machine/gameMachine'

interface Props {
  mode: GameMode
  onModeChange: (mode: GameMode) => void
}

const MODES: { value: GameMode; label: string }[] = [
  { value: 'endless',    label: 'Endless' },
  { value: 'timeAttack', label: 'Time-Attack' },
  { value: 'daily',      label: 'Daily' },
]

export function ModePicker({ mode, onModeChange }: Props) {
  return h(
    'div',
    { className: 'mode-picker', role: 'group', 'aria-label': 'Game mode' },
    ...MODES.map(({ value, label }) =>
      h(
        'button',
        {
          key: value,
          type: 'button' as const,
          className: 'mode-btn' + (mode === value ? ' active' : ''),
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            onModeChange(value)
          },
          'aria-pressed': mode === value,
          'aria-label': label,
        },
        label,
      )
    ),
  )
}
