---
phase: 11-daily-seed-mode
verified: 2026-04-29T00:00:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Select Daily mode on title screen, tap to start, play until death. Select Daily again and replay."
    expected: "Pipe positions are identical across both runs — same gap heights in the same order. 'Today's best: N (M attempts)' updates on title after each death."
    why_human: "Determinism of obstacle layout can only be confirmed visually. The mulberry32 and setRng wiring is code-verified, but observing two identical layouts requires live play."
  - test: "Select Daily mode, die, tap 'Share' on game-over screen."
    expected: "Clipboard receives 'Daily YYYY-MM-DD: N 🐦'. Button briefly shows 'Copied!' then returns to 'Share' after ~2 seconds."
    why_human: "navigator.clipboard.writeText requires a browser context; cannot invoke in a headless spot-check without starting a server."
  - test: "Play Endless and Time-Attack modes normally."
    expected: "No regression — pipe positions vary per run (non-deterministic), timer works in Time-Attack, all Phase 6/7/8 juice (bob, trails, score popups, milestone flashes) unaffected."
    why_human: "Regression across multiple modes requires live play-testing."
  - test: "Rotate device / close tab mid-daily-run, reopen, select Daily again and play."
    expected: "Same pipe sequence restarts from the top (seed is per-UTC-date, not per-session). Title still shows correct attempt count."
    why_human: "Cross-session seed consistency requires manual testing across two separate page loads."
---

# Phase 11: Daily-Seed Mode Verification Report

**Phase Goal:** After Phase 11, selecting Daily plays a deterministic obstacle layout for today's UTC date; daily attempts tracked; Share button on GameOver copies result.
**Verified:** 2026-04-29
**Status:** human_needed (4/4 automated checks pass; 4 play-test items require human)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ObstacleSpawner uses seeded RNG (mulberry32) when `mode === 'daily'`; seed derived from YYYYMMDD UTC date | VERIFIED | `mulberry32` factory + `dailySeed()` in `src/utils/rng.ts`; `roundStarted` handler in `main.ts` (line 198–201) calls `spawner.setRng(mulberry32(dailySeed()))` when `currentMode === 'daily'`, else `spawner.setRng(Math.random)` |
| 2 | Two players on same UTC date see the same pipe sequence (deterministic) | VERIFIED (spot-check) | `mulberry32(seed)` is a pure PRNG — same seed yields same sequence. Behavioral spot-check confirmed: two `mulberry32(20260429)` instances produce identical value sequences. `dailySeed()` derives a deterministic integer from UTC `YYYYMMDD`. Cannot visually confirm two-player layout without live play (routed to human). |
| 3 | Daily attempts tracked in StorageManager v3; UI shows "Today's best: N (M attempts)" on Title | VERIFIED | `getDailyAttempt(date)` + `recordDailyAttempt(date, score)` implemented in `StorageManager.ts` (lines 159–174); `UIBridge.tsx` calls `recordDailyAttempt(todayDate(), score)` in `gameOver` branch when `mode === 'daily'` (lines 159–160); `TitleScreen.tsx` renders `.daily-stats` paragraph via IIFE conditional (lines 94–98) |
| 4 | Share button copies "Daily YYYY-MM-DD: score 🐦" to clipboard; graceful fallback; visual "Copied!" feedback for ~2s | VERIFIED | `GameOverScreen.tsx` (lines 65–76): `mode === 'daily'` guard renders Share button; `navigator.clipboard` feature-detected before use; `.writeText(text)` on click; `setCopyLabel('Copied!')` + `setTimeout(..., 2000)` restores to 'Share'; `.catch(() => {})` for silent fallback |

**Score: 4/4 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/rng.ts` | mulberry32 PRNG factory, dailySeed(), todayDate() | VERIFIED | All three exports present and substantive (17 lines, no stubs) |
| `src/systems/ObstacleSpawner.ts` | `private rng` field + `setRng()` method; `this.rng()` in `step()` | VERIFIED | `private rng: () => number = Math.random` (line 23); `setRng(rng)` method (lines 30–32); `this.rng()` in `step()` at line 63 |
| `src/storage/StorageManager.ts` | `getDailyAttempt(date)` + `recordDailyAttempt(date, score)` | VERIFIED | Both methods present (lines 159–174); `dailyAttempts` field in `SaveV3` schema (line 58) |
| `src/main.ts` | `roundStarted` handler selects RNG by mode | VERIFIED | Lines 197–202: `currentMode === 'daily'` branch calls `setRng(mulberry32(dailySeed()))`, else `setRng(Math.random)` |
| `src/ui/UIBridge.tsx` | Passes `storage` to TitleScreen; calls `recordDailyAttempt` on gameOver in daily mode; passes `mode` to GameOverScreen | VERIFIED | `storage: props.storage` at line 208; `recordDailyAttempt` at lines 159–161; `mode: snap.context.mode` to GameOverScreen at line 228 |
| `src/ui/screens/TitleScreen.tsx` | `storage` prop; `.daily-stats` paragraph when mode=daily | VERIFIED | `storage: StorageManager` in Props (line 23); IIFE rendering `h('p', { className: 'daily-stats' }, ...)` at lines 94–98 |
| `src/ui/screens/GameOverScreen.tsx` | `mode` prop; Share button in daily mode; clipboard write; Copied! feedback | VERIFIED | `mode: GameMode` in Props (line 19); full Share button implementation at lines 65–76 |
| `src/ui/styles.css` | `.daily-stats` CSS rule | VERIFIED | Line 439: `.daily-stats { font-size: 0.9rem; opacity: 0.85; margin-bottom: 8px; color: white; pointer-events: none; }` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `main.ts roundStarted` | `ObstacleSpawner.setRng` | `mulberry32(dailySeed())` when `mode==='daily'` | WIRED | Lines 197–202, conditional on `currentMode` |
| `UIBridge.tsx gameOver branch` | `StorageManager.recordDailyAttempt` | `todayDate()` + `s.context.score` | WIRED | Lines 159–161 |
| `UIBridge.tsx` → `TitleScreen` | `storage` prop | `props.storage` passed directly | WIRED | Line 208 |
| `TitleScreen` | `StorageManager.getDailyAttempt` | `storage.getDailyAttempt(todayDate())` | WIRED | Lines 94–95 |
| `UIBridge.tsx` → `GameOverScreen` | `mode` prop | `snap.context.mode` | WIRED | Line 228 |
| `GameOverScreen` → clipboard | `navigator.clipboard.writeText` | share button click handler | WIRED | Lines 69–71 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `TitleScreen.tsx` `.daily-stats` | `attempt` | `storage.getDailyAttempt(todayDate())` → reads `dailyAttempts[date]` from localStorage | Yes — reads live localStorage record set by `recordDailyAttempt` | FLOWING |
| `ObstacleSpawner.step()` `gapCenterY` | `this.rng()` | Either `mulberry32(dailySeed())` (daily) or `Math.random` (other modes) | Yes — seeded PRNG produces deterministic floats; default is `Math.random` | FLOWING |
| `GameOverScreen` Share button text | `copyLabel` state | `useState('Share')` → toggled by clipboard `.then()` | Yes — UI state driven by clipboard API response | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `mulberry32` is deterministic | Two `mulberry32(20260429)` sequences compared | Identical sequences | PASS |
| `mulberry32` output in [0,1) | 3 values checked | All within range | PASS |
| Same-day reproducibility | Two `mulberry32(dailySeed())` sequences compared | Identical | PASS |
| `dailySeed()` returns integer | `Number.isInteger(dailySeed())` | `true` | PASS |
| `todayDate()` format | `/^\d{4}-\d{2}-\d{2}$/` regex | `2026-05-01` matches | PASS |
| `tsc --noEmit` | TypeScript type check | Exit 0, no errors | PASS |
| Production build | `npm run build` | 197.65 KB gzip (budget 250 KB) | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MODE-07 | 11-01-PLAN.md | mulberry32 RNG in rng.ts; ObstacleSpawner.setRng(); main.ts roundStarted selects RNG by mode | SATISFIED | `src/utils/rng.ts` all three exports; `ObstacleSpawner.setRng()` at line 30; `main.ts` lines 197–202 |
| MODE-08 | 11-01-PLAN.md | StorageManager.getDailyAttempt + recordDailyAttempt; TitleScreen "Today's best" UI; attempt recorded on gameOver | SATISFIED | `StorageManager.ts` lines 159–174; `TitleScreen.tsx` lines 94–98; `UIBridge.tsx` lines 159–161 |
| MODE-09 | 11-01-PLAN.md | GameOverScreen Share button (daily only); clipboard.writeText; fallback; "Copied!" feedback | SATISFIED | `GameOverScreen.tsx` lines 65–76 |

---

### Anti-Patterns Found

No stubs, TODOs, FIXMEs, empty returns, or placeholder patterns found in Phase 11 files. The `Math.random` default on `private rng` is intentional — it is the correct fallback for non-daily modes.

---

### Human Verification Required

#### 1. Daily mode deterministic pipe layout

**Test:** Select Daily mode on the title screen. Play until death. Note the pipe positions (rough Y positions of first 3 gaps). Press 'Back to Title', select Daily again, play a second time.
**Expected:** The pipe gap heights appear in the same order across both runs — the sequence is deterministic for today's date.
**Why human:** Visual/spatial layout verification. The RNG wiring is code-confirmed, but whether the spawner's `step()` cycle produces a visually reproducible pattern requires live observation.

#### 2. Share button clipboard copy and feedback

**Test:** Select Daily mode, play until death, tap the Share button on the Game Over screen.
**Expected:** The clipboard receives text in the format `Daily YYYY-MM-DD: N 🐦`. The button label changes to 'Copied!' for approximately 2 seconds, then resets to 'Share'.
**Why human:** `navigator.clipboard.writeText` requires a secure browser context (HTTPS or localhost) and cannot be exercised in a headless spot-check without a running dev server.

#### 3. Regression — Endless and Time-Attack modes unaffected

**Test:** Play one round each in Endless and Time-Attack modes.
**Expected:** Endless pipes vary per run (non-deterministic). Time-Attack 60-second countdown functions normally. Phase 6/7/8 juice (bird bob on title, +1 score popups, milestone flashes, pipe color cycling) all still trigger.
**Why human:** Multi-mode regression check requires interactive play across three separate mode selections.

#### 4. Cross-session seed consistency

**Test:** Play a Daily round, close the tab, reopen the game, select Daily, play again.
**Expected:** The same pipe sequence appears from pipe 1 (seed is UTC YYYYMMDD, not session-scoped). Attempt count on title screen increments correctly across sessions.
**Why human:** Requires two distinct page loads to verify that `dailySeed()` (UTC date) produces the same integer across sessions on the same calendar day.

---

### Gaps Summary

No gaps. All four observable truths are code-verified at all four levels (exists, substantive, wired, data-flowing). Four items are routed to human play-testing because they require visual confirmation, a live browser clipboard context, or multi-session testing.

---

_Verified: 2026-04-29_
_Verifier: Claude (gsd-verifier)_
