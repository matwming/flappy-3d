import { h } from 'preact'

type Props = {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  /** Optional tooltip — surfaces longer explanations on hover/long-press
   * without consuming permanent vertical space in the modal. */
  tip?: string
}

export function Toggle({ label, checked, onChange, tip }: Props) {
  return h(
    'button',
    {
      type: 'button',
      role: 'switch',
      'aria-pressed': String(checked),
      title: tip,
      className: 'toggle' + (checked ? ' on' : ''),
      onClick: () => onChange(!checked),
    },
    h('span', { className: 'toggle-label' }, label),
    h('span', { className: 'toggle-track' }, h('span', { className: 'toggle-thumb' })),
  )
}
