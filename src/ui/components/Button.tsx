import { h } from 'preact'
import type { JSX, ComponentChildren } from 'preact'

type Props = JSX.HTMLAttributes<HTMLButtonElement> & { children?: ComponentChildren }

export function Button({ children, ...rest }: Props) {
  return h('button', { type: 'button', ...rest }, children)
}
