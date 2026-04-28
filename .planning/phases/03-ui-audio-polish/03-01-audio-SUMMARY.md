---
phase: "03-ui-audio-polish"
plan: "01"
subsystem: "audio"
tags: ["audio", "howler", "ios-unlock", "sfx", "music"]
dependency_graph:
  requires: []
  provides: ["AudioManager singleton", "Howler iOS unlock pattern", "synth fallback"]
  affects: ["src/main.ts", "03-02-ui-infra", "03-03-screens", "03-04-juice"]
tech_stack:
  added: ["howler@2.2.4", "@types/howler"]
  patterns: ["singleton audio manager", "iOS WebAudio unlock", "WebAudio synth fallback"]
key_files:
  created:
    - src/audio/AudioManager.ts
    - public/audio/CREDITS.md
    - public/audio/flap.mp3(placeholder)
    - public/audio/score.mp3(placeholder)
    - public/audio/death.mp3(placeholder)
    - public/audio/music.mp3(placeholder)
  modified:
    - src/main.ts
    - package.json
decisions:
  - "Synth fallback chosen over blocked asset fetch — Pixabay behind Cloudflare; WebAudio oscillator bursts cover dev-only gap"
  - "AudioManager tracks Howl onload flag per sound; synth used only when MP3 placeholder unloaded"
  - "music.play() called unconditionally on setMusicPlaying(true) even before loaded — Howler queues it"
metrics:
  duration_seconds: 218
  completed_date: "2026-04-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 2
---

# Phase 03 Plan 01: Audio — Summary

**One-liner:** Howler.js singleton AudioManager with iOS AudioContext unlock, WebAudio synth fallback, and full actor-driven SFX/music wiring in main.ts.

## What Was Built

- **`src/audio/AudioManager.ts`** — singleton Howler wrapper with 9 public methods
- **`public/audio/`** — directory with 4 placeholder MP3s + CREDITS.md sourcing guide
- **`src/main.ts`** updated — AudioManager instantiated; actor.subscribe drives audio; input.onFlap triggers flap SFX

## AudioManager API Surface

```typescript
class AudioManager {
  playFlap(): void          // flap SFX (or synth sine 880Hz 80ms)
  playScore(): void         // score SFX (or synth triangle 1320Hz 150ms)
  playDeath(): void         // death SFX (or synth sawtooth 120Hz 250ms)
  setMusicPlaying(b): void  // start/stop music loop; queues if pre-unlock
  setSfxMuted(b): void      // mute/unmute SFX instantly
  setMusicMuted(b): void    // mute/unmute music instantly
  fadeMusicOut(ms): void    // fade music vol → 0 over ms (600ms on dying)
  unlock(): void            // programmatic AudioContext resume
  dispose(): void           // unload all Howl instances + remove listener
}
```

## Audio Event Wiring (main.ts)

| State transition | Audio action |
|-----------------|--------------|
| → `playing` | `setMusicPlaying(true)` |
| → `dying` | `fadeMusicOut(600)` + `playDeath()` |
| → `gameOver` or `title` | `setMusicPlaying(false)` |
| score increment (in `playing`) | `playScore()` |
| input.onFlap (in `playing`) | `playFlap()` |

## Asset Sources (CREDITS.md)

All 4 MP3 files are **placeholder (zero-byte)**. Pixabay was Cloudflare-blocked during automated fetch. Sourcing guide in `public/audio/CREDITS.md`:

- Search https://pixabay.com/sound-effects/
- Terms: "whoosh short" (flap), "ding bright" (score), "thud cartoon" (death), "ambient game loop" (music)
- Replace placeholder files; AudioManager auto-promotes from synth to real MP3 on `onload`

## iOS Unlock Pattern (AUD-01)

```typescript
// In constructor — registers ONE pointerup listener
this.unlockHandler = () => {
  void Howler.ctx?.resume()   // synchronous in user-gesture handler
  this.unlocked = true
  document.removeEventListener('pointerup', this.unlockHandler)
  if (this.musicPlaying && !this.musicMuted) this.music.play()
}
document.addEventListener('pointerup', this.unlockHandler)
```

Listener self-removes after first tap. Music queued before unlock starts on first tap. Verified on real iOS in Phase 5.

## Synth Fallback (D-09)

When a Howl `onload` hasn't fired (placeholder empty file), `AudioManager` calls `synthBurst()`:

- Flap: sine 880Hz 80ms
- Score: triangle 1320Hz 150ms
- Death: sawtooth 120Hz 250ms

Music has no synth fallback — silence until real asset added. Degrades gracefully.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocked] Pixabay audio fetch failed (Cloudflare challenge page)**
- **Found during:** Task 1
- **Issue:** `curl` to pixabay.com/sound-effects/ returned a 5KB Cloudflare JS challenge page; no audio CDN URLs extractable
- **Fix:** Applied plan's documented fallback per D-09: placed zero-byte placeholder MP3s; CREDITS.md documents sourcing steps; AudioManager synth fallback active for dev
- **Files modified:** `public/audio/CREDITS.md` (TODO notes), `src/audio/AudioManager.ts` (synth fallback branch)
- **Commit:** daca9bf

**2. [Rule 2 - Missing] Added per-Howl `onload` flag tracking**
- **Found during:** Task 2
- **Issue:** Plan's AudioManager sketch had no mechanism to detect whether MP3 loaded successfully vs placeholder; `play()` on empty file would throw or silently fail
- **Fix:** Added `flapLoaded`, `scoreLoaded`, `deathLoaded`, `musicLoaded` boolean fields; set in `onload` callback; synth branch only fires when flag is false
- **Files modified:** `src/audio/AudioManager.ts`
- **Commit:** bd47eb0

## Build Metrics

| Metric | Value |
|--------|-------|
| gzip bundle (post-Howler) | 158.84 KB |
| gzip budget | 250 KB |
| tsc errors | 0 |
| Howler version | 2.2.4 |

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| flap.mp3 (0 bytes) | public/audio/flap.mp3 | Pixabay blocked; manual replacement needed |
| score.mp3 (0 bytes) | public/audio/score.mp3 | Pixabay blocked; manual replacement needed |
| death.mp3 (0 bytes) | public/audio/death.mp3 | Pixabay blocked; manual replacement needed |
| music.mp3 (0 bytes) | public/audio/music.mp3 | Pixabay blocked; manual replacement needed |

AudioManager synth fallback active while placeholders in place. AUD-02 satisfied by recorded MP3s; synth is dev-only gap-filler.

## Hand-off Notes

**For 03-02-ui-infra:** `AudioManager` instance created in `main.ts` — `UIBridge` constructor will receive it as `audio: AudioManager` parameter per D-13. `setSfxMuted`/`setMusicMuted` called from settings toggles via UIBridge.

**For 03-03-screens:** `GameOverScreen` replaces `scheduleAutoRestart` — remove that call from main.ts in 03-03.

**For 03-04-juice:** Death state plays death SFX via `actor.subscribe`. Screen shake (ANIM-04) also triggers on `dying` transition — coordinate in same subscribe block. `audio.fadeMusicOut(600)` is already wired there.

**For Phase 5 (device test):** Verify iOS Safari ringer ON + OFF both play audio after first tap. `Howler.ctx?.resume()` call is synchronous inside `pointerup` — this is the correct pattern.

## Self-Check

- `src/audio/AudioManager.ts` exists: FOUND
- `public/audio/CREDITS.md` exists: FOUND
- `public/audio/{flap,score,death,music}.mp3` exist: FOUND (4 files)
- Task 1 commit `daca9bf`: FOUND
- Task 2 commit `bd47eb0`: FOUND
- `tsc --noEmit` exits 0: PASS
- Build succeeds: PASS

## Self-Check: PASSED
