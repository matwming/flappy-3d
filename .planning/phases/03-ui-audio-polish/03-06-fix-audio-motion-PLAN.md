---
phase: 03-ui-audio-polish
plan: 06
type: execute
wave: 1
depends_on: []
files_modified:
  - src/main.ts
  - src/audio/AudioManager.ts
autonomous: true
gap_closure: true
requirements_addressed:
  - HUD-04
  - AUD-03
  - ANIM-06

must_haves:
  truths:
    - "Music stops when the game enters the 'paused' state"
    - "Tabbing away while 'playing' sends a PAUSE event to the actor via visibilitychange listener"
    - "Music resumes at full volume (0.4) after restart — not silently at volume 0 after a fade"
    - "squashStretch on flap is skipped when prefersReducedMotion returns true"
  artifacts:
    - path: "src/main.ts"
      provides: "visibilitychange listener registered with AbortController; 'paused' audio branch in actor.subscribe; squashStretch gated"
      contains: "visibilitychange"
    - path: "src/audio/AudioManager.ts"
      provides: "volume reset to 0.4 before play() in setMusicPlaying(true)"
      contains: "this.music.volume(0.4)"
  key_links:
    - from: "src/main.ts visibilitychange"
      to: "actor.send PAUSE"
      via: "document.hidden check"
      pattern: "visibilitychange"
    - from: "src/main.ts actor.subscribe"
      to: "audio.setMusicPlaying(false)"
      via: "paused branch"
      pattern: "paused.*setMusicPlaying"
    - from: "src/audio/AudioManager.ts setMusicPlaying"
      to: "this.music.volume(0.4)"
      via: "reset before play()"
      pattern: "music\\.volume\\(0\\.4\\)"
---

<objective>
Fix three audio + motion-gate gaps from 03-VERIFICATION.md: (1) add visibilitychange auto-pause listener wired through the existing AbortController, (2) add a 'paused' branch in the audio subscriber so music stops during pause, (3) reset Howler volume before restarting music after a fade-out, and (4) gate squashStretch behind prefersReducedMotion per CLAUDE.md mandate.

Purpose: Unblock HUD-04 and AUD-03; complete ANIM-06 gate coverage per CLAUDE.md.
Output: Targeted edits to src/main.ts and src/audio/AudioManager.ts only.
</objective>

<execution_context>
@/Users/ming/.claude/get-shit-done/workflows/execute-plan.md
@/Users/ming/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ming/projects/flappy-3d/.planning/PROJECT.md
@/Users/ming/projects/flappy-3d/.planning/ROADMAP.md
@/Users/ming/projects/flappy-3d/.planning/STATE.md
@/Users/ming/projects/flappy-3d/CLAUDE.md

<!-- Key interfaces and current code extracted from codebase -->
<interfaces>
From src/main.ts (current — full file already read):

The file currently does NOT use AbortController anywhere. CLAUDE.md mandates AbortController for
event listeners to prevent accumulation across restarts. The visibilitychange listener must be
registered with one.

Current structure relevant to changes:
- Line 70-84: `input.onFlap` handler — contains `squashStretch(bird.mesh)` at line 80 (unconditional)
- Lines 104-134: `actor.subscribe` callback — handles 'playing', 'dying', 'gameOver'/'title' for audio
  but has NO 'paused' branch. The subscribe is set up AFTER `actor.start()` on line 98.

Current audio branches in actor.subscribe (lines 111-118):
```typescript
if (s === 'playing') {
  audio.setMusicPlaying(true)
} else if (s === 'dying') {
  audio.fadeMusicOut(600)
  audio.playDeath()
} else if (s === 'gameOver' || s === 'title') {
  audio.setMusicPlaying(false)
}
```

Required changes:

**A — visibilitychange listener (Gap 3 / HUD-04):**
Add AFTER `actor.start()` (around line 98) and BEFORE `ui.mount()`:
```typescript
const ac = new AbortController()
document.addEventListener(
  'visibilitychange',
  () => {
    if (document.hidden && actor.getSnapshot().value === 'playing') {
      actor.send({ type: 'PAUSE' })
    }
  },
  { signal: ac.signal },
)
```
Note: The AbortController `ac` should be created before `actor.start()` is called, and the
listener registered after. The `ac.abort()` should be called from a cleanup path if one exists,
or left as a module-level controller for the app lifetime (acceptable — the listener is document-scoped
and intentionally lives for the full app session). Do NOT call `ac.abort()` unless there is an
explicit dispose/cleanup path in main.ts. Looking at the current code, there is no cleanup — leave
`ac` as a const in the else-block scope, which means it lives for the app lifetime. This is correct.

Per CLAUDE.md: "Event listeners use AbortController." — this fix satisfies that mandate.

**B — 'paused' branch in actor.subscribe audio block (Gap 3 / AUD-03):**
Add `else if (s === 'paused')` to the audio control chain:
```typescript
if (s === 'playing') {
  audio.setMusicPlaying(true)
} else if (s === 'dying') {
  audio.fadeMusicOut(600)
  audio.playDeath()
} else if (s === 'paused') {
  audio.setMusicPlaying(false)
} else if (s === 'gameOver' || s === 'title') {
  audio.setMusicPlaying(false)
}
```
Note: `setMusicPlaying(false)` calls `this.music.pause()` (not fade). This is correct for pause —
do NOT use fadeMusicOut (that's for death only). When the actor transitions from 'paused' back to
'playing', the existing `s === 'playing'` branch calls `setMusicPlaying(true)` which will resume.

**C — squashStretch motion gate (Gap 5 / CLAUDE.md mandate):**
In the `input.onFlap` handler (line 80), wrap squashStretch:
```typescript
// Before (line 80):
squashStretch(bird.mesh)
// After:
if (!prefersReducedMotion(storage)) {
  squashStretch(bird.mesh)
}
```
`prefersReducedMotion` is already imported (line 24). `storage` is already in scope (line 40).

From src/audio/AudioManager.ts (current — full file already read):

Current `setMusicPlaying` (lines 118-130):
```typescript
setMusicPlaying(playing: boolean): void {
  this.musicPlaying = playing
  if (playing && !this.musicMuted) {
    if (this.unlocked) {
      if (this.musicLoaded) this.music.play()
      else this.music.play()
    }
  } else {
    this.music.pause()
  }
}
```

Required change (Gap 6 / AUD-03):
The music Howl's volume is set to 0.4 in the constructor. `fadeMusicOut()` calls `this.music.fade(currentVol, 0, durationMs)` which sets volume to 0. When `setMusicPlaying(true)` is called on the next restart, it calls `this.music.play()` but the volume is still 0 — silent playback.

Fix: reset volume before calling play() when `playing === true`:
```typescript
setMusicPlaying(playing: boolean): void {
  this.musicPlaying = playing
  if (playing && !this.musicMuted) {
    this.music.volume(0.4)   // reset after potential fadeMusicOut
    if (this.unlocked) {
      this.music.play()
    }
  } else {
    this.music.pause()
  }
}
```
Note: The `if (this.musicLoaded) ... else this.music.play()` branches are identical — collapse them
into a single `this.music.play()` as part of this fix (both paths called play() anyway; Howler
queues internally if not yet loaded).

The baseline volume is 0.4 — confirmed from the Howl constructor at line 65: `volume: 0.4`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add visibilitychange auto-pause + 'paused' audio branch + squashStretch gate in main.ts</name>
  <files>src/main.ts</files>
  <read_first>src/main.ts — read the full file to confirm current line numbers for the onFlap handler, actor.subscribe audio block, and the location of actor.start() before editing.</read_first>
  <action>
Three targeted edits to src/main.ts. Make all three changes in a single edit pass.

**Edit A — squashStretch gate (line ~80 in onFlap handler):**
Wrap the existing unconditional `squashStretch(bird.mesh)` call:
```typescript
// Replace:
squashStretch(bird.mesh)
// With:
if (!prefersReducedMotion(storage)) {
  squashStretch(bird.mesh)
}
```

**Edit B — visibilitychange listener (after actor.start(), before loop.start()):**
Add a new AbortController and visibilitychange listener. Insert AFTER `actor.start()` and BEFORE
`ui.mount()` (or after `ui.mount()` — either works since it just needs to be set up before the
first 'playing' transition is possible). Use AbortController per CLAUDE.md mandate:
```typescript
const ac = new AbortController()
document.addEventListener(
  'visibilitychange',
  () => {
    if (document.hidden && actor.getSnapshot().value === 'playing') {
      actor.send({ type: 'PAUSE' })
    }
  },
  { signal: ac.signal },
)
```
The AbortController lives for the app lifetime — there is no dispose path in main.ts, so `ac.abort()`
is not called. This is intentional for a single-page game app with no teardown.

**Edit C — 'paused' audio branch in actor.subscribe:**
In the audio control if-chain inside actor.subscribe, add the 'paused' case:
```typescript
// Add between the 'dying' branch and the 'gameOver || title' branch:
} else if (s === 'paused') {
  audio.setMusicPlaying(false)
}
```
The full updated chain becomes:
```typescript
if (s === 'playing') {
  audio.setMusicPlaying(true)
} else if (s === 'dying') {
  audio.fadeMusicOut(600)
  audio.playDeath()
} else if (s === 'paused') {
  audio.setMusicPlaying(false)
} else if (s === 'gameOver' || s === 'title') {
  audio.setMusicPlaying(false)
}
```

Do NOT add any other changes. Do NOT import anything new (all needed imports are already present).
  </action>
  <verify>
    <automated>
      grep -n "visibilitychange" /Users/ming/projects/flappy-3d/src/main.ts
      grep -n "AbortController" /Users/ming/projects/flappy-3d/src/main.ts
      grep -n "paused" /Users/ming/projects/flappy-3d/src/main.ts
      grep -nB1 "squashStretch(bird.mesh)" /Users/ming/projects/flappy-3d/src/main.ts
      cd /Users/ming/projects/flappy-3d && npx tsc --noEmit
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "visibilitychange" src/main.ts` returns ≥1 hit
    - `grep -n "AbortController" src/main.ts` returns ≥1 hit
    - `grep -n "paused" src/main.ts` returns a hit showing `setMusicPlaying(false)` in the 'paused' branch
    - `grep -nB1 "squashStretch(bird.mesh)" src/main.ts` shows `prefersReducedMotion` check on the line immediately above
    - `tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>visibilitychange sends PAUSE to actor when tab is hidden during 'playing' state; music stops on 'paused' entry; squashStretch is skipped when prefersReducedMotion returns true.</done>
</task>

<task type="auto">
  <name>Task 2: Fix music volume reset in AudioManager.setMusicPlaying</name>
  <files>src/audio/AudioManager.ts</files>
  <read_first>src/audio/AudioManager.ts — read lines 118-130 (setMusicPlaying method) and line 65 (music Howl constructor volume) to confirm the baseline volume value before editing.</read_first>
  <action>
Surgical fix to setMusicPlaying to reset volume before calling play() on restart.

Current method (lines 118-130):
```typescript
setMusicPlaying(playing: boolean): void {
  this.musicPlaying = playing
  if (playing && !this.musicMuted) {
    if (this.unlocked) {
      if (this.musicLoaded) this.music.play()
      else this.music.play()
    }
  } else {
    this.music.pause()
  }
}
```

Replace with:
```typescript
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
```

Changes made:
1. Add `this.music.volume(0.4)` before the unlocked check — resets Howler volume from 0 back to baseline (0.4 matches constructor value at line 65)
2. Collapse the redundant `if (this.musicLoaded) this.music.play() else this.music.play()` into a single `this.music.play()` — both branches were identical; Howler queues internally if not yet loaded
3. Add comment explaining the volume reset purpose

Do NOT change fadeMusicOut, setMusicMuted, or any other method. Do NOT change the volume value — 0.4 is the baseline confirmed from the Howl constructor.
  </action>
  <verify>
    <automated>
      grep -n "this.music.volume" /Users/ming/projects/flappy-3d/src/audio/AudioManager.ts
      grep -n "setMusicPlaying" /Users/ming/projects/flappy-3d/src/audio/AudioManager.ts
      cd /Users/ming/projects/flappy-3d && npx tsc --noEmit
      cd /Users/ming/projects/flappy-3d && npm run build
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "this.music.volume" src/audio/AudioManager.ts` returns a hit showing `this.music.volume(0.4)` inside `setMusicPlaying`
    - `grep -n "musicLoaded" src/audio/AudioManager.ts` — the redundant musicLoaded branch inside setMusicPlaying is removed (the field still exists for playFlap/playScore/playDeath synth-fallback logic; only the duplicate play() paths are collapsed)
    - `tsc --noEmit` exits 0
    - `npm run build` exits 0 with bundle under 250KB gzip
  </acceptance_criteria>
  <done>Music resumes at volume 0.4 on the next 'playing' entry after a fade-out death. Players will hear music on restart instead of silent playback.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| document visibility → actor | visibilitychange sends PAUSE; only fires when browser hides the page |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-06-01 | Denial of Service | visibilitychange auto-pause | accept | listener only sends PAUSE in 'playing' state; no PII, no network; AbortController prevents accumulation |
| T-03-06-02 | Tampering | document.hidden spoofing | accept | browser-controlled API; no user-controlled input crosses this boundary |
</threat_model>

<verification>
After both tasks complete:
1. `cd /Users/ming/projects/flappy-3d && npx tsc --noEmit` — must exit 0
2. `npm run build` — must exit 0; bundle under 250KB gzip
3. `grep -n "visibilitychange" src/main.ts` — returns ≥1 hit
4. `grep -n "AbortController" src/main.ts` — returns ≥1 hit
5. `grep -nB1 "squashStretch(bird.mesh)" src/main.ts` — prefersReducedMotion check visible immediately above
6. `grep -n "s === 'paused'" src/main.ts` — returns 1 hit showing setMusicPlaying(false) call
7. `grep -n "this.music.volume(0.4)" src/audio/AudioManager.ts` — returns 1 hit inside setMusicPlaying
</verification>

<success_criteria>
- Tabbing away during play sends PAUSE to actor (auto-pause on visibilitychange — HUD-04)
- Music pauses when actor enters 'paused' state (AUD-03)
- Music restores full volume (0.4) on restart after fade-out death (AUD-03)
- squashStretch is skipped when prefersReducedMotion returns true (CLAUDE.md + ANIM-06 gate)
- TypeScript strict check and build both pass
- Requirements HUD-04 and AUD-03 move from BLOCKED/PARTIAL to SATISFIED
</success_criteria>

<output>
After completion, create `/Users/ming/projects/flappy-3d/.planning/phases/03-ui-audio-polish/03-06-fix-audio-motion-SUMMARY.md` following the summary template.
</output>
