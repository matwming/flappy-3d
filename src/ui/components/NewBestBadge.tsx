import { h } from 'preact'

export function NewBestBadge() {
  return h('div', { className: 'new-best-badge', role: 'status' }, '✨ New Best! ✨')
}
