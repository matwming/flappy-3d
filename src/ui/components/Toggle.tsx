import { h } from 'preact'

type Props = { label: string; checked: boolean; onChange: (v: boolean) => void }

export function Toggle({ label, checked, onChange }: Props) {
  return h(
    'button',
    {
      type: 'button',
      role: 'switch',
      'aria-pressed': String(checked),
      className: 'toggle' + (checked ? ' on' : ''),
      onClick: () => onChange(!checked),
    },
    h('span', { className: 'toggle-label' }, label),
    h('span', { className: 'toggle-track' }, h('span', { className: 'toggle-thumb' })),
  )
}
