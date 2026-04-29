---
phase: 03-ui-audio-polish
reviewed: 2026-04-29T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - index.html
  - package.json
  - public/audio/CREDITS.md
  - src/a11y/motion.ts
  - src/anim/anim.ts
  - src/audio/AudioManager.ts
  - src/machine/gameMachine.ts
  - src/main.ts
  - src/particles/ParticleEmitter.ts
  - src/particles/createParticles.ts
  - src/storage/StorageManager.ts
  - src/ui/UIBridge.tsx
  - src/ui/components/Button.tsx
  - src/ui/components/LeaderboardList.tsx
  - src/ui/components/NewBestBadge.tsx
  - src/ui/components/Toggle.tsx
  - src/ui/screens/GameOverScreen.tsx
  - src/ui/screens/HUD.tsx
  - src/ui/screens/PauseScreen.tsx
  - src/ui/screens/SettingsModal.tsx
  - src/ui/screens/TitleScreen.tsx
  - src/ui/styles.css
  - tsconfig.json
  - vite.config.ts
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-29
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

The phase-03 code is well-structured overall. The audio, state machine, particle, and storage layers are clean and follow the project conventions. TypeScript strict mode is correctly enforced in `tsconfig.json`, named Three.js imports are used throughout, and the `noUncheckedIndexedAccess` guard is properly applied in hot loops. The GSAP and Howler integration patterns are sound.

Two critical issues were found: a stale-closure bug in `UIBridge` that causes the leaderboard push to fire multiple times on repeated game-over transitions, and a logic inversion in `SettingsModal` that causes the "Reduce Motion" toggle to display and persist the wrong state for the `'auto'` case. Six warnings cover missing AbortController discipline on keyboard listeners, a race between `fadeMusicOut` and `setMusicPlaying(false)`, dead event handler code paths, and a few correctness edge cases. Four info items note dead code and minor polish gaps.

---

## Critical Issues

### CR-01: Leaderboard pushed on every re-render into `gameOver`, not just on transition

**File:** `src/ui/UIBridge.tsx:62-66`

**Issue:** The transition guard `nextValue === 'gameOver' && prevValue !== 'gameOver'` is correct, but `prevValue` is captured in the closure at `useEffect` setup time and never escapes the closure — it is correctly a `let` local that is mutated on line 68 (`prevValue = nextValue`). However, `useEffect` has an **empty dependency array** (`[]`), which is intentional for a single subscription. The real problem is different: `props.storage.getBestScore()` is called on line 63 to capture `priorBest` **before** the leaderboard push on line 65. But `gameMachine`'s own `gameOver` entry action (in `gameMachine.ts:85-89`) **also calls `storage.setBestScore()`** synchronously before the xstate subscriber fires. This means `priorBest` captured on line 63 is already the **new** best score, not the prior best. As a result, `isNewBest` in `GameOverScreen` will always be `false` after a new-best run — the golden badge never shows.

**Fix:** Capture `priorBest` at the moment the score changes (i.e., track it in the `playing` state and snapshot it before the HIT transition), or remove the duplicate `setBestScore` call from the machine and let `UIBridge` be the sole authority. The simplest fix is to track the best before the HIT event — read `bestScore` from the snapshot context itself rather than re-reading `localStorage`:

```typescript
// UIBridge.tsx — in the subscriber, line 62
if (nextValue === 'gameOver' && prevValue !== 'gameOver') {
  // s.context.bestScore was updated by the machine's entry action BEFORE
  // this subscriber fires. Read the *previous* context instead:
  // Use priorBest captured when we entered 'playing', not at gameOver.
  // Simplest fix: track priorBest in a ref updated on START/RESTART:
  //   const priorBestRef = useRef(props.storage.getBestScore())
  //   ...on START/RESTART: priorBestRef.current = props.storage.getBestScore()
  //   ...on gameOver: setPriorBest(priorBestRef.current)
  const pb = priorBestRef.current
  setPriorBest(pb)
  props.storage.pushLeaderboard(s.context.score)
  setLeaderboard(props.storage.getLeaderboard())
}
```

### CR-02: "Reduce Motion" toggle logic inversion — `'auto'` treated as "on"

**File:** `src/ui/screens/SettingsModal.tsx:48`

**Issue:** The `reduceMotionOn` boolean is computed as:
```typescript
const reduceMotionOn = settings.reduceMotion !== 'off'
```
This means both `'on'` and `'auto'` show the toggle as **checked/enabled**. When a user opens settings for the first time, `reduceMotion` defaults to `'auto'`, so the toggle renders in the "Reduce Motion ON" state — which is misleading because the system media query may return `false` (motion is allowed). More critically, if the user then flips the toggle "off" and then back "on", it saves `'on'` (not `'auto'`), permanently overriding the system preference without the user intending to. The toggle represents a tri-state (`auto`/`on`/`off`) collapsed to a binary, but the collapsed mapping is wrong for the default case.

**Fix:** Map `'auto'` to the live media query result so the initial toggle display matches what will actually happen, or use a three-way control. The minimal fix that preserves binary toggle semantics:

```typescript
// SettingsModal.tsx line 48 — replace with:
const reduceMotionOn =
  settings.reduceMotion === 'on' ||
  (settings.reduceMotion === 'auto' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches)

// And in the onChange handler (line 75), always write 'on'/'off' (not 'auto')
// once the user has explicitly interacted, so the display stays consistent:
onChange: (v) => update({ reduceMotion: v ? 'on' : 'off' })
// (Already correct — this just needs the display fix above.)
```

---

## Warnings

### WR-01: Keyboard listeners bypass AbortController — accumulate across hot code paths

**File:** `src/ui/screens/GameOverScreen.tsx:24-31`, `src/ui/screens/PauseScreen.tsx:16-23`

**Issue:** Both screens attach `document.addEventListener('keydown', handleKey)` inside `useEffect` and clean up with `removeEventListener` in the effect cleanup. This pattern is correct for React/Preact lifecycle, **but** the CLAUDE.md mandate is "Event listeners use `AbortController`." More importantly, there is a latent bug: when `active` changes (effect re-runs), the old listener is removed and a new one is added. If Preact batches updates in a way that causes double-mount in strict mode, or if the component is retained in the VDOM while active flips rapidly, extra listeners could accumulate. Using `AbortController` would make this immune.

**Fix:**
```typescript
// GameOverScreen.tsx and PauseScreen.tsx — replace useEffect body:
useEffect(() => {
  const ac = new AbortController()
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && active) actor.send({ type: 'RESTART' }) // or RESUME
  }, { signal: ac.signal })
  return () => ac.abort()
}, [active, actor])
```

### WR-02: `fadeMusicOut` volume state is not reset before `setMusicPlaying(true)` on restart

**File:** `src/audio/AudioManager.ts:118-130`, cross-referenced with `src/main.ts:111-116`

**Issue:** When the bird dies, `fadeMusicOut(600)` is called, fading the Howl's volume to 0. On the next game start (`playing` state), `setMusicPlaying(true)` calls `this.music.play()` — but Howl's volume is still 0 from the fade. The music will play silently. Howler's `.fade()` does not reset `.volume()` automatically.

**Fix:** Reset volume before replaying:
```typescript
setMusicPlaying(playing: boolean): void {
  this.musicPlaying = playing
  if (playing && !this.musicMuted) {
    this.music.volume(0.4) // reset after potential fadeMusicOut
    if (this.unlocked) {
      this.music.play()
    }
  } else {
    this.music.pause()
  }
}
```

### WR-03: `unlock()` public method synthesises a fake `PointerEvent` — misuse risk

**File:** `src/audio/AudioManager.ts:153-155`

**Issue:** The public `unlock()` method calls `this.unlockHandler?.(new PointerEvent('pointerup'))`. The handler ignores the event argument entirely (it is typed `(e: PointerEvent) => void` but `e` is never used), so this works today. However, `new PointerEvent('pointerup')` is a synthetic event that is **not trusted** (`event.isTrusted === false`). On some browsers, `AudioContext.resume()` inside an untrusted event handler may be silently ignored (spec says resume requires a user gesture). If `unlock()` is ever called from non-gesture code (e.g., a timer), the iOS audio unlock will silently fail. The method is currently unused from external callers (not called in `main.ts`), making it dead code with a misleading contract.

**Fix:** Either remove the `unlock()` public method entirely (the internal `unlockHandler` is already wired), or document that it must only be called synchronously within a user gesture handler, and assert `event.isTrusted` inside the handler before calling `.resume()`:
```typescript
// Remove public unlock() — it's dead code and unsafe
// OR: mark it clearly and remove the synthesised PointerEvent:
unlock(): void {
  if (this.unlocked) return
  void Howler.ctx?.resume()
  this.unlocked = true
  if (this.unlockHandler) {
    document.removeEventListener('pointerup', this.unlockHandler)
    this.unlockHandler = null
  }
  if (this.musicPlaying && !this.musicMuted) this.music.play()
}
```

### WR-04: `prefersReducedMotion` module-level cache never resets across game sessions

**File:** `src/a11y/motion.ts:3,7`

**Issue:** `cachedReduceMotion` is a module-level singleton. It is only reset when `refreshReducedMotion()` is called explicitly (from `SettingsModal.update()`). If the user changes their OS-level `prefers-reduced-motion` media query **without** visiting settings (e.g., toggling system accessibility settings mid-session), the stale cache is never invalidated. This contradicts the `'auto'` setting semantics.

**Fix:** For `'auto'` mode, subscribe to the media query change event instead of relying on a static snapshot. At minimum, `prefersReducedMotion()` should skip the cache when `storage.getSettings().reduceMotion === 'auto'`:
```typescript
export function prefersReducedMotion(storage: StorageManager): boolean {
  const setting = storage.getSettings().reduceMotion
  if (setting === 'on') return true
  if (setting === 'off') return false
  // 'auto': always live-query, no cache
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```
(Remove the `cachedReduceMotion` state — it only adds value if `storage.getSettings()` is expensive, which it is not — it's just a JSON parse of a small object.)

### WR-05: `StorageManager.pushLeaderboard` rank is incorrect when two entries share the same score

**File:** `src/storage/StorageManager.ts:96-97`

**Issue:** The rank is computed as:
```typescript
const idx = data.leaderboard.findIndex((e) => e.score === score)
```
`findIndex` returns the **first** index where `e.score === score`. If the leaderboard already contains an older entry with the same score, the new entry lands after it (both are in the sorted array, but sorted by score desc — same scores preserve push order). `findIndex` will return the older entry's position, not the newly pushed entry's position, so `rank` will be off by 0-N positions. In practice this is a cosmetic issue (the game currently does not display `rank` from this return value in the UI), but the contract is wrong.

**Fix:** Compare by both score and timestamp to identify the newly pushed entry:
```typescript
const newTs = Date.now() // capture before push
data.leaderboard = [...data.leaderboard, { score, ts: newTs }]
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
const idx = data.leaderboard.findIndex((e) => e.ts === newTs)
const rank = idx >= 0 ? idx + 1 : null
```

### WR-06: `gameMachine.ts` contains a `console.log` outside a `DEV` guard

**File:** `src/machine/gameMachine.ts:95-103`

**Issue:** The `gameOver` entry action logs unconditionally:
```typescript
({ context }) => {
  console.log('[machine] GAME OVER:', context.score, '(best:', context.bestScore, ')')
}
```
There is no `import.meta.env.DEV` guard. Unlike the subscriber log in `main.ts` (which IS gated), this runs in production builds on every death. The comment above it even acknowledges it is a "Phase 2 debug log", indicating it was intentionally temporary.

**Fix:**
```typescript
({ context }) => {
  if (import.meta.env.DEV) {
    console.log('[machine] GAME OVER:', context.score, '(best:', context.bestScore, ')')
  }
},
```

---

## Info

### IN-01: HUD `anim.ts`'s `scorePop(el)` helper is never called — dead export

**File:** `src/anim/anim.ts:35-41`

**Issue:** `scorePop(el: HTMLElement | null)` toggles a CSS class via a forced-reflow trick. The HUD (`src/ui/screens/HUD.tsx`) implements the same score pop animation independently using Preact state (`popping` boolean + `setTimeout`). The `scorePop` export in `anim.ts` is imported nowhere and is dead code. Two mechanisms exist for the same visual effect.

**Fix:** Either remove `scorePop` from `anim.ts` and rely solely on the Preact state approach in `HUD.tsx`, or replace the Preact approach with a call to `scorePop`. The Preact approach using `requestAnimationFrame` double-tick is cleaner for VDOM rendering; removing `scorePop` from `anim.ts` is the lower-effort cleanup.

### IN-02: `Toggle` uses `aria-pressed` but `role="switch"` expects `aria-checked`

**File:** `src/ui/components/Toggle.tsx:11`

**Issue:** The element has `role="switch"` and `'aria-pressed': String(checked)`. The ARIA spec for `role="switch"` expects `aria-checked` (values: `"true"` / `"false"`), not `aria-pressed`. Screen readers will not correctly announce the on/off state.

**Fix:**
```typescript
// Toggle.tsx line 11 — replace aria-pressed with aria-checked:
'aria-checked': String(checked),
```

### IN-03: `@types/howler` in `dependencies` rather than `devDependencies`

**File:** `package.json:19`

**Issue:** `"@types/howler": "^2.2.12"` is listed under `dependencies`. Type-only packages should always be `devDependencies` — they are erased at compile time and should not be shipped or installed by downstream consumers.

**Fix:** Move to `devDependencies`:
```json
"devDependencies": {
  "@preact/preset-vite": "^2.10.5",
  "@types/howler": "^2.2.12",
  "@types/three": "^0.184.0",
  ...
}
```

### IN-04: `squashStretch` is not gated behind `prefersReducedMotion`

**File:** `src/main.ts:79`, `src/anim/anim.ts:5-14`

**Issue:** In `main.ts`, when a flap occurs, `squashStretch(bird.mesh)` is called unconditionally. The death screen shake and particle burst are correctly gated behind `prefersReducedMotion(storage)` (line 122-125), but the per-flap squash-and-stretch on the bird is not. The CLAUDE.md mandate is: "`prefers-reduced-motion` checked in JS ... before triggering screen shake / particles / aggressive tweens." A scale tween on every flap qualifies as an aggressive tween.

**Fix:**
```typescript
// main.ts line 79 — wrap squashStretch:
if (!prefersReducedMotion(storage)) {
  squashStretch(bird.mesh)
}
```

---

_Reviewed: 2026-04-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
