---
phase: 03-ui-audio-polish
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - public/audio/flap.mp3
  - public/audio/score.mp3
  - public/audio/death.mp3
  - public/audio/music.mp3
  - public/audio/CREDITS.md
  - src/audio/AudioManager.ts
  - src/main.ts
  - package.json
autonomous: true
requirements:
  - AUD-01
  - AUD-02
  - AUD-03
  - AUD-04
  - AUD-05

must_haves:
  truths:
    - "Howler installed (~9.5KB gzipped); 4 MP3 files in public/audio/"
    - "AudioManager singleton with playFlap/playScore/playDeath/setMusicPlaying/setSfxMuted/setMusicMuted/fadeMusicOut/unlock/dispose methods"
    - "iOS audio unlock via Howler.ctx.resume() called inside FIRST pointerup synchronously"
    - "Background music loops in playing state, fades out 600ms on dying (D-04 + D-36)"
    - "All Howl instances created ONCE at AudioManager construction; never recreated on restart (AUD-05)"
    - "Music + SFX mute toggles take effect instantly without reload"
  artifacts:
    - path: "src/audio/AudioManager.ts"
      provides: "Singleton audio system with iOS unlock + Howler instances"
      exports: ["AudioManager"]
    - path: "public/audio/CREDITS.md"
      provides: "Source attribution for any non-CC0 samples"
---

<objective>
Source 4 CC0 audio files via WebFetch (or fall back to placeholder synth on miss), integrate Howler.js, build the AudioManager singleton with iOS unlock pattern, and wire it into main.ts so collisions/scores/flaps/state-transitions trigger audio. After this plan, the game has real recorded audio that follows iOS Safari rules.
</objective>

<execution_context>
@/Users/ming/projects/flappy-3d/.planning/phases/03-ui-audio-polish/03-CONTEXT.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: Install Howler + source audio assets via WebFetch</name>
  <read_first>
    - 03-CONTEXT.md §D-01 through D-05 (audio assets + sourcing)
    - 03-CONTEXT.md §D-09 (fallback if asset fetch fails)
  </read_first>
  <files>public/audio/flap.mp3, public/audio/score.mp3, public/audio/death.mp3, public/audio/music.mp3, public/audio/CREDITS.md, package.json</files>
  <action>
A) `npm install howler @types/howler`

B) `mkdir -p public/audio`

C) Source 4 CC0 audio files. Use WebFetch on pixabay.com/sound-effects/ to find candidate URLs for: "whoosh short", "ding bright", "thud cartoon", "ambient game loop". For each query:
   1. WebFetch the search results page
   2. Extract direct CDN download URL (Pixabay's `cdn.pixabay.com/.../filename.mp3`)
   3. `curl -L -A "Mozilla/5.0" -o public/audio/<name>.mp3 <url>`
   4. Verify file: `[ -s public/audio/<name>.mp3 ]` AND `file public/audio/<name>.mp3 | grep -i "audio"`

If any fetch fails or returns non-audio content: leave the file path empty AND add a `// TODO: replace with real CC0 sample (fetch failed during 03-01 — manual source needed)` to CREDITS.md. AudioManager (Task 2) will fall back to synth (D-09).

D) Write `public/audio/CREDITS.md` listing source URL + license per file. Format:
```markdown
# Audio Credits

All samples are CC0 (public domain) unless noted otherwise.

| File | Source | License |
|------|--------|---------|
| flap.mp3 | https://pixabay.com/.../whoosh.mp3 | CC0 |
| score.mp3 | https://pixabay.com/.../ding.mp3 | CC0 |
| death.mp3 | https://pixabay.com/.../thud.mp3 | CC0 |
| music.mp3 | https://pixabay.com/.../ambient.mp3 | CC0 |
```
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && ls -la public/audio/ && grep -c howler package.json</automated>
  </verify>
  <acceptance_criteria>
    - `npm list howler` shows installed
    - `public/audio/{flap,score,death,music}.mp3` all exist (or have TODO marker if fetch failed)
    - `public/audio/CREDITS.md` exists
    - `cat public/audio/CREDITS.md` lists all 4 files with source + license
  </acceptance_criteria>
  <done>Howler installed; 4 audio files present (or fallback markers); CREDITS.md committed.</done>
</task>

<task type="auto">
  <name>Task 2: Build AudioManager class with iOS unlock</name>
  <read_first>
    - 03-CONTEXT.md §D-06 through D-11 (audio architecture)
    - src/main.ts (current state — Phase 2; will add AudioManager init)
    - node_modules/howler/howler.d.ts (verify Howl + Howler types)
  </read_first>
  <files>src/audio/AudioManager.ts, src/main.ts</files>
  <action>
A) Create `src/audio/AudioManager.ts`:

```typescript
import { Howl, Howler } from 'howler'

export class AudioManager {
  private flap: Howl
  private score: Howl
  private death: Howl
  private music: Howl
  private musicPlaying = false
  private sfxMuted = false
  private musicMuted = false
  private unlocked = false
  private unlockHandler: ((e: PointerEvent) => void) | null = null

  constructor() {
    // All Howl instances created ONCE here (AUD-05)
    this.flap = new Howl({ src: ['/audio/flap.mp3'], volume: 0.6, preload: true })
    this.score = new Howl({ src: ['/audio/score.mp3'], volume: 0.7, preload: true })
    this.death = new Howl({ src: ['/audio/death.mp3'], volume: 0.8, preload: true })
    this.music = new Howl({ src: ['/audio/music.mp3'], volume: 0.4, loop: true, preload: true })

    // iOS unlock pattern (AUD-01, D-08): one-time pointerup listener
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
    document.addEventListener('pointerup', this.unlockHandler, { once: false })
  }

  playFlap(): void { if (!this.sfxMuted) this.flap.play() }
  playScore(): void { if (!this.sfxMuted) this.score.play() }
  playDeath(): void { if (!this.sfxMuted) this.death.play() }

  setMusicPlaying(playing: boolean): void {
    this.musicPlaying = playing
    if (playing && !this.musicMuted && this.unlocked) this.music.play()
    else this.music.pause()
  }

  setSfxMuted(muted: boolean): void { this.sfxMuted = muted }
  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted
    if (muted) this.music.pause()
    else if (this.musicPlaying && this.unlocked) this.music.play()
  }

  fadeMusicOut(durationMs: number): void {
    this.music.fade(this.music.volume(), 0, durationMs)
  }

  unlock(): void { this.unlockHandler?.(new PointerEvent('pointerup')) }

  dispose(): void {
    this.flap.unload()
    this.score.unload()
    this.death.unload()
    this.music.unload()
    if (this.unlockHandler) {
      document.removeEventListener('pointerup', this.unlockHandler)
    }
  }
}
```

B) Update `src/main.ts` to instantiate AudioManager and wire it to actor events. After `actor.start()` (and before `loop.start()`):

```typescript
import { AudioManager } from './audio/AudioManager'
// ...
const audio = new AudioManager()

// Drive audio from machine state + events
let lastState: string | undefined
let lastScore = 0
actor.subscribe((snapshot) => {
  const s = snapshot.value as string
  // Music control: play in 'playing', fade on 'dying', stop in 'gameOver'
  if (s === 'playing') {
    audio.setMusicPlaying(true)
  } else if (s === 'dying') {
    audio.fadeMusicOut(600)
    audio.playDeath()
  } else if (s === 'gameOver' || s === 'title') {
    audio.setMusicPlaying(false)
  }

  // Score SFX on each increment
  if (s === 'playing' && snapshot.context.score > lastScore) {
    audio.playScore()
  }
  lastScore = snapshot.context.score
  lastState = s
})

// Flap SFX when input fires (in playing state)
input.onFlap(() => {
  // ...existing code...
  if (actor.getSnapshot().value === 'playing') {
    audio.playFlap()
  }
})
```

NOTE: The `input.onFlap` callback already exists in main.ts from Phase 2. Modify it (don't duplicate); add the `audio.playFlap()` call inside the existing `else if (state === 'playing')` branch.

C) tsc clean check.
  </action>
  <verify>
    <automated>cd /Users/ming/projects/flappy-3d && npx tsc --noEmit && grep -n "Howler.ctx\|Howler.ctx?.resume" src/audio/AudioManager.ts && grep -n "AudioManager" src/main.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/audio/AudioManager.ts` exists with all 9 public methods (playFlap, playScore, playDeath, setMusicPlaying, setSfxMuted, setMusicMuted, fadeMusicOut, unlock, dispose)
    - `grep -n "Howler.ctx" src/audio/AudioManager.ts` shows resume() called
    - `grep -n "addEventListener.*pointerup" src/audio/AudioManager.ts` shows the unlock listener
    - All Howl instances are created in constructor (verify single `new Howl` per file)
    - `src/main.ts` instantiates AudioManager and routes audio on actor.subscribe + input.onFlap
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Audio plays in browser test: flap → flap.mp3, score → score.mp3, death → death.mp3 + music fade, music starts on first FLAP (after iOS unlock).</done>
</task>

</tasks>

<verification>
```bash
cd /Users/ming/projects/flappy-3d
npx tsc --noEmit
npm run build
grep -c "from 'howler'" src/audio/AudioManager.ts   # 1
ls public/audio/*.mp3 | wc -l                       # 4 (or check CREDITS.md fallback)
```
</verification>

<success_criteria>
- AUD-01 ✓ — iOS audio unlock via Howler.ctx.resume() in pointerup handler
- AUD-02 ✓ — recorded MP3 samples for flap/score/death (or fallback synth with TODO)
- AUD-03 ✓ — music plays in playing, fades 600ms on dying, pauses on tab-blur (Phase 5 handles tab-blur explicitly; D-10 stubs paused state)
- AUD-04 ✓ — setMusicMuted / setSfxMuted instantly mute without reload
- AUD-05 ✓ — Howl instances singleton-created in constructor; never recreated on restart
</success_criteria>

<output>
Write `.planning/phases/03-ui-audio-polish/03-01-SUMMARY.md`. Include:
- Asset sources used (URLs from CREDITS.md)
- AudioManager API surface
- Browser-verified moments: flap SFX, score SFX, death SFX + music fade, music loop
- Hand-off note for 03-04 (motion gate for any audio-shake combo)
- Atomic commit: `feat(03-01): Howler audio + AudioManager + iOS unlock`
</output>
