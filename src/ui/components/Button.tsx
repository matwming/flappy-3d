import { h } from 'preact'
import type { JSX } from 'preact'

type Props = JSX.HTMLAttributes<HTMLButtonElement> & { children?: JSX.Element | string | (JSX.Element | string)[] }

export function Button({ children, ...rest }: Props) {
  return h('button', { type: 'button', ...rest }, children)
}
