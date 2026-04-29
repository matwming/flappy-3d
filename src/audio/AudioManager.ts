import { Howl, Howler } from 'howler'

// Tiny WebAudio synth fallback used when MP3 files are placeholder/unavailable (D-09)
function synthBurst(
  type: OscillatorType,
  freq: number,
  durationMs: number,
): void {
  try {
    const ctx = Howler.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch {
    // silently swallow — synth is best-effort
  }
}

export class AudioManager {
  private flap: Howl
  private score: Howl
  private death: Howl
  private music: Howl
  // Track whether each Howl successfully loaded (used for synth fallback — see playFlap/playScore/playDeath)
  private flapLoaded = false
  private scoreLoaded = false
  private deathLoaded = false

  private musicPlaying = false
  private sfxMuted = false
  private musicMuted = false
  private unlocked = false
  private unlockHandler: ((e: PointerEvent) => void) | null = null

  constructor() {
    // All Howl instances created ONCE here (AUD-05) — never recreated on restart
    this.flap = new Howl({
      src: ['/audio/flap.mp3'],
      volume: 0.6,
      preload: true,
      onload: () => { this.flapLoaded = true },
    })
    this.score = new Howl({
      src: ['/audio/score.mp3'],
      volume: 0.7,
      preload: true,
      onload: () => { this.scoreLoaded = true },
    })
    this.death = new Howl({
      src: ['/audio/death.mp3'],
      volume: 0.8,
      preload: true,
      onload: () => { this.deathLoaded = true },
    })
    this.music = new Howl({
      src: ['/audio/music.mp3'],
      volume: 0.4,
      loop: true,
      preload: true,
    })

    // iOS unlock pattern (AUD-01, D-08): one-time pointerup listener
    // MUST call Howler.ctx.resume() synchronously inside the user-gesture handler
    this.unlockHandler = () => {
      if (this.unlocked) return
      void Howler.ctx?.resume()
      this.unlocked = true
      if (this.unlockHandler) {
        document.removeEventListener('pointerup', this.unlockHandler)
        this.unlockHandler = null
      }
      // If music was queued before unlock, start it now
      if (this.musicPlaying && !this.musicMuted) this.music.play()
    }
    document.addEventListener('pointerup', this.unlockHandler)
  }

  playFlap(): void {
    if (this.sfxMuted) return
    if (this.flapLoaded) {
      this.flap.play()
    } else {
      // Synth fallback: short high-frequency sine (D-09)
      synthBurst('sine', 880, 80)
    }
  }

  playScore(): void {
    if (this.sfxMuted) return
    if (this.scoreLoaded) {
      this.score.play()
    } else {
      // Synth fallback: bright triangle "ding" (D-09)
      synthBurst('triangle', 1320, 150)
    }
  }

  playDeath(): void {
    if (this.sfxMuted) return
    if (this.deathLoaded) {
      this.death.play()
    } else {
      // Synth fallback: low sawtooth thud (D-09)
      synthBurst('sawtooth', 120, 250)
    }
  }

  setMusicPlaying(playing: boolean): void {
    this.musicPlaying = playing
    if (playing && !this.musicMuted) {
      this.music.volume(0.4)  // reset after potential fadeMusicOut (which fades to 0)
      if (this.unlocked) {
        this.music.play()
      }
      // else: unlockHandler will call music.play() after first pointerup
    } else {
      this.music.pause()
    }
  }

  setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted
    if (muted) {
      this.music.pause()
    } else if (this.musicPlaying && this.unlocked) {
      this.music.play()
    }
  }

  fadeMusicOut(durationMs: number): void {
    const currentVol = this.music.volume()
    if (currentVol > 0) {
      this.music.fade(currentVol, 0, durationMs)
    }
  }

  // Programmatic unlock — call inside first pointerup synchronously (D-08)
  unlock(): void {
    this.unlockHandler?.(new PointerEvent('pointerup'))
  }

  dispose(): void {
    this.flap.unload()
    this.score.unload()
    this.death.unload()
    this.music.unload()
    if (this.unlockHandler) {
      document.removeEventListener('pointerup', this.unlockHandler)
      this.unlockHandler = null
    }
  }
}
