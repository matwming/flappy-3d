---
phase: 07-in-game-juice
verified: 2026-04-29T00:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
gaps: []
human_verification:
  - test: "Play to score 1-5 and observe +1 popups"
    expected: "A gold '+1' text rises ~70px from the bird's screen position and fades out over ~700ms; no popup if Reduce Motion is ON"
    why_human: "CSS animation and 3D-to-screen projection cannot be verified programmatically without a browser rendering context"
  - test: "Enable 'Flap trail' in Settings, then play; flap rapidly 3+ times in quick succession"
    expected: "Up to 3 semi-transparent bird-ghost echoes trail behind each flap, fading to invisible within ~180ms; no trail visible when Reduce Motion is ON"
    why_human: "Three.js ghost mesh opacity fade-out and visual layering require live rendering to verify"
  - test: "Play until score reaches 10, 25, and 50"
    expected: "Each milestone triggers a gold particle burst at the bird position AND a brief full-screen gold flash (rgba 255,209,102,0.4) fading in ~200ms; effects fire once per threshold per round; they do NOT re-fire on the same threshold in a new round"
    why_human: "Particle burst color and flash overlay opacity transitions require visual inspection in a live browser"
  - test: "Observe pipe colors across the first ~8 consecutive obstacle pairs"
    expected: "Pipes cycle through 4 distinct toon colors (green, teal-blue, warm orange-brown, muted purple); the cycle resets to green on each new round"
    why_human: "MeshToonMaterial color differences and correct cycle reset require visual inspection during gameplay"
  - test: "Enable 'Colorblind Palette' in Settings, then play"
    expected: "All newly spawned pipes remain a single color (no cycling); the bird's colorblind palette color swap is still active"
    why_human: "Colorblind suppression of cycle requires visual confirmation that setColorblindMode guard works correctly"
  - test: "Open title screen and verify Phase 6 effects are unaffected"
    expected: "Bird still bobs gently on a sine wave; demo pipes still scroll in the background; 'Tap to start' CTA still pulses"
    why_human: "Phase 6 regression check requires live rendering"
---

# Phase 7: In-Game Juice Verification Report

**Phase Goal:** After Phase 7, scoring feels visceral and milestone-rewarding. Each scored point gets a +1 popup floating from the bird, milestone scores trigger a celebration burst, and pipe colors cycle subtly so the world doesn't feel monotonous.
**Verified:** 2026-04-29
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each SCORE event triggers a DOM +1 element rising ~70px and fading over 600-800ms from the bird's screen position; gated under reduced-motion | VERIFIED | `ScorePopupPool` (6 pre-created divs) in UIBridge.tsx:21-56; `spawnScorePopup()` called in main.ts:243-244 inside `!prefersReducedMotion(storage)` gate; `@keyframes scorePopup` in styles.css:288-294 (700ms, -70px, fade out) |
| 2 | Optional flap trail: 2-3 fading semi-transparent bird-mesh echoes following the bird for ~180ms after a flap; gated under reduced-motion (default OFF) | VERIFIED | `snapshotGhost()`, `stepGhosts()`, `resetGhosts()` in Bird.ts:51-80; 3 ghost meshes pre-created in constructor (MeshBasicMaterial, transparent, depthWrite:false); `flapTrail: boolean` in StorageManager SettingsV2 (default false); SettingsModal "Flap trail" toggle present; wired in main.ts:110-112 (flapTrail guard), main.ts:126 (stepGhosts loop), main.ts:189 (resetGhosts on roundStarted) |
| 3 | Score milestones (10, 25, 50) trigger a one-shot gold particle burst + 200ms screen-flash overlay; motion-gated; reset per round | VERIFIED | `MILESTONE_SCORES = new Set([10, 25, 50])` and `firedMilestones` tracking in main.ts:203-204; `burstTinted()` on ParticleEmitter:38-42 (sets gold hex then calls burst) exposed via createParticles adapter; `triggerMilestoneFlash()` on UIBridge:116-121 (200ms setTimeout); `.milestone-flash.active` CSS in styles.css:296-308; `firedMilestones.clear()` in main.ts:188 inside `roundStarted` handler |
| 4 | Successive ObstaclePair instances cycle through 4 toon material colors; cycle resets on roundStarted; suppressed when colorblind palette is active | VERIFIED | `PIPE_COLOR_CYCLE` (4 colors) in constants.ts:33-38; `ObstaclePair.setColor()` in ObstaclePair.ts:26-28 updating per-pair cloned `pairMaterial`; `ObstacleSpawner.resetColorIndex()` and `setColorblindMode()` in ObstacleSpawner.ts:29-35; colorblind guard at ObstacleSpawner.ts:61-64; main.ts wiring: `setColorblindMode(true)` at startup (line 86), `setColorblindMode(palette === 'colorblind')` in onPaletteChange (line 95), `resetColorIndex()` in roundStarted (line 190) |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/ui/UIBridge.tsx` | ScorePopupPool class + spawnScorePopup() + triggerMilestoneFlash() | VERIFIED | All three present; UIBridge constructor accepts optional camera arg; ScorePopupPool uses Vector3.project() for world-to-screen mapping |
| `src/ui/styles.css` | @keyframes scorePopup + .milestone-flash overlay CSS | VERIFIED | `@keyframes scorePopup` at line 288; `.score-popup`, `.score-popup.animating` at lines 274-294; `.milestone-flash` and `.milestone-flash.active` at lines 296-308; prefers-reduced-motion media query suppresses animation |
| `src/particles/ParticleEmitter.ts` | burstTinted(origin, color) method | VERIFIED | Present at line 38; sets material color hex then delegates to existing burst(); PointsMaterial default color is already gold 0xffd166 so this is idempotent for milestone use |
| `src/particles/createParticles.ts` | burstTinted exposed on ParticleSystemAdapter | VERIFIED | Interface declares `burstTinted` at line 7; factory proxy delegates at line 18 |
| `src/main.ts` | MILESTONE_SCORES, firedMilestones, popup spawn, milestone wiring, roundStarted reset | VERIFIED | All present; MILESTONE_SCORES at line 203, firedMilestones at line 204, spawnScorePopup at line 244, milestone block at lines 247-256, firedMilestones.clear() at line 188 |
| `src/constants.ts` | PIPE_COLOR_CYCLE (4 colors) | VERIFIED | Lines 33-38; 4 values: 0x4caf50 (green), 0x3f8fb8 (teal-blue), 0xb8843f (orange-brown), 0x9b3fb8 (purple) |
| `src/entities/ObstaclePair.ts` | setColor(hex) + per-pair material clone | VERIFIED | `pairMaterial` cloned in constructor at line 17; `setColor()` at lines 26-28 |
| `src/systems/ObstacleSpawner.ts` | spawnIndex counter + resetColorIndex() + colorblind suppression | VERIFIED | `spawnIndex` field at line 21; `colorblindMode` at line 22; `resetColorIndex()` at lines 29-31; `setColorblindMode()` at lines 33-35; color cycle call at lines 61-64; `spawnIndex++` at line 65 |
| `src/entities/Bird.ts` | Ghost ring buffer (3 Mesh instances) + snapshotGhost() + resetGhosts() + stepGhosts() | VERIFIED | Ghost array initialized in constructor (lines 32-47); all three methods present (lines 51-80); GHOST_FADE_SPEED = 1/0.18 gives 180ms fade |
| `src/storage/StorageManager.ts` | flapTrail: boolean in SettingsV2 + DEFAULT_SETTINGS + spread-merge in getSettings() | VERIFIED | `flapTrail: boolean` in interface at line 8; `flapTrail: false` in DEFAULT_SETTINGS at line 21; `getSettings()` at line 105 returns `{ ...DEFAULT_SETTINGS, ...this.load().settings }` |
| `src/ui/screens/SettingsModal.tsx` | Flap trail toggle row | VERIFIED | Toggle with label "Flap trail" at line 93; `settings.flapTrail ?? false` for checked prop; calls `update({ flapTrail: v })`; followed by settings-note about ghost echoes |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| main.ts actor.subscribe (score branch) | ui.spawnScorePopup(bird.position) | `!prefersReducedMotion(storage)` gate at line 243 | WIRED | Confirmed at main.ts:243-244 |
| main.ts actor.subscribe (score branch) | particles.burstTinted + ui.triggerMilestoneFlash | `MILESTONE_SCORES.has(score) && !firedMilestones.has(score)` at lines 247-256 | WIRED | All three calls present and gated |
| main.ts actor.on('roundStarted') | firedMilestones.clear() + bird.resetGhosts() + spawner.resetColorIndex() | Inside roundStarted handler body | WIRED | Lines 188-190 |
| ObstacleSpawner.step() | pair.setColor(PIPE_COLOR_CYCLE[spawnIndex % length]) | `!this.colorblindMode` guard at line 61 | WIRED | Color cycling with colorblind suppression confirmed |
| main.ts input.onFlap (playing branch) | bird.snapshotGhost() | `storage.getSettings().flapTrail && !prefersReducedMotion(storage)` at line 110 | WIRED | Confirmed at main.ts:110-112 |
| main.ts loop.add | bird.stepGhosts(dt) | After particles.step registration at line 126 | WIRED | Confirmed at main.ts:126 |
| main.ts startup + onPaletteChange | spawner.setColorblindMode() | Startup block at line 86; onPaletteChange callback at line 95 | WIRED | Both call sites present |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ScorePopupPool.spawn() | worldPos (bird position) | bird.position (Vector3, updated by PhysicsSystem each frame) | Yes | FLOWING |
| milestoneFlash div | .active CSS class | triggerMilestoneFlash() → setTimeout 200ms | Yes | FLOWING |
| Ghost meshes | opacity (GHOST_OPACITIES values) | snapshotGhost() on flap; stepGhosts() decrement per frame | Yes | FLOWING |
| ObstaclePair pairMaterial.color | PIPE_COLOR_CYCLE[spawnIndex] | setColor() called after pair.reset() in spawner.step() | Yes | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED (requires live browser rendering — these are visual/animation effects; no runnable CLI entry points)

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BEAUTY-05 | 07-01 | +1 DOM popup rising from bird on SCORE, 600-800ms, gated under prefersReducedMotion | SATISFIED | ScorePopupPool, spawnScorePopup(), @keyframes scorePopup all verified |
| BEAUTY-06 | 07-02 | Optional flap trail (2-3 ghost echoes, 150-200ms); flapTrail default OFF; gated | SATISFIED | Bird ghost ring buffer, storageManager flapTrail, SettingsModal toggle, main.ts wiring all verified |
| BEAUTY-07 | 07-01 | Milestone scores 10/25/50: gold burst + 200ms flash; one-shot per round | SATISFIED | MILESTONE_SCORES, firedMilestones, burstTinted, triggerMilestoneFlash, firedMilestones.clear() all verified |
| BEAUTY-08 | 07-02 | Pipe color cycling 3-4 toon colors per pair; cycle resets on roundStarted; suppressed in colorblind mode | SATISFIED | PIPE_COLOR_CYCLE, ObstaclePair.setColor, ObstacleSpawner cycling and suppression, main.ts wiring all verified |

---

### Anti-Patterns Found

No anti-patterns detected in modified files. Scan of Bird.ts, ObstaclePair.ts, ObstacleSpawner.ts, UIBridge.tsx, main.ts, StorageManager.ts, SettingsModal.tsx, constants.ts, styles.css, ParticleEmitter.ts, createParticles.ts found no TODO/FIXME/placeholder comments, no empty returns, no hardcoded empty state flowing to rendering.

**Structural note:** `firedMilestones` is declared at main.ts:204 while the `actor.on('roundStarted', ...)` handler registered at line 176 references it. This is safe because (a) TypeScript accepts it (tsc exits 0), (b) the handler fires only after user interaction (START), which occurs well after line 204 executes synchronously. Not a bug.

---

### Phase 6 Regression Check

| Item | Expected | Status |
|------|----------|--------|
| Bird bob (bobTime) | `bobTime` used in title-state loop step | PRESENT — main.ts:118,131,138,139 |
| Demo pipes (TITLE_DEMO_DIFFICULTY) | ObstacleSpawner spawns in title state | PRESENT — ObstacleSpawner.ts:9 |
| Music volume restore | `audio.setMusicVolume(0.4)` on playing | PRESENT — main.ts:218 |

---

### Build Verification

| Check | Result |
|-------|--------|
| `tsc --noEmit` | EXIT 0 — no type errors |
| `npm run build` | SUCCESS — 196.33 KB gzip (budget: 250 KB) |

---

### Human Verification Required

The following items require play-testing in a browser to confirm goal achievement:

#### 1. Score +1 Popup Visual

**Test:** Start a round and score 1-5 points. Watch the bird position area.
**Expected:** A gold "+1" text element appears at the bird's projected screen position and animates upward ~70px while fading to invisible over approximately 700ms. If Reduce Motion is enabled, the popup should not appear.
**Why human:** CSS keyframe animation and Three.js world-to-screen projection cannot be verified without a live browser rendering context.

#### 2. Flap Trail Ghost Effect

**Test:** Open Settings and enable "Flap trail." Start a round and tap/click rapidly 3 or more times in quick succession.
**Expected:** Up to 3 semi-transparent bird-shaped echoes (decreasing opacity: 0.6 / 0.4 / 0.2) trail behind the bird, each fading to invisible within approximately 180ms. The effect should be absent when Reduce Motion is ON, and should not appear at all when "Flap trail" is OFF.
**Why human:** Ghost mesh opacity fade-out and visual layering in the Three.js scene require live rendering to verify.

#### 3. Milestone Celebrations at 10 / 25 / 50

**Test:** Play until reaching scores of exactly 10, 25, and 50. Observe after each.
**Expected:** At each threshold: a gold particle burst fires from the bird position AND a brief full-screen warm-gold overlay flashes and fades within ~200ms. Crossing the same threshold again in the same round (by some cheat/test) should NOT re-trigger. A new round should allow the effects to fire again.
**Why human:** Particle burst tint, flash overlay opacity transition, and the "once per round" deduplication behavior require visual inspection and play-testing.

#### 4. Pipe Color Cycling

**Test:** Start a new round and observe the first 6-8 obstacle pairs.
**Expected:** Each pair shows a distinct toon color cycling through green → teal-blue → warm orange-brown → muted purple → green → ... The cycle restarts from green after each RESTART. Colors should all have adequate contrast against the sky-blue background.
**Why human:** MeshToonMaterial color rendering and cycle correctness require visual inspection during gameplay.

#### 5. Colorblind Mode Suppresses Cycling

**Test:** Enable "Colorblind Palette" in Settings and play a round.
**Expected:** All newly spawned pipes appear in a single color (no cycling). The bird colorblind palette swap remains active.
**Why human:** Requires visual confirmation that the `setColorblindMode` guard correctly suppresses `setColor()` calls during gameplay.

#### 6. Phase 6 Non-Regression

**Test:** Navigate to the title screen.
**Expected:** Bird still bobs gently (~1Hz sine wave, ±0.15m); demo pipes scroll in the background; "Tap to start" CTA pulses; logo entrance animation plays (one-shot).
**Why human:** Visual rendering of Phase 6 animations requires a live browser.

---

### Gaps Summary

No code-verifiable gaps found. All 4 must-have truths are fully satisfied by substantive, wired, and data-flowing implementations. The remaining items are play-test verifications that inherently require human observation of live browser rendering.

---

_Verified: 2026-04-29_
_Verifier: Claude (gsd-verifier)_
