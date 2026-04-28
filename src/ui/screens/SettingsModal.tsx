import { h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { StorageManager, SettingsV2 } from '../../storage/StorageManager'
import type { AudioManager } from '../../audio/AudioManager'
import { Button } from '../components/Button'
import { Toggle } from '../components/Toggle'
import { refreshReducedMotion } from '../../a11y/motion'

interface Props {
  storage: StorageManager
  audio: AudioManager
  onClose: () => void
}

export function SettingsModal({ storage, audio, onClose }: Props) {
  const [settings, setSettings] = useState<SettingsV2>(() => storage.getSettings())
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Open dialog when mounted, close when unmounted
  useEffect(() => {
    const el = dialogRef.current
    if (el && !el.open) el.showModal()

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    el?.addEventListener('cancel', handleCancel)
    return () => {
      el?.removeEventListener('cancel', handleCancel)
      if (el?.open) el.close()
    }
  }, [])

  function update(partial: Partial<SettingsV2>) {
    const next = { ...settings, ...partial }
    setSettings(next)
    storage.setSettings(partial)

    // Apply audio side-effects
    if (partial.sound !== undefined) audio.setSfxMuted(!partial.sound)
    if (partial.music !== undefined) audio.setMusicMuted(!partial.music)

    // Refresh reduce-motion gate if that setting changed
    if (partial.reduceMotion !== undefined) refreshReducedMotion(storage)
  }

  const reduceMotionOn = settings.reduceMotion !== 'off'

  return h(
    'dialog',
    { ref: dialogRef, className: 'settings-modal' },
    h(
      'div',
      { className: 'settings-header' },
      h('h2', { className: 'settings-title' }, 'Settings'),
      h(Button, { className: 'settings-close-btn', onClick: onClose, 'aria-label': 'Close settings' }, '✕'),
    ),
    h(
      'div',
      { className: 'settings-rows' },
      h(Toggle, {
        label: 'Sound',
        checked: settings.sound,
        onChange: (v) => update({ sound: v }),
      }),
      h(Toggle, {
        label: 'Music',
        checked: settings.music,
        onChange: (v) => update({ music: v }),
      }),
      h(Toggle, {
        label: 'Reduce Motion',
        checked: reduceMotionOn,
        onChange: (v) => update({ reduceMotion: v ? 'on' : 'off' }),
      }),
      h(Toggle, {
        label: 'Colorblind Palette',
        checked: settings.palette === 'colorblind',
        onChange: (v) => update({ palette: v ? 'colorblind' : 'default' }),
      }),
    ),
  )
}
