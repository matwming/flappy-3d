import { h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { StorageManager, SettingsV4, BirdShape } from '../../storage/StorageManager'
import type { AudioManager } from '../../audio/AudioManager'
import type { DifficultyPreset } from '../../constants'
import { Button } from '../components/Button'
import { Toggle } from '../components/Toggle'
import { refreshReducedMotion } from '../../a11y/motion'

const MAX_IMAGE_BYTES = 1_500_000  // ~1.5 MB after base64 — fits in localStorage

interface Props {
  storage: StorageManager
  audio: AudioManager
  onClose: () => void
  onPaletteChange: (palette: 'default' | 'colorblind') => void
  onShapeChange: (shape: BirdShape) => void
  onImageChange: (image: string | null) => void
}

export function SettingsModal({
  storage, audio, onClose, onPaletteChange, onShapeChange, onImageChange,
}: Props) {
  const [settings, setSettings] = useState<SettingsV4>(() => storage.getSettings())
  const [imageError, setImageError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function update(partial: Partial<SettingsV4>) {
    const next = { ...settings, ...partial }
    setSettings(next)
    storage.setSettings(partial)

    // Apply audio side-effects
    if (partial.sound !== undefined) audio.setSfxMuted(!partial.sound)
    if (partial.music !== undefined) audio.setMusicMuted(!partial.music)

    // Refresh reduce-motion gate if that setting changed
    if (partial.reduceMotion !== undefined) refreshReducedMotion(storage)

    // Trigger palette swap when colorblind setting changes
    if (partial.palette !== undefined) onPaletteChange(partial.palette)

    // Phase 17: shape + image swaps go to the bird via callback
    if (partial.birdShape !== undefined) onShapeChange(partial.birdShape)
    if (partial.birdImage !== undefined) onImageChange(partial.birdImage)
  }

  const reduceMotionOn =
    settings.reduceMotion === 'on' ||
    (settings.reduceMotion === 'auto' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  async function handleFile(e: Event) {
    setImageError(null)
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError('Please pick an image file.')
      target.value = ''
      return
    }

    // createImageBitmap accepts a File/Blob directly and decodes natively,
    // dodging HTMLImageElement's flaky onerror behaviour with data URLs.
    // Available on all modern browsers + iOS Safari 15+.
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (ctx === null) {
        setImageError("Couldn't read the image. Try another file.")
        return
      }
      // Cover-fit so the image fills the square
      const ratio = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height)
      const w = bitmap.width * ratio
      const hh = bitmap.height * ratio
      ctx.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - hh) / 2, w, hh)
      bitmap.close()
      const resized = canvas.toDataURL('image/png')
      if (resized.length > MAX_IMAGE_BYTES) {
        setImageError('Image is too large after resize — pick something simpler.')
        return
      }
      update({ birdImage: resized })
    } catch {
      setImageError("Couldn't decode the image. Try another file.")
    } finally {
      target.value = ''  // allow re-uploading the same file later
    }
  }

  function clearImage() {
    setImageError(null)
    update({ birdImage: null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
      h('p', { className: 'settings-note' },
        'On iOS, the silent switch mutes all app audio.',
      ),
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
      h(Toggle, {
        label: 'Flap trail',
        checked: settings.flapTrail ?? false,
        onChange: (v) => update({ flapTrail: v }),
      }),
      h('p', { className: 'settings-note' },
        'Adds ghost echoes after each flap. May reduce performance on older devices.',
      ),
      h(Toggle, {
        label: 'Camera bob',
        checked: settings.cameraBob ?? false,
        onChange: (v) => update({ cameraBob: v }),
      }),
      h('p', { className: 'settings-note' },
        'Subtle camera tilt that follows the bird. Off by default — may cause motion discomfort. Disabled when Reduce Motion is on.',
      ),

      // Phase 16 v1.5 — Difficulty preset
      h('div', { className: 'settings-row settings-pickerrow' },
        h('span', { className: 'settings-row-label' }, 'Difficulty'),
        h('div', { className: 'settings-picker', role: 'group', 'aria-label': 'Difficulty preset' },
          (['easy', 'normal', 'hard'] as const).map((d) =>
            h(Button, {
              key: d,
              className: 'mode-btn' + (settings.difficulty === d ? ' active' : ''),
              'aria-pressed': settings.difficulty === d,
              onClick: () => update({ difficulty: d as DifficultyPreset }),
            }, d.charAt(0).toUpperCase() + d.slice(1)),
          ),
        ),
      ),
      h('p', { className: 'settings-note' },
        'Easy = wider gaps + slower scroll. Default for new players. Hard scales the other way.',
      ),

      // Phase 17 v1.5 — Bird shape (hidden when image is set)
      settings.birdImage === null ? h('div', { className: 'settings-row settings-pickerrow' },
        h('span', { className: 'settings-row-label' }, 'Bird shape'),
        h('div', { className: 'settings-picker settings-picker-shapes', role: 'group', 'aria-label': 'Bird shape' },
          (
            [
              { id: 'sphere',  label: 'Sphere'  },
              { id: 'cube',    label: 'Cube'    },
              { id: 'pyramid', label: 'Pyramid' },
              { id: 'bird',    label: '🐦'      },
              { id: 'cat',     label: '🐱'      },
              { id: 'dog',     label: '🐶'      },
              { id: 'frog',    label: '🐸'      },
            ] as const
          ).map(({ id, label }) =>
            h(Button, {
              key: id,
              className: 'mode-btn' + (settings.birdShape === id ? ' active' : ''),
              'aria-pressed': settings.birdShape === id,
              'aria-label': id,
              onClick: () => update({ birdShape: id as BirdShape }),
            }, label),
          ),
        ),
      ) : null,

      // Phase 17 v1.5 — Custom bird image
      h('div', { className: 'settings-row settings-imagerow' },
        h('span', { className: 'settings-row-label' }, 'Bird image'),
        h('div', { className: 'settings-imageactions' },
          h('input', {
            ref: fileInputRef,
            type: 'file',
            accept: 'image/*',
            'aria-label': 'Upload bird image',
            onChange: handleFile,
            className: 'settings-fileinput',
          }),
          settings.birdImage !== null
            ? h(Button, { onClick: clearImage, className: 'settings-clearimage' }, 'Clear')
            : null,
        ),
      ),
      imageError !== null
        ? h('p', { className: 'settings-note settings-error' }, imageError)
        : h('p', { className: 'settings-note' },
            'Upload your favourite picture to use as the bird. Resized to 256×256 and saved locally.'),
    ),
  )
}
