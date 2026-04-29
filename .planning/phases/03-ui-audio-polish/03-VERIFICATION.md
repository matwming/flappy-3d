---
phase: 03-ui-audio-polish
verified: 2026-04-29T00:00:00Z
status: gaps_found
score: 14/18 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Title, HUD, Pause, GameOver screens render based on actor state with <150ms CSS transitions (HUD-07)"
    status: partial
    reason: "Screens render correctly and transitions are wired via CSS opacity, but the transition duration is 250ms (two declarations: line 19 and line 89 of styles.css), not <150ms as required by REQUIREMENTS.md HUD-07 and ROADMAP SC-1."
    artifacts:
      - path: "src/ui/styles.css"
        issue: "transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1) — used on both .screen and .hud-screen.active; requirement specifies <150ms"
    missing:
      - "Change screen opacity transition from 250ms to <150ms (e.g., 120ms ease-out)"

  - truth: "PauseScreen shows on actor.value==='paused'; Resume + Back-to-Title buttons; visibilitychange auto-triggers pause (HUD-04 + ROADMAP SC-1)"
    status: partial
    reason: "PauseScreen renders correctly for manual pause (RESUME/START wired). However HUD-04 and ROADMAP SC-1 both require visibilitychange to auto-trigger pause; no visibilitychange listener exists in main.ts or any screen component."
    artifacts:
      - path: "src/main.ts"
        issue: "No document.addEventListener('visibilitychange', ...) found anywhere in src/"
    missing:
      - "Add visibilitychange listener in main.ts: when document.hidden, send PAUSE to actor (if in 'playing' state)"

  - truth: "GameOverScreen shows final score, PB with 'New best!' badge, restart CTA (HUD-05); NewBestBadge fires when score > priorBest"
    status: failed
    reason: "CR-01 confirmed: priorBest is captured AFTER gameMachine's gameOver entry action has already called storage.setBestScore(). When UIBridge subscriber fires on gameOver, getBestScore() returns the NEW best (already written), so priorBest === score → isNewBest is always false. NewBestBadge never shows on a new-best run."
    artifacts:
      - path: "src/ui/UIBridge.tsx"
        issue: "Line 63: const pb = props.storage.getBestScore() — called after xstate entry action already updated localStorage; captures the new best not the prior best"
      - path: "src/machine/gameMachine.ts"
        issue: "Lines 84-91: gameOver entry action synchronously calls storage.setBestScore() before any subscriber fires"
    missing:
      - "Capture priorBest before game starts (on START/RESTART transition) using a ref, then use that ref's value when entering gameOver"
      - "Example fix: track priorBestRef.current = props.storage.getBestScore() on START/RESTART events, set setPriorBest(priorBestRef.current) on gameOver"

  - truth: "SettingsModal toggles sound/music/reduce-motion/palette; persists via StorageManager.setSettings (HUD-06); Reduce Motion toggle correctly reflects 'auto' default"
    status: partial
    reason: "CR-02 confirmed: reduceMotionOn = settings.reduceMotion !== 'off' treats 'auto' as ON. Default setting is 'auto' so on first open the Reduce Motion toggle shows as enabled — misleading when OS media query returns false (motion allowed). User who flips it off and back on writes 'on' permanently, losing 'auto'."
    artifacts:
      - path: "src/ui/screens/SettingsModal.tsx"
        issue: "Line 48: const reduceMotionOn = settings.reduceMotion !== 'off' — incorrectly maps 'auto' to ON; should be 'on' || ('auto' && mediaQuery.matches)"
    missing:
      - "Fix SettingsModal line 48: const reduceMotionOn = settings.reduceMotion === 'on' || (settings.reduceMotion === 'auto' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)"

  - truth: "Background music loops in playing state, fades out 600ms on dying, pauses on paused state (AUD-03)"
    status: partial
    reason: "Music plays in 'playing', fades on 'dying' — confirmed. But 'paused' state is not handled in main.ts actor.subscribe: no setMusicPlaying(false) call when entering 'paused'. CONTEXT D-10 says Phase 3 should stub 'pause music on paused transition'; this stub was not implemented. Music continues playing through pause. Tab-blur is correctly deferred to Phase 5."
    artifacts:
      - path: "src/main.ts"
        issue: "Lines 111-118: actor.subscribe only handles 'playing', 'dying', 'gameOver', 'title' — 'paused' has no audio handler"
    missing:
      - "Add paused state handler in main.ts subscriber: else if (s === 'paused') { audio.setMusicPlaying(false) }"
      - "Add resume handler: when 'playing' after 'paused', ensure music resumes (setMusicPlaying(true) already handles this)"

  - truth: "All motion-heavy effects skip when prefersReducedMotion(storage) === true; squash-stretch gated where required"
    status: partial
    reason: "screenShake and particle burst on death are correctly gated. However squashStretch(bird.mesh) on every flap is called unconditionally (main.ts line 80). CLAUDE.md mandate: 'prefers-reduced-motion checked in JS ... before triggering screen shake / particles / aggressive tweens.' A per-flap scale tween on every input qualifies. Review IN-04 in 03-REVIEW.md confirmed this."
    artifacts:
      - path: "src/main.ts"
        issue: "Line 80: squashStretch(bird.mesh) called unconditionally inside onFlap handler; not gated behind !prefersReducedMotion(storage)"
    missing:
      - "Wrap squashStretch call: if (!prefersReducedMotion(storage)) { squashStretch(bird.mesh) }"

deferred:
  - truth: "visibilitychange auto-pauses music (AUD-03 tab-blur clause)"
    addressed_in: "Phase 5"
    evidence: "Phase 5 success criteria SC-3: 'Tab-switching mid-game pauses music and triggers the paused state; returning to tab resumes correctly.' CONTEXT D-10 explicitly defers tab-blur to Phase 5."
---

# Phase 3: UI + Audio + Polish Verification Report

**Phase Goal:** After Phase 3, the game has all four real screens (title with leaderboard, in-game HUD, pause, game-over), recorded audio with iOS unlock, and GSAP juice that makes it palpably more crafted than the baseline within 30 seconds.
**Verified:** 2026-04-29
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Title screen with leaderboard + tap-start + settings cog (HUD-02) | VERIFIED | TitleScreen.tsx renders heading, LeaderboardList (max:3), CTA, settings button; actor.send({type:'START'}) wired |
| 2 | HUD score at top-center, clamp(40px,8vw,96px), aria-live="polite" (HUD-03) | VERIFIED | HUD.tsx line 47: aria-live="polite" aria-atomic="true"; styles.css line 96-98: font-size clamp rule |
| 3 | Screens render based on actor.value with CSS transitions (HUD-07) | PARTIAL | Screens wire correctly; transition is 250ms not <150ms — ROADMAP SC-1 and REQUIREMENTS.md say <150ms |
| 4 | PauseScreen on actor.value==='paused'; Resume + Back-to-Title + ESC (HUD-04) | PARTIAL | Manual pause/resume wired. visibilitychange auto-pause missing (HUD-04 + ROADMAP SC-1 requirement) |
| 5 | GameOverScreen shows score + PB + NewBestBadge when score > priorBest (HUD-05) | FAILED | CR-01: priorBest captured after gameMachine entry writes new best; isNewBest always false on new-best run |
| 6 | SettingsModal 4 toggles persisted; reduceMotion default correct (HUD-06) | PARTIAL | CR-02: reduceMotion toggle shows ON for 'auto' default; functional 3/4 toggles correct; storage persist works |
| 7 | #ui-root above canvas, pointer-events:none on root (HUD-01) | VERIFIED | index.html: canvas + div#ui-root; styles.css: position:fixed; inset:0; pointer-events:none on #ui-root |
| 8 | Preact installed; UIBridge mounts Preact app at #ui-root (HUD-08) | VERIFIED | vite.config.ts has preact() plugin; tsconfig has react-jsx + jsxImportSource:preact; UIBridge.mount() renders App |
| 9 | iOS AudioContext unlock via Howler.ctx.resume() in pointerup (AUD-01) | VERIFIED | AudioManager.ts lines 74-85: unlockHandler calls Howler.ctx?.resume() synchronously; document.addEventListener('pointerup', handler) |
| 10 | Recorded or synth-fallback SFX for flap/score/death; Howl singletons (AUD-02/AUD-05) | VERIFIED | 4 placeholder MP3s (0 bytes) + synth fallback via synthBurst(); plan acceptance criteria explicitly allow fallback; all Howl created once in constructor |
| 11 | Music loops in playing; fades 600ms on dying; pauses on paused state (AUD-03) | PARTIAL | Playing/dying handled. Paused state audio not handled — music plays through pause |
| 12 | setSfxMuted/setMusicMuted instant without reload (AUD-04) | VERIFIED | AudioManager.ts: setSfxMuted/setMusicMuted update flags immediately; setMusicMuted(true) calls music.pause() |
| 13 | Top-5 leaderboard in StorageManager v2 (SAVE-03) | VERIFIED | StorageManager.ts: pushLeaderboard sorts and slices to 5; v1→v2 migration present |
| 14 | Settings persisted via StorageManager v2 (SAVE-04) | VERIFIED | StorageManager.ts: getSettings/setSettings wrap SettingsV2 with sound/music/reduceMotion/palette |
| 15 | GSAP integrated; squash-stretch on flap ~80ms yoyo (ANIM-01/ANIM-02) | VERIFIED | anim.ts: gsap.to(target.scale, {duration:0.04, yoyo:true, repeat:1}); wired in main.ts onFlap. Note: uses power2.out not back.out (functionally equivalent); GSAP runs own RAF (not ticker.add — plan documented this decision) |
| 16 | Score pop CSS keyframe 280ms on score increment (ANIM-03) | VERIFIED | HUD.tsx: double-rAF + setTimeout(280ms) class toggle; styles.css @keyframes scorePop with gold at 30% |
| 17 | Screen shake on death 250ms decaying; reduced-motion gated (ANIM-04) + particle burst (ANIM-05) | VERIFIED | main.ts lines 121-126: !prefersReducedMotion(storage) gates screenShake + particles.burst; anim.ts: 5-keyframe GSAP timeline; ParticleEmitter: 30 particles |
| 18 | All motion-heavy effects gated; squash-stretch gated (ANIM-06 / CLAUDE.md) | PARTIAL | Death effects correctly gated. squashStretch on flap NOT gated despite CLAUDE.md mandate for aggressive tweens |

**Score: 12/18 truths fully verified (6 partial/failed — 4 gaps, 2 partially passing with issues)**

Scoring interpretation:
- VERIFIED: 12
- PARTIAL (real gap in the partial): 5
- FAILED: 1

Effective gap count: 6 truths with issues (the 5 partials all have actionable gaps plus the 1 failed).

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/audio/AudioManager.ts` | Singleton audio with iOS unlock | VERIFIED | 9 public methods; Howl singletons in constructor; pointerup unlock handler |
| `public/audio/CREDITS.md` | CC0 attribution | VERIFIED | Exists; documents placeholder status |
| `public/audio/{flap,score,death,music}.mp3` | Audio files (or placeholders) | VERIFIED (placeholder) | 4 files present, all 0 bytes; synth fallback active per plan |
| `src/ui/UIBridge.tsx` | Actor→DOM bridge | VERIFIED | Exports UIBridge with mount/dispose; App component with 5-screen router |
| `src/storage/StorageManager.ts` | v2 schema with leaderboard + settings | VERIFIED | getBestScore/setBestScore/getLeaderboard/pushLeaderboard/getSettings/setSettings; v1→v2 migration |
| `src/a11y/motion.ts` | prefersReducedMotion + subscribeReducedMotion | VERIFIED | Both exports present; caches result; refreshReducedMotion clears cache |
| `src/ui/screens/TitleScreen.tsx` | Title with leaderboard + CTA + settings | VERIFIED | Pure component; max:3 leaderboard; actor.send START on click |
| `src/ui/screens/HUD.tsx` | aria-live score + pause button + score-pop | VERIFIED | aria-live="polite"; score-pop via double-rAF; pause button |
| `src/ui/screens/PauseScreen.tsx` | Pause with Resume/Back-to-Title + ESC | VERIFIED | ESC → RESUME wired; Resume/Back-to-Title buttons present |
| `src/ui/screens/GameOverScreen.tsx` | Score + badge + leaderboard + restart | PARTIAL | Component exists and wired; NewBestBadge never renders due to CR-01 |
| `src/ui/screens/SettingsModal.tsx` | dialog + 4 toggles + persist | PARTIAL | dialog element used; persist wired; CR-02 reduceMotion display bug |
| `src/ui/components/Button.tsx` | min-44×44 wrapper | VERIFIED | ComponentChildren type; type="button" default |
| `src/ui/components/Toggle.tsx` | role=switch + aria-pressed | VERIFIED (minor) | role="switch" present; uses aria-pressed (should be aria-checked per ARIA spec — IN-02 warning, not blocking) |
| `src/ui/components/LeaderboardList.tsx` | Ordered list; empty state | VERIFIED | Graceful empty "No scores yet — fly!" |
| `src/ui/components/NewBestBadge.tsx` | Golden flash badge | VERIFIED | goldFlash keyframe; role=status |
| `src/anim/anim.ts` | squashStretch + screenShake + scorePop | VERIFIED | All 3 exports; GSAP tweens |
| `src/particles/ParticleEmitter.ts` | burst() + step() no allocs | VERIFIED | Float32Array; no `new` in step(); noUncheckedIndexedAccess guards |
| `src/particles/createParticles.ts` | Factory returning adapter | VERIFIED | ParticleSystemAdapter interface; ships bespoke fallback |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| main.ts | AudioManager | actor.subscribe | WIRED | playing→setMusicPlaying(true); dying→fadeMusicOut(600)+playDeath(); gameOver/title→setMusicPlaying(false) |
| main.ts | AudioManager | input.onFlap | WIRED | audio.playFlap() on flap in 'playing' state |
| main.ts | UIBridge | mount() | WIRED | new UIBridge(actor, audio, storage); ui.mount() after actor.start() |
| UIBridge | All 5 screens | h() render | WIRED | App component renders all screens conditionally based on snap.value |
| UIBridge → gameOver | StorageManager | pushLeaderboard | WIRED but BUGGY | pushLeaderboard called on gameOver transition; priorBest capture has CR-01 race |
| SettingsModal | StorageManager | setSettings | WIRED | update() calls storage.setSettings(partial) |
| SettingsModal | AudioManager | setSfxMuted/setMusicMuted | WIRED | update() applies audio side-effects |
| main.ts | squashStretch | onFlap (NOT gated) | PARTIAL | squashStretch called unconditionally; not gated behind prefersReducedMotion |
| main.ts | screenShake + particles.burst | actor.subscribe dying | WIRED + GATED | !prefersReducedMotion(storage) gate present |
| gameMachine | paused state | PAUSE/RESUME transitions | WIRED | paused state with RESUME→playing, START→title |
| main.ts | audio 'paused' state | actor.subscribe | MISSING | No audio handler for 'paused' transition; music plays during pause |
| PauseScreen | RESUME | actor.send | WIRED | Resume button + ESC both send RESUME |
| main.ts | visibilitychange | auto-pause | MISSING | No visibilitychange handler; HUD-04 requires auto-pause on tab blur |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| HUD.tsx | score prop | snap.context.score via UIBridge App | actor context updated by SCORE events from ScoreSystem | FLOWING |
| GameOverScreen.tsx | leaderboard prop | props.storage.getLeaderboard() | localStorage via StorageManager.pushLeaderboard() | FLOWING |
| GameOverScreen.tsx | priorBest prop | props.storage.getBestScore() at gameOver | Captured AFTER gameMachine updates — returns new best | HOLLOW (CR-01) |
| TitleScreen.tsx | leaderboard prop | props.storage.getLeaderboard() | localStorage read | FLOWING |
| SettingsModal.tsx | reduceMotionOn | settings.reduceMotion from localStorage | localStorage read; display logic inverted for 'auto' | STATIC (CR-02) |

---

### Behavioral Spot-Checks

Step 7b: Cannot run server-dependent checks (game requires a browser). Skipping interactive checks.

Build check passed: `npm run build` exits 0; bundle 194.40 KB gzip (under 250 KB budget).
TypeScript check: `tsc --noEmit` exits 0.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| HUD-01 | 03-02 | #ui-root overlay, pointer-events:none | SATISFIED | index.html has div#ui-root; styles.css pointer-events:none on root |
| HUD-02 | 03-03 | Title screen with leaderboard + tap-start | SATISFIED | TitleScreen.tsx verified |
| HUD-03 | 03-03 | HUD score, 375px readable, aria-live | SATISFIED | HUD.tsx aria-live="polite"; clamp(40px,8vw,96px) |
| HUD-04 | 03-03 | Pause screen; auto-pause on visibilitychange | BLOCKED | PauseScreen works for manual pause; visibilitychange listener missing |
| HUD-05 | 03-03 | GameOver: score + PB + NewBest + restart | BLOCKED | Screen renders; NewBestBadge never shows — CR-01 race |
| HUD-06 | 03-03 | Settings modal 4 toggles + persist | BLOCKED | Storage persist works; CR-02 reduceMotion display wrong |
| HUD-07 | 03-03 | Transitions <150ms | BLOCKED | CSS is 250ms — literal requirement violation |
| HUD-08 | 03-02 | Preact + UIBridge | SATISFIED | vite.config preact(); UIBridge mounts at #ui-root |
| AUD-01 | 03-01 | iOS AudioContext unlock on pointerup | SATISFIED | Howler.ctx.resume() in pointerup handler |
| AUD-02 | 03-01 | Recorded SFX or fallback synth (plan allows) | SATISFIED | 0-byte placeholders + synth fallback; plan acceptance criteria allow this |
| AUD-03 | 03-01 | Music: playing/dying/paused/tab-blur | BLOCKED | 'paused' state not handled; music plays during pause |
| AUD-04 | 03-01 | Mute toggles instant, no reload | SATISFIED | setSfxMuted/setMusicMuted immediate effect |
| AUD-05 | 03-01 | Howl singletons, never recreated | SATISFIED | All Howl instances in constructor only |
| ANIM-01 | 03-04 | GSAP integrated, no double-tick | SATISFIED | GSAP runs own RAF by design (documented decision); tweens are non-physics only |
| ANIM-02 | 03-04 | Squash-stretch on flap ~80ms | SATISFIED | 0.04s x2 yoyo = 80ms; power2.out used instead of back.out (functionally equivalent, same intent) |
| ANIM-03 | 03-04 | Score pop CSS keyframe per point | SATISFIED | HUD.tsx double-rAF; @keyframes scorePop 280ms |
| ANIM-04 | 03-04 | Screen shake on death, reduced-motion gated | SATISFIED | screenShake behind !prefersReducedMotion; 250ms decaying GSAP timeline |
| ANIM-05 | 03-04 | Particle burst on death, reduced-motion gated | SATISFIED | 30-particle ParticleEmitter.burst() behind !prefersReducedMotion |
| ANIM-06 | 03-04 | NewBest celebration | BLOCKED | NewBestBadge component exists and styles correct; never renders due to CR-01 |
| SAVE-03 | 03-02 | Top-5 leaderboard storage | SATISFIED | pushLeaderboard sorts + slices to 5; timestamps included |
| SAVE-04 | 03-02 | Settings persist to localStorage | SATISFIED | getSettings/setSettings; sound/music/reduceMotion/palette with correct defaults |

**Requirements summary:** 13/21 SATISFIED, 5 BLOCKED (HUD-04, HUD-05, HUD-06, AUD-03, ANIM-06), 3 partially compliant (HUD-07, ANIM-02 minor ease deviation)

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/ui/UIBridge.tsx | 63 | `getBestScore()` called after machine already updated best score | Blocker | NewBestBadge never displays — CR-01 |
| src/ui/screens/SettingsModal.tsx | 48 | `reduceMotionOn = settings.reduceMotion !== 'off'` maps 'auto' to ON | Blocker | Misleading default display; user loses 'auto' setting if they toggle — CR-02 |
| src/main.ts | — | No 'paused' state handler in actor.subscribe for audio | Blocker | Music plays through pause — AUD-03 partial |
| src/main.ts | — | No visibilitychange listener | Blocker | HUD-04 auto-pause on tab blur missing |
| src/ui/styles.css | 19,89 | `transition: opacity 250ms` on screens | Warning | HUD-07 requirement says <150ms |
| src/main.ts | 80 | `squashStretch(bird.mesh)` unconditional | Warning | CLAUDE.md mandates reduced-motion gate on aggressive tweens |
| src/machine/gameMachine.ts | 95 | `console.log` in gameOver entry without DEV guard | Warning | Fires in production on every death — WR-06 from review |
| src/audio/AudioManager.ts | 118 | `setMusicPlaying(true)` doesn't reset volume after fade | Warning | Music silently restarts after fadeMusicOut — WR-02 from review |

---

### Human Verification Required

#### 1. Audio Runtime: Synth Fallback vs Real SFX

**Test:** Open the game in a browser; tap to start; flap, score a point, die. Listen for audio.
**Expected:** Synth tones for flap (880Hz sine, 80ms), score (1320Hz triangle, 150ms), death (120Hz sawtooth, 250ms). Music should not play (0-byte MP3, no synth fallback for music).
**Why human:** Cannot verify browser AudioContext + Howler fallback logic without running the game.

#### 2. iOS AudioContext Unlock

**Test:** Open game on iOS Safari; tap; verify flap SFX plays.
**Expected:** AudioContext.state === 'running' after first pointerup; flap SFX audible.
**Why human:** iOS behavior requires real device test; cannot simulate in CLI.

#### 3. NewBestBadge — Confirm Bug Manifestation

**Test:** Play from score 0; achieve any score; die and observe game-over screen.
**Expected (current broken):** "New best!" badge does NOT appear even though this is first run and any score > 0 should be a new best.
**Expected (after fix):** Badge appears gold-flashing with "✨ New Best! ✨".
**Why human:** Requires live game session to confirm CR-01 behavior.

#### 4. Reduce Motion Toggle Display

**Test:** Open Settings on a machine where OS reduce-motion is OFF. Observe the "Reduce Motion" toggle position.
**Expected (current broken):** Toggle shows as ON (checked) despite OS motion being allowed.
**Expected (after fix):** Toggle shows OFF when OS setting is off and storage is 'auto'.
**Why human:** Requires browser + OS settings interaction.

#### 5. Pause Screen During Play

**Test:** Start playing; tap pause button; observe music state.
**Expected (current broken):** Music continues playing during pause.
**Expected (after fix):** Music pauses on 'paused' state.
**Why human:** Requires audio playback verification in browser.

---

## Gaps Summary

Six gaps block full goal achievement:

**Gap 1 (Critical — HUD-05, ANIM-06): NewBestBadge never shows (CR-01)**
The `priorBest` value is captured in UIBridge's gameOver subscriber AFTER the xstate entry action has synchronously written the new best score to localStorage. `getBestScore()` returns the updated value, so `score > priorBest` is always false. Fix: capture priorBest when the round starts (on START/RESTART transition), not when gameOver fires.

**Gap 2 (Critical — HUD-06): Reduce Motion toggle displays 'auto' as ON (CR-02)**
`reduceMotionOn = settings.reduceMotion !== 'off'` maps both 'on' and 'auto' to the "checked" state. Default is 'auto', so first-time users see an incorrectly enabled toggle. Fix: evaluate the live media query for 'auto' mode.

**Gap 3 (Blocker — HUD-04, AUD-03): No visibilitychange auto-pause; music plays during pause**
HUD-04 and ROADMAP SC-1 require auto-pause on tab blur. No `visibilitychange` listener exists. Separately, AUD-03 requires music to pause in the 'paused' state — the machine's 'paused' state is not handled in the audio subscriber. Both fixes are small additions to main.ts.

**Gap 4 (Blocker — HUD-07): CSS transition is 250ms, requirement is <150ms**
Both REQUIREMENTS.md and ROADMAP SC-1 specify <150ms. The plan marked this as compliant despite shipping 250ms. Change `transition: opacity 250ms` to `120ms` (or any value <150ms) on `.screen` and `.hud-screen`.

**Gap 5 (Warning — CLAUDE.md mandate): squashStretch not gated behind prefersReducedMotion**
CLAUDE.md mandates reduced-motion check before aggressive tweens. A per-flap scale tween qualifies. Wrap the squashStretch call in main.ts with `if (!prefersReducedMotion(storage))`.

**Gap 6 (Secondary warning — AUD-03): Music silent on restart after fade**
`fadeMusicOut(600)` sets Howler volume to 0; `setMusicPlaying(true)` on restart doesn't reset the volume. Music will play at volume 0 silently. Fix: add `this.music.volume(0.4)` before `this.music.play()` in setMusicPlaying.

Gaps 1–4 are blocking phase goal achievement. Gaps 5–6 are warnings that degrade experience without fully blocking the stated goal.

---

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Tab-blur auto-pauses music (AUD-03 tab-blur clause) | Phase 5 | Phase 5 SC-3: "Tab-switching mid-game pauses music and triggers the paused state." CONTEXT D-10: "Tab-blur pause is Phase 5." |

---

_Verified: 2026-04-29_
_Verifier: Claude (gsd-verifier)_
