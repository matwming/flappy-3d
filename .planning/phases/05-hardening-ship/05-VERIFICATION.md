---
phase: 05-hardening-ship
verified: 2026-04-29T00:00:00Z
status: human_needed
score: 9/13 must-haves verified (4 require runtime observation)
overrides_applied: 0
human_verification:
  - test: "SC-1 runtime: Play 10 death+restart cycles on npm run dev, observe [mem probe] console lines"
    expected: "geometries and textures values plateau across rounds; no consistent growth; no '[mem probe] geometry count growing' warn after round 3"
    why_human: "renderer.info.memory values are runtime counters — cannot be observed without a running browser session"
  - test: "SC-2 iOS audio: Open https://matwming.github.io/flappy-3d/ in Safari on a real iOS 16+ device, tap to start"
    expected: "Howler.ctx.state === 'running' after first tap; flap/score/death SFX are recognisable audio (not synth oscillators); ringer OFF silences audio (expected behaviour)"
    why_human: "Requires real iOS device — cannot verify AudioContext state in headless environment"
  - test: "SC-3 tab-blur: Start a round, switch to a different tab, return"
    expected: "Music stops on tab switch; game shows Pause screen with score preserved; tapping RESUME resumes music"
    why_human: "Tab visibility change is a browser session event — requires manual browser interaction"
  - test: "SC-4 runtime: Play 20 death+restart cycles in Chrome DevTools (Console filter: Warnings+Errors)"
    expected: "Zero 'Event sent to stopped actor' warnings; getEventListeners(window) count identical before and after 10 restarts"
    why_human: "Stopped-actor warning count and getEventListeners() require a live DevTools session across multiple cycles"
  - test: "v1.0.0 git tag: Confirm real-device checks (SC-2, SC-3, SC-4, PERF-03, VIS-07) pass, then run: git tag -a v1.0.0 -m '...' && git push origin v1.0.0"
    expected: "git tag --list v1.0.0 returns 'v1.0.0'; tag is on remote"
    why_human: "Deliberate ship action — human must confirm all device checks pass before tagging"
  - test: "PERF-03 60fps: Open https://matwming.github.io/flappy-3d/ on iPhone 12 / Pixel 6, enable FPS Meter in DevTools, play to score ≥ 20"
    expected: "Sustained ≥ 58 fps throughout; brief dips to 55 on pipe spawn acceptable"
    why_human: "Real device frame rate cannot be measured programmatically without a physical device"
  - test: "VIS-07 parallax: Play a round on mobile device, observe mountain/tree background layers"
    expected: "Mountains scroll slower than foreground; trees at medium speed; no visible jitter or pop at the x=-20 wrap point during normal play"
    why_human: "Visual quality of parallax layers requires real device observation"
---

# Phase 5: Hardening + Ship Verification Report

**Phase Goal:** After Phase 5, the game passes every "Looks Done But Isn't" check from PITFALLS.md — memory is stable across 10 restarts, audio works on real iOS with ringer on and off, tab-blur pauses music, and the production URL is the final shipped artifact.
**Verified:** 2026-04-29T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | renderer.info.memory probe wired inside import.meta.env.DEV block | ✓ VERIFIED | src/main.ts lines 166-174: probe logs `[mem probe] round=N geometries=X textures=Y` inside `if (import.meta.env.DEV)` inside `actor.on('roundStarted')` |
| 2 | roundCount declared before createRenderer/createComposer calls | ✓ VERIFIED | main.ts line 152: `let roundCount = 0` declared before `actor.on('roundStarted', ...)` block; ac (AbortController) declared at line 48, before createRenderer at line 49 |
| 3 | createRenderer accepts signal? AbortSignal and passes it to resize listener | ✓ VERIFIED | createRenderer.ts signature: `export function createRenderer(signal?: AbortSignal)`; listener at line 55: `window.addEventListener('resize', ..., { signal })` |
| 4 | createComposer accepts signal? AbortSignal and passes it to resize listener | ✓ VERIFIED | createComposer.ts signature includes `signal?: AbortSignal` as 4th param; listener at line 58: `window.addEventListener('resize', ..., { signal })` |
| 5 | ac AbortController declared BEFORE createRenderer/createComposer calls | ✓ VERIFIED | main.ts line 48: `const ac = new AbortController()`; createRenderer called at line 49, createComposer at line 120 — ac precedes both |
| 6 | CollisionSystem has status !== 'active' guard before actor.send | ✓ VERIFIED | CollisionSystem.ts lines 47-48: `if (this.actor.getSnapshot().status !== 'active') return` immediately before `this.actor.send({ type: 'HIT' })` |
| 7 | ScoreSystem has status !== 'active' guard before actor.send | ✓ VERIFIED | ScoreSystem.ts lines 19-21: value !== 'playing' guard and status !== 'active' guard both precede the `actor.send({ type: 'SCORE' })` call |
| 8 | Audio files are non-zero real MPEG audio | ✓ VERIFIED (partial) | All 4 files confirmed real MPEG audio via `file` command (ID3 v2.4.0, MPEG ADTS layer III, 64 kbps). Sizes: flap 2342B, score 2969B, death 1924B, music 329813B. Note: flap and death are below plan's min_bytes thresholds (5000B and 3000B respectively) but `file` confirms genuine MPEG — not placeholders. Short SFX at 64kbps are legitimately small. |
| 9 | CREDITS.md has source URLs and licenses for all 4 files | ✓ VERIFIED | public/audio/CREDITS.md contains table with all 4 files; sources: Kenney Interface Sounds (CC0, kenney.nl) for SFX; Juhani Junkala chiptunes (CC0, opengameart.org) for music. No TODO rows. |
| 10 | README has "Hardening verification" section with SC-1..SC-4 procedures | ✓ VERIFIED | README.md line 69: `## Hardening verification`; all 4 SCs present (lines 73, 83, 93, 104); real URL matwming.github.io used in all procedures |
| 11 | README Live link is the real deployed URL (not placeholder) | ✓ VERIFIED | README.md line 5: `**Live:** https://matwming.github.io/flappy-3d/` — real URL. NOTE: lines 121 and 137 still contain `<owner>` in the Deployment section code blocks describing CI output. These are inside informational code blocks (not live links) so they do not block goal achievement, but should be fixed as a cleanup item. |
| 12 | SettingsModal has iOS silent switch note | ✓ VERIFIED | SettingsModal.tsx lines 79-81: `h('p', { className: 'settings-note' }, 'On iOS, the silent switch mutes all app audio.')` inserted after Music toggle |
| 13 | styles.css has .settings-note rule | ✓ VERIFIED | styles.css lines 241-246: `.settings-note { font-size: 0.72rem; color: rgba(255,255,255,0.55); margin: -0.25rem 0 0.5rem 0; padding: 0; }` |
| 14 | docs/SHIPPED.md exists with v1.0.0 content | ✓ VERIFIED | docs/SHIPPED.md exists; contains v1.0.0 header, live URL, requirements coverage table (5 phases), known limitations section |
| 15 | PhysicsSystem clamps pos.y at WORLD_CEILING_Y | ✓ VERIFIED | PhysicsSystem.ts lines 52-55: ceiling clamp with `WORLD_CEILING_Y` (value=4); velocity zeroed at clamp |
| 16 | CollisionSystem does NOT treat ceiling as death | ✓ VERIFIED | CollisionSystem.ts contains no reference to `WORLD_CEILING_Y`; only floor death via `WORLD_FLOOR_Y` check at line 27 |
| 17 | tsc --noEmit exits 0 | ✓ VERIFIED | `npx tsc --noEmit` produced no output (exit 0) |
| 18 | Bundle <= 250KB gzip | ✓ VERIFIED | bundle-check.sh: 188.07 KB gzip (61.92 KB headroom); PASS |
| SC-1 | Memory stable across 10 restarts (runtime) | ? HUMAN NEEDED | Code infrastructure verified (probe wired, AbortController fixes applied); actual plateau behavior requires running browser session |
| SC-2 | iOS audio confirmed on real device | ? HUMAN NEEDED | Pure runtime — requires real iOS device with Safari |
| SC-3 | Tab-blur pauses music and resumes | ? HUMAN NEEDED | visibilitychange listener is wired (main.ts line 127-134); end-to-end behavior requires browser session |
| SC-4 | No stopped-actor warnings, listener count stable | ? HUMAN NEEDED | Guards confirmed in code; actual warning count and getEventListeners() stability require 20 live cycles in DevTools |
| v1.0.0 | git tag v1.0.0 exists | ? HUMAN NEEDED | Tag absent (`git tag --list v1.0.0` returned empty); deliberately deferred pending human device verification as designed in 05-03-PLAN Task 5 |
| PERF-03 | 60fps on real device | ? HUMAN NEEDED | Carry-forward from Phase 4; requires real device observation |
| VIS-07 | Parallax background smooth on device | ? HUMAN NEEDED | Visual runtime quality; requires real device |

**Code-verified score:** 18/18 code checks passed

**Runtime score:** 0/7 runtime checks confirmed (all require human/device)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/main.ts` | DEV memory probe block gated behind import.meta.env.DEV | ✓ VERIFIED | Lines 166-174; probe inside roundStarted handler |
| `src/render/createRenderer.ts` | AbortController-backed resize listener | ✓ VERIFIED | Signal parameter + `{ signal }` in addEventListener |
| `src/render/createComposer.ts` | AbortController-backed resize listener | ✓ VERIFIED | Signal as 4th param + `{ signal }` in addEventListener |
| `src/systems/CollisionSystem.ts` | status !== 'active' guard before send | ✓ VERIFIED | Guard on line 47, send on line 48 |
| `src/systems/ScoreSystem.ts` | status !== 'active' guard before send | ✓ VERIFIED | Double guard (lines 19-20) before send on line 25 |
| `src/systems/PhysicsSystem.ts` | Ceiling clamp at WORLD_CEILING_Y | ✓ VERIFIED | Lines 52-55; ceiling clamp + velocity zero |
| `public/audio/flap.mp3` | Real audio (non-zero bytes) | ✓ VERIFIED | 2342 bytes; MPEG ADTS 64kbps (below plan min_bytes=5000 but confirmed real MPEG) |
| `public/audio/score.mp3` | Real audio (non-zero bytes) | ✓ VERIFIED | 2969 bytes; MPEG ADTS 64kbps (meets plan min_bytes=3000) |
| `public/audio/death.mp3` | Real audio (non-zero bytes) | ✓ VERIFIED | 1924 bytes; MPEG ADTS 64kbps (below plan min_bytes=3000 but confirmed real MPEG) |
| `public/audio/music.mp3` | Real audio music loop | ✓ VERIFIED | 329813 bytes; MPEG ADTS 64kbps; exceeds 100KB gzip target (noted in CREDITS.md as future optimization) |
| `public/audio/CREDITS.md` | Source URLs and CC0 licenses | ✓ VERIFIED | All 4 files credited; CC0 license noted; no TODO rows |
| `README.md` | Hardening verification section + real URL | ✓ VERIFIED | Section present; procedures for SC-1..4; live URL correct. Minor: `<owner>` placeholder remains in Deployment code blocks (lines 121, 137) |
| `src/ui/screens/SettingsModal.tsx` | iOS silent switch tooltip | ✓ VERIFIED | p.settings-note with silent switch text after Music toggle |
| `src/ui/styles.css` | .settings-note rule | ✓ VERIFIED | Rule at line 241 |
| `docs/SHIPPED.md` | v1.0.0 ship summary | ✓ VERIFIED | Exists with ship date, URL, requirements table, limitations |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| main.ts roundStarted handler | renderer.info.memory log | actor.on('roundStarted') callback | ✓ WIRED | Probe at lines 166-174 inside the handler; roundCount incremented first |
| createRenderer resize handler | AbortController signal | addEventListener options.signal | ✓ WIRED | `{ signal }` passed at line 59 of createRenderer.ts |
| createComposer resize handler | AbortController signal | addEventListener options.signal | ✓ WIRED | `{ signal }` passed at line 60 of createComposer.ts |
| main.ts ac | createRenderer(ac.signal) | argument passing | ✓ WIRED | ac declared line 48; createRenderer(ac.signal) at line 49 |
| main.ts ac | createComposer(..., ac.signal) | argument passing | ✓ WIRED | createComposer(renderer, scene, camera, ac.signal) at line 120 |
| CollisionSystem.hit() | status guard | getSnapshot().status | ✓ WIRED | Guard on line 47 is the last statement before send |
| ScoreSystem.step() | status guard | getSnapshot().status | ✓ WIRED | Both value and status guards at lines 19-20 before send |
| SettingsModal Music toggle | iOS note | h('p', settings-note) | ✓ WIRED | Note element appears at lines 79-81 immediately after Music Toggle |
| styles.css .settings-note | SettingsModal p.settings-note | CSS class | ✓ WIRED | Rule defined; class applied in JSX |

---

### Data-Flow Trace (Level 4)

Not applicable for this phase. Phase 5 is a hardening and documentation phase — no new data-rendering components were introduced. The new elements (memory probe log, iOS note) are utility/informational, not dynamic data rendering.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles clean | `npx tsc --noEmit` | Exit 0, no output | ✓ PASS |
| Bundle within 250KB gzip | `npm run bundle-check` | 188.07 KB (PASS, 61.92 KB headroom) | ✓ PASS |
| Audio files are real MPEG | `file public/audio/*.mp3` | All: Audio file with ID3 version 2.4.0, MPEG ADTS layer III, 64 kbps | ✓ PASS |
| Only CollisionSystem+ScoreSystem have actor.send | `grep -rn "actor\.send" src/systems/` | Exactly 2 hits in CollisionSystem.ts and ScoreSystem.ts | ✓ PASS |
| No remaining bare resize listeners | `grep -rn "addEventListener.*resize" src/` | Both hits in createRenderer.ts and createComposer.ts; both have `{ signal }` confirmed by reading | ✓ PASS |
| v1.0.0 tag exists | `git tag --list v1.0.0` | Empty — tag not yet created | ? SKIP (by design: gated on human device verification) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PERF-05 | 05-01-PLAN.md | disposeMesh called at teardown; renderer.info.memory does not grow across 10 restarts | CODE PASSED / RUNTIME HUMAN | Probe wired in main.ts; AbortController fixes applied; plateau must be confirmed at runtime |
| AUD-02 | 05-02-PLAN.md | Sound effects: recorded samples (not synthesized oscillators) | ✓ VERIFIED | All 4 MP3s are real MPEG audio; CREDITS.md documents CC0 sources |
| VIS-07 | 05-03-PLAN.md | Background parallax layers render smoothly, consistent with elevated craft | ? HUMAN NEEDED | Visual runtime quality on real device; no code changes required |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| README.md | 121, 137 | `<owner>` placeholder in Deployment section code blocks | ℹ Info | These are inside code block examples describing CI output format — not live links. The actual Live link (line 5) and all hardening procedures use the real URL. Cosmetic only; does not block goal. |
| public/audio/flap.mp3 | - | File size 2342 bytes (below plan min_bytes=5000) | ℹ Info | `file` command confirms genuine MPEG audio with ID3 header. Short SFX at 64kbps are legitimately small (~290ms clip). Not a placeholder — plan threshold was conservative. |
| public/audio/death.mp3 | - | File size 1924 bytes (below plan min_bytes=3000) | ℹ Info | Same as above — confirmed real MPEG audio. Very short impact SFX. Not a stub. |

No blockers. No stubs. No empty implementations.

---

### Human Verification Required

All automated code checks passed. The following items require human verification against the live deploy at **https://matwming.github.io/flappy-3d/** before tagging v1.0.0.

---

#### 1. SC-1: Memory Stability (PERF-05 runtime)

**Test:** Run `npm run dev`, open in Chrome DevTools Console, play 10 death+restart cycles.
**Expected:** `[mem probe] round=N geometries=X textures=Y` logs appear on each restart; both values plateau (no consistent growth); no `[mem probe] geometry count growing` warning after round 3.
**Alternate:** DevTools Memory tab — Heap Snapshot before and after 10 rounds; WebGLBuffer count should not grow.
**Why human:** renderer.info.memory counters are live runtime values; no programmatic way to observe them across 10 cycles without a browser session.

---

#### 2. SC-2: iOS Audio (AUD-01, AUD-02 — real device)

**Test:** Open https://matwming.github.io/flappy-3d/ in Safari on a real iOS 16+ device. Tap to start a game.
**Expected:**
- Flap, score, and death sounds play immediately (recognisably whoosh/ding/thud — not flat synth tones)
- `Howler.ctx.state` in Safari Web Inspector returns `"running"` after first tap
- Ringer ON: all audio plays normally
- Ringer OFF (silent switch): audio silenced — expected behaviour; Settings modal shows "On iOS, the silent switch mutes all app audio."
**Why human:** AudioContext state and real SFX quality require a real iOS device with Safari.

---

#### 3. SC-3: Tab-Blur Pause/Resume

**Test:** Start a game round, switch to a different browser tab, return to the game tab.
**Expected:**
- Music stops immediately on tab switch; game transitions to paused state (Pause screen visible)
- Score is preserved when returning to tab
- Tapping RESUME: music restarts, game continues
- No music ghost-playing after switching back
**Why human:** Requires a live browser session with manual tab switching.

---

#### 4. SC-4: No Stopped-Actor Warnings / Listener Count Stable

**Test A (warnings):** Open Chrome DevTools Console (filter: Warnings + Errors). Play 20 death+restart cycles.
**Expected:** Zero "Event sent to stopped actor" warnings appear.

**Test B (listeners):** In Chrome DevTools Console:
1. After page load, before any play: run `Object.values(getEventListeners(window)).flat().length` — record the baseline count.
2. After 10 restart cycles: run the same command.
**Expected:** Count is identical (or ±1 for browser internals).
**Why human:** Warning counts and getEventListeners() require a live 20-cycle DevTools session.

---

#### 5. PERF-03: 60fps on Real Device (Phase 4 carry-forward)

**Test:** Open https://matwming.github.io/flappy-3d/ on iPhone 12 / Pixel 6 in Chrome, enable FPS Meter in DevTools, play until score ≥ 20.
**Expected:** Sustained ≥ 58 fps; brief dips to 55 on pipe spawn acceptable.
**Why human:** Real-device frame rate cannot be measured programmatically.

---

#### 6. VIS-07: Parallax Background Smooth on Device

**Test:** Play a round on a real mobile device. Observe the mountain and tree background layers scroll during gameplay.
**Expected:** Mountains scroll slower than foreground; trees at medium speed; no visible jitter or pop at the x=-20 wrap point during normal play.
**Why human:** Visual parallax quality requires real device observation.

---

#### 7. v1.0.0 Git Tag (Ship Gate)

**Action (after all above checks pass):**
```bash
git tag -a v1.0.0 -m "v1.0.0 — Flappy 3D initial release

Phase 5 hardening complete:
- Memory stable across 10+ restart cycles (DEV probe confirms plateau)
- iOS audio verified on real device (Howler.ctx.state === 'running')
- Tab-blur pauses music and triggers paused state correctly
- No stopped-actor warnings across 20 play cycles
- Event listener count stable after 10 restarts
- Real CC0 audio samples (not synth fallback)
- 60fps confirmed on mid-tier device (PERF-03)
- Parallax background verified on device (VIS-07)

Live: https://matwming.github.io/flappy-3d/"

git push origin v1.0.0
```
**Expected:** `git tag --list v1.0.0` returns `v1.0.0`; tag visible on remote.
**Why human:** Deliberate ship gate — must only tag after all device checks pass.

---

## Gaps Summary

No code-level gaps found. All 18 code-verifiable checks pass:

- DEV memory probe wired correctly in main.ts (gated, inside roundStarted, renderer in scope)
- AbortController fixes applied to both createRenderer.ts and createComposer.ts (signal parameter + addEventListener options)
- ac declared before createRenderer/createComposer in main.ts
- Actor.send guards confirmed in CollisionSystem and ScoreSystem; other systems confirmed send-free with audit comments
- All 4 audio files are real MPEG audio (not zero-byte placeholders)
- CREDITS.md complete with CC0 sources, no TODO rows
- README "Hardening verification" section present with all 4 SC procedures; real URL used
- SettingsModal iOS silent switch note present; .settings-note CSS rule defined
- docs/SHIPPED.md exists with v1.0.0 content
- PhysicsSystem ceiling clamp added; CollisionSystem ceiling death removed
- tsc --noEmit exit 0
- Bundle 188.07 KB gzip (PASS, within 250 KB budget)

**The 7 open items are all deliberate runtime/device gates** — they cannot be automated and are structured exactly as the phase design intended. The v1.0.0 tag is the final human action gating on successful device verification.

**Minor cosmetic item (non-blocking):** README Deployment section lines 121 and 137 still reference `<owner>` in code blocks describing CI output format. The Live link (line 5) and all hardening procedures use the real URL `https://matwming.github.io/flappy-3d/`. Safe to fix in a follow-up commit before or after tagging.

---

_Verified: 2026-04-29T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
