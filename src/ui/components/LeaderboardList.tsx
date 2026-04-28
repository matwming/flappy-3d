import { h } from 'preact'
import type { LeaderboardEntry } from '../../storage/StorageManager'

type Props = { entries: LeaderboardEntry[]; max?: number }

export function LeaderboardList({ entries, max = 5 }: Props) {
  if (entries.length === 0) return h('p', { className: 'leaderboard-empty' }, 'No scores yet — fly!')
  return h(
    'ol',
    { className: 'leaderboard' },
    entries.slice(0, max).map((e, i) =>
      h(
        'li',
        { key: e.ts, className: 'leaderboard-item' },
        h('span', { className: 'rank' }, '#' + (i + 1)),
        h('span', { className: 'score' }, e.score),
      ),
    ),
  )
}
