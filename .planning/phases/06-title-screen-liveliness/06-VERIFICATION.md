---
phase: 06-title-screen-liveliness
verified: 2026-04-29T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open dev server, navigate to title screen, observe bird"
    expected: "Bird bobs up and down visibly at ~1Hz rhythm within 2 seconds of the title screen appearing"
    why_human: "Sine-wave rendering requires visual confirmation; code is correctly wired but smooth animation must be felt"
  - test: "Leave title screen for ~5 seconds, observe background"
    expected: "Pipe obstacles scroll continuously from right to left at a relaxed pace; no collision occurs; pipes despawn and respawn in a loop"
    why_human: "ScrollSystem + ObstacleSpawner title gate is wired correctly in code but pipe visual continuity requires live observation"
  - test: "Open title screen, observe music volume; tap to start, observe music volume"
    expected: "Music is audibly quieter on the title screen (0.2) than during gameplay (0.4); transition is immediate on START"
    why_human: "Audio volume levels require human ear to confirm perceptible difference"
  - test: "Enable OS-level Reduce Motion setting (System Settings > Accessibility > Display > Reduce Motion), reload, observe title screen"
    expected: "Bird is completely stationary on the title screen; CTA paragraph is static opacity (no pulse); logo letters all appear immediately visible"
    why_human: "Motion-gating behavior across OS setting + CSS media query + JS matchMedia requires live device verification"
  - test: "Reload fresh page (first ever visit), observe 'FLAPPY 3D' heading"
    expected: "Letters F, L, A, P, P, Y, (space), 3, D fade in sequentially from left to right with ~50ms stagger"
    why_human: "GSAP tween runs asynchronously in the browser; requires visual confirmation of stagger timing"
  - test: "Die or go to Game Over, tap 'Back to Title', observe heading"
    expected: "Logo letters are already fully visible; no re-animation fires"
    why_human: "useRef hasAnimated guard prevents re-trigger; correctness requires runtime navigation test"
  - test: "Observe 'Tap anywhere to start' CTA on the title screen"
    expected: "CTA pulses smoothly between dim (0.6 opacity) and bright (1.0 opacity) over a 1.6s rhythm"
    why_human: "CSS animation timing requires visual confirmation; grep confirms the rule is present and wired"
---

# Phase 6: Title-Screen Liveliness Verification Report

**Phase Goal:** After Phase 6, the Title screen feels alive within 2 seconds of opening — the bird bobs gently, demo pipes scroll past in the background, the logo animates in, and the "Tap to start" CTA pulses subtly. All effects motion-gated.
**Verified:** 2026-04-29
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Bird bobs visibly up and down on a sine wave while the title screen is showing | VERIFIED | `main.ts:133` — `bird.mesh.position.y = bird.position.y + Math.sin(bobTime * Math.PI * 2) * 0.15`; writes to `mesh.position.y` (not physics `position.y`); accumulator `bobTime` increments only when `s === 'title'` |
| 2 | Bird bob is completely absent when prefersReducedMotion is true | VERIFIED | `main.ts:128-130` — `if (prefersReducedMotion(storage)) { bird.mesh.position.y = bird.position.y; return }` using the full storage-aware `prefersReducedMotion()` helper |
| 3 | Demo pipes scroll continuously from right to left on the title screen with no collision | VERIFIED | `ScrollSystem.ts:31-37` — `isTitleDemo = state === 'title'`; gate relaxed to run on title at `TITLE_DEMO_SCROLL_SPEED = 1.8`; `ObstacleSpawner.ts:31-42` — identical gate with `TITLE_DEMO_DIFFICULTY`; `CollisionSystem.ts:22` — still hard-gated `!== 'playing'` only |
| 4 | Music plays at reduced volume (0.2) on the title screen | VERIFIED | `main.ts:212-215` — `title` branch calls `audio.setMusicPlaying(true)` then `audio.setMusicVolume(0.2)`; `AudioManager.ts:133-135` — `setMusicVolume(volume)` passes through to `this.music.volume(volume)` |
| 5 | Music volume restored to 0.4 when gameplay starts | VERIFIED | `main.ts:205-206` — `playing` branch calls `audio.setMusicPlaying(true)` then `audio.setMusicVolume(0.4)` |
| 6 | All demo pipes are cleared when the round starts (title → playing) | VERIFIED | `main.ts:170-181` — `actor.on('roundStarted')` hook calls `pair.hide()` + `obstaclePool.release(pair)` for all active pairs before gameplay; this runs unconditionally on START/RESTART |
| 7 | "Flappy 3D" logo letters fade in staggered ~50ms apart on title mount | VERIFIED | `TitleScreen.tsx:22-46` — `LOGO_TEXT.split('')` produces 9 chars; each rendered as `.title-letter` span; `gsap.from(spans, { stagger: 0.05, duration: 0.35, ease: 'power2.out', ... })` in one-shot `useEffect([], [])` |
| 8 | Logo animation does not replay when navigating back to title | VERIFIED | `TitleScreen.tsx:25,29,33` — `hasAnimated = useRef(false)`; guard `if (hasAnimated.current) return` before any tween; `hasAnimated.current = true` set before GSAP call; ref persists across renders |
| 9 | Logo animation is skipped entirely when prefersReducedMotion is true | VERIFIED | `TitleScreen.tsx:31` — `if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return` before GSAP tween |
| 10 | CTA pulses from opacity 0.6 to 1.0 over 1.6s; static when reduced-motion | VERIFIED | `styles.css:140-152` — `.title-cta.pulse { animation: ctaPulse 1.6s ease-in-out infinite }` + `@keyframes ctaPulse { 0%,100% { opacity: 0.6 } 50% { opacity: 1 } }` + `@media (prefers-reduced-motion: reduce) { .title-cta.pulse { animation: none; opacity: 0.85 } }`; `TitleScreen.tsx:58,93` — JS-level `reducedMotion = window.matchMedia(...).matches` gates whether `pulse` class is applied at all |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/main.ts` | Bird bob accumulator + title-state music volume wiring | VERIFIED | `bobTime` declared at line 113; sine loop at 121-135; music volume branches at 204-218 |
| `src/systems/ScrollSystem.ts` | Title-state scroll gate | VERIFIED | `isTitleDemo` pattern at lines 31-37; `TITLE_DEMO_SCROLL_SPEED = 1.8` constant |
| `src/systems/ObstacleSpawner.ts` | Title-state spawn gate with lower-pressure difficulty | VERIFIED | `TITLE_DEMO_DIFFICULTY` constant at lines 9-13; `isTitleDemo` gate at 31-42; `DifficultyConfig` type imported |
| `src/audio/AudioManager.ts` | setMusicVolume helper | VERIFIED | Method at line 133-135; thin pass-through to `this.music.volume(volume)` |
| `src/ui/screens/TitleScreen.tsx` | Letter-stagger GSAP timeline + hasAnimated ref guard + reducedMotion CTA gate | VERIFIED | All three present: useRef+hasAnimated (lines 25-46), gsap.from with stagger (38-45), reducedMotion + pulse class (58, 93) |
| `src/ui/styles.css` | CTA pulse keyframe with 1.6s duration + reduced-motion override | VERIFIED | `.title-cta.pulse` at 140-142; `@keyframes ctaPulse` at 143-146; `@media (prefers-reduced-motion)` at 147-152 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `main.ts` actor loop step | `bird.mesh.position.y` | `bobTime` accumulator + `Math.sin` | WIRED | Line 133: `bird.mesh.position.y = bird.position.y + Math.sin(bobTime * Math.PI * 2) * 0.15` |
| `main.ts` actor.subscribe title branch | `audio.setMusicVolume(0.2)` | After `setMusicPlaying(true)` | WIRED | Lines 214-215; order is correct |
| `ScrollSystem.ts` state check | title state scroll | `isTitleDemo` flag + `TITLE_DEMO_SCROLL_SPEED` | WIRED | Lines 31-37 |
| `ObstacleSpawner.ts` state check | title state spawn | `isTitleDemo` flag + `TITLE_DEMO_DIFFICULTY` | WIRED | Lines 31-42 |
| `CollisionSystem.ts` state check | playing-only gate | `!== 'playing'` return | UNCHANGED | Line 22: verified unchanged — no title collision risk |
| `TitleScreen.tsx` useEffect | GSAP timeline | `gsap.from(spans, { stagger: 0.05, ... })` | WIRED | Lines 35-45; DOM query targets `.title-heading .title-letter` |
| `.title-cta.pulse` CSS class | `@keyframes ctaPulse` | `animation: ctaPulse 1.6s` property | WIRED | Lines 140-146 in styles.css |
| `TitleScreen.tsx` reducedMotion | `.pulse` class conditional | `reducedMotion ? '' : ' pulse'` | WIRED | Lines 58, 93 |

---

### Data-Flow Trace (Level 4)

Not applicable for this phase. All effects are driven by game-loop ticks and CSS animations, not data fetching. The ObstacleSpawner spawns into an ObjectPool (pre-warmed at init), not fetched data.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| tsc type check | `npx tsc --noEmit` | Exit 0, no output | PASS |
| Build succeeds within budget | `npm run build` | Exit 0; gzip 195.32 KB (budget: 250 KB) | PASS |
| bobTime declared + used | `grep -n "bobTime" src/main.ts` | 4 hits (declare, reset, increment, use in sine) | PASS |
| Math.sin used with bobTime | `grep -n "Math\.sin" src/main.ts` | 1 hit at line 133 | PASS |
| setMusicVolume(0.2) in title branch | `grep -n "setMusicVolume(0.2)" src/main.ts` | 1 hit at line 215 | PASS |
| setMusicVolume(0.4) in playing branch | `grep -n "setMusicVolume(0.4)" src/main.ts` | 1 hit at line 206 | PASS |
| CollisionSystem unchanged | `grep -n "playing" src/systems/CollisionSystem.ts` | Single gate at line 22 only | PASS |
| GSAP stagger wired | `grep -n "stagger" src/ui/screens/TitleScreen.tsx` | 1 hit at line 42 | PASS |
| 1.6s keyframe present | `grep -n "1\.6s" src/ui/styles.css` | 1 hit in .title-cta.pulse | PASS |
| prefers-reduced-motion CSS override | `grep -n "prefers-reduced-motion" src/ui/styles.css` | 1 hit at line 147 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BEAUTY-01 | 06-01-PLAN.md | Bird hover-bobs ~1Hz ±0.15m on title; freezes when prefersReducedMotion | SATISFIED | `main.ts:113-135` — `Math.sin(bobTime * Math.PI * 2) * 0.15`; prefersReducedMotion gate; writes mesh.position.y only |
| BEAUTY-02 | 06-01-PLAN.md | Demo pipes scroll on title via ScrollSystem/ObstacleSpawner; no collision; quieter music | SATISFIED | ScrollSystem.ts + ObstacleSpawner.ts title gates; CollisionSystem unchanged; AudioManager.setMusicVolume wired |
| BEAUTY-03 | 06-02-PLAN.md | Logo letters fade in staggered ~50ms apart; one-shot; no re-trigger on back-to-title | PARTIALLY SATISFIED (code) / NEEDS HUMAN (visual) | TitleScreen.tsx has correct GSAP timeline + hasAnimated ref; visual stagger quality needs human confirmation |
| BEAUTY-04 | 06-02-PLAN.md | CTA pulse 0.6↔1.0 over 1.6s; static on reduced-motion | PARTIALLY SATISFIED (code) / NEEDS HUMAN (visual) | styles.css has correct keyframe + media query; TitleScreen.tsx has reducedMotion JS gate; visual rhythm needs human confirmation |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/audio/AudioManager.ts` | 3 | Comment: "placeholder/unavailable" | INFO | Pre-existing design note about synth fallback; not a stub — the synth fallback IS the intentional implementation when MP3s fail to load. No action needed. |

No blockers found. No stub return values. No hardcoded empty data flowing to rendering.

One subtle note: `setMusicPlaying(true)` in the `title` branch calls `this.music.volume(0.4)` internally (line 119 of AudioManager) before `setMusicVolume(0.2)` is called on the next line of main.ts. The volume is then immediately overwritten to 0.2 by the explicit `setMusicVolume` call. Net result is correct (0.2 on title), but there is a one-frame flash at 0.4 before the override. This is pre-existing AudioManager design and is unlikely to be audible.

---

### Human Verification Required

These items require running the dev server (`npm run dev`) or production build on a real browser:

#### 1. Bird bob visual

**Test:** Open title screen (no interaction), observe the bird for 2 seconds.
**Expected:** Bird rises and falls smoothly at approximately 1 cycle per second with visible ±0.15m amplitude — a gentle, non-jarring bob.
**Why human:** Sine animation smoothness, amplitude perception, and frame rate are only verifiable visually.

#### 2. Demo pipes scrolling

**Test:** Wait ~5 seconds on the title screen.
**Expected:** Green/teal pipe obstacles scroll from right to left at a relaxed pace. They despawn on the left edge and new ones spawn from the right in a continuous loop. No collision or death event fires.
**Why human:** Pipe visual continuity across the full spawn/scroll/despawn cycle requires live observation.

#### 3. Music volume differential

**Test:** Listen on the title screen, then tap to start and listen during gameplay.
**Expected:** Title screen music is noticeably quieter (0.2 vs 0.4 — about half the perceived loudness). Transition is immediate on START.
**Why human:** Audio volume perception requires a human ear; no automated tool can assert "audibly quieter."

#### 4. Reduced-motion gate (OS level)

**Test:** Enable System Settings > Accessibility > Display > Reduce Motion. Reload the page.
**Expected:** Bird is completely stationary on title. CTA text "Tap anywhere to start" has static opacity with no pulse animation. Logo letters all appear instantly with no stagger animation.
**Why human:** Requires OS setting toggle + browser reload; cross-checks JS matchMedia AND CSS media query simultaneously.

#### 5. Logo stagger animation (first load)

**Test:** Clear browser cache, reload the page for the first time.
**Expected:** The 9 characters of "FLAPPY 3D" fade in sequentially from left to right with ~50ms between each character. Total animation takes ~0.8s (9 × 50ms + 350ms for last letter).
**Why human:** GSAP timeline execution and perceived stagger timing require visual confirmation.

#### 6. Logo no-replay on back-to-title

**Test:** Play a round, die, tap "Back to Title" (or equivalent).
**Expected:** The "FLAPPY 3D" heading appears already fully visible — no fade-in animation replays.
**Why human:** useRef guard is statically verified, but runtime navigation path must be confirmed end-to-end.

#### 7. CTA pulse rhythm

**Test:** Observe the "Tap anywhere to start" text on the title screen for ~5 seconds.
**Expected:** The text pulses smoothly from dim (~60% opacity) to bright (100% opacity) and back with a 1.6s full cycle. The rhythm feels subtle and not distracting.
**Why human:** CSS animation visual quality and timing feel must be confirmed by a person.

---

### Gaps Summary

No automated gaps found. All 10 must-have truths are verified at the code level (existence, substantive implementation, correct wiring, and data flow). The 7 human verification items above are standard visual/audio confirmations expected for a frontend-heavy phase — they are not gaps in implementation, but confirmations that the correctly-wired code produces the intended perceptual effect at runtime.

---

_Verified: 2026-04-29_
_Verifier: Claude (gsd-verifier)_
