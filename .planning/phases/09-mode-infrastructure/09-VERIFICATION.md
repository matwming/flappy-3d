---
phase: 09-mode-infrastructure
verified: 2026-04-29T00:00:00Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Title screen shows 3-button mode picker (Endless / Time-Attack / Daily) above leaderboard"
    expected: "Three buttons visible; Endless pre-selected by default on fresh install; selected button has gradient background; inactive buttons are transparent"
    why_human: "Cannot verify Preact render output or CSS visual state programmatically without a browser"
  - test: "Tap Time-Attack button — leaderboard refreshes to empty, mode persists on page refresh"
    expected: "Time-Attack button becomes highlighted; leaderboard below shows empty (no entries); after page reload the Time-Attack button is still selected"
    why_human: "Requires browser interaction and localStorage state read"
  - test: "Play a round in Endless mode, die — score appears in Endless leaderboard, not Time-Attack"
    expected: "After dying, return to Title; Endless leaderboard shows score; switching to Time-Attack shows empty leaderboard"
    why_human: "Requires real gameplay session to verify mode-aware leaderboard routing"
  - test: "v2 save migration: populate localStorage with a v2 JSON blob, reload — existing leaderboard entries appear under Endless"
    expected: "v2 entries (flat `leaderboard` array) migrated to Endless bucket; schemaVersion shows 3 in DevTools Application tab"
    why_human: "Requires manual localStorage manipulation + browser DevTools inspection"
  - test: "Endless mode behavior regression: bird bobs on title, demo pipes scroll, +1 popups appear, milestone flash fires at score 10/25/50, Glass UI overlays visible"
    expected: "All Phase 6/7/8 features unaffected by mode infrastructure additions"
    why_human: "Visual and gameplay regression requires human eyeball"
---

# Phase 9: Mode Infrastructure Verification Report

**Phase Goal:** After Phase 9, the game supports a `mode` context (`'endless' | 'timeAttack' | 'daily'`), Title shows a mode picker, per-mode leaderboards persist via StorageManager v3 (with safe migration from v2). No new playable mode — just the rails.
**Verified:** 2026-04-29
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `gameMachine.context.mode` is one of `'endless'`, `'timeAttack'`, `'daily'`; defaults to `'endless'`; persists across rounds within a session | ✓ VERIFIED | `GameMode` type exported at line 6 of `gameMachine.ts`; `mode: GameMode` in `GameContext`; initialized from `input.mode ?? 'endless'`; START/RESTART actions only assign `{ score: 0, runDuration: 0 }` — mode not reset |
| 2 | StorageManager v3 schema: `leaderboardByMode: { endless, timeAttack, daily }`; v2 `leaderboard` migrates into `leaderboardByMode.endless` on first read | ✓ VERIFIED | `SaveV3` interface at line 49; `leaderboardByMode` in schema; v2 branch at line 81 maps `parsed.leaderboard` into `endless` bucket; comment confirms read-only (no `save()` call in migration path) |
| 3 | Title screen shows a 3-option mode picker; selection sends `SET_MODE`; selected mode visually highlighted | ✓ VERIFIED (code) / ? VISUAL | `ModePicker.tsx` renders 3 buttons; `h(ModePicker, { mode, onModeChange })` at line 91 of `TitleScreen.tsx`; `.mode-btn.active` gradient in `styles.css`; visual appearance requires human check |
| 4 | `SET_MODE` accepted in title state only; no transition; assigns `context.mode` | ✓ VERIFIED | `SET_MODE` handler at line 64 of `gameMachine.ts` with `actions: assign({ mode: ({ event }) => event.mode })` and no `target`; not present in playing/paused/dying/gameOver states |
| 5 | `getLeaderboard(mode)`, `pushLeaderboard(mode, entry)`, `getLastMode()`, `setLastMode()` all exist and typed | ✓ VERIFIED | All four methods found in `StorageManager.ts` (lines 129–177) with correct overloads and TypeScript types |
| 6 | UIBridge gameOver branch routes `pushLeaderboard` to `s.context.mode`; leaderboard refreshes for that mode | ✓ VERIFIED | Lines 148–152 of `UIBridge.tsx`: reads `s.context.mode`, calls `pushLeaderboard(mode, { score, ts })`, reads `getLeaderboard(mode)` |
| 7 | `main.ts` seeds `createActor` input with `mode: storage.getLastMode()` | ✓ VERIFIED | Line 54 of `main.ts`: `input: { bestScore: storage.getBestScore(), mode: storage.getLastMode() }` |
| 8 | `tsc --noEmit` exits 0; bundle ≤250KB gzip | ✓ VERIFIED | `tsc --noEmit` produced no output (exit 0); build output: `196.75 kB` gzip — within 250KB budget |

**Score:** 8/8 truths verified (5 human verification items needed for runtime/visual checks)

### Deferred Items

None. All Phase 9 deliverables are verifiable at this phase.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/machine/gameMachine.ts` | `GameMode` type, `GameContext.mode`, `SET_MODE` event, title handler | ✓ VERIFIED | All four present; `SET_MODE` only in title state; no target on handler |
| `src/storage/StorageManager.ts` | `SaveV3` schema, v2→v3 migration, `getLeaderboard(mode)`, `pushLeaderboard(mode, entry)`, `getLastMode`, `setLastMode` | ✓ VERIFIED | Full v3 schema; both overload signatures; migration preserves v2 endless entries; read-only on load confirmed |
| `src/ui/components/ModePicker.tsx` | 3-button segmented control, `aria-pressed`, `e.stopPropagation()` | ✓ VERIFIED | File exists; exports `ModePicker`; 3 buttons with `aria-pressed`, `aria-label`, and `stopPropagation` |
| `src/ui/screens/TitleScreen.tsx` | `ModePicker` imported and rendered; `mode`/`onModeChange` props | ✓ VERIFIED | `ModePicker` imported at line 9, rendered at line 91; Props extended with `mode` and `onModeChange` |
| `src/ui/UIBridge.tsx` | `mode` state from `getLastMode()`; `handleModeChange` (send+persist+refresh); mode threaded to TitleScreen | ✓ VERIFIED | `const [mode, setMode] = useState<GameMode>(() => props.storage.getLastMode())` at line 131; `handleModeChange` at line 167 performs all three ops; threaded at line 197 |
| `src/ui/styles.css` | `.mode-picker`, `#ui-root .mode-btn`, `#ui-root .mode-btn.active` with ≥44px touch targets | ✓ VERIFIED | All selectors present (lines 352–411); `min-width: 44px; min-height: 44px` confirmed |
| `src/main.ts` | `createActor` seeded with `mode: storage.getLastMode()` | ✓ VERIFIED | Line 54 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `UIBridge.tsx` | `StorageManager.pushLeaderboard(mode, entry)` | gameOver branch at line 151 | ✓ WIRED | `pushLeaderboard(mode, { score: s.context.score, ts: Date.now() })` |
| `gameMachine.ts` | `title.on.SET_MODE` | `assign({ mode: ({ event }) => event.mode })` at line 64 | ✓ WIRED | No target — stays in title state |
| `ModePicker.tsx` | `actor.send(SET_MODE)` | via `onModeChange` prop → `handleModeChange` in UIBridge | ✓ WIRED | `onClick` calls `onModeChange(value)`; UIBridge sends `{ type: 'SET_MODE', mode: newMode }` |
| `TitleScreen.tsx` | `storage.setLastMode` | via `handleModeChange` in UIBridge at line 169 | ✓ WIRED | `props.storage.setLastMode(newMode)` |
| `UIBridge.tsx` | `storage.getLeaderboard(mode)` | `handleModeChange` line 171; gameOver branch line 152 | ✓ WIRED | Both call sites confirmed |
| `main.ts` | `storage.getLastMode()` | `createActor` input at line 54 | ✓ WIRED | `mode: storage.getLastMode()` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `ModePicker.tsx` | `mode` prop | `useState(() => props.storage.getLastMode())` in UIBridge | Yes — reads from `StorageManager.load().settings.lastMode` | ✓ FLOWING |
| `TitleScreen.tsx` | `leaderboard` prop | `useState(() => props.storage.getLeaderboard(getLastMode()))` + `setLeaderboard` on mode change and gameOver | Yes — reads `leaderboardByMode[mode]` from parsed localStorage | ✓ FLOWING |
| `UIBridge.tsx` gameOver branch | `pushLeaderboard` call | `s.context.mode` from live actor snapshot | Yes — writes to `leaderboardByMode[mode]` bucket and calls `this.save(data)` | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for game logic requiring browser interaction. TypeScript compilation (tsc --noEmit) and build size are the automated proxies for correctness. All runnable checks in this step require a browser session.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MODE-01 | 09-01 | `gameMachine.context.mode` is `'endless' \| 'timeAttack' \| 'daily'`; defaults to `'endless'`; persists across rounds | ✓ SATISFIED | `GameMode` type + `mode: GameMode` context field + `input.mode ?? 'endless'`; START/RESTART don't reset mode |
| MODE-02 | 09-01 | StorageManager v3: `leaderboardByMode`; v2 migration into `endless` bucket | ✓ SATISFIED | Full `SaveV3` schema; v2→v3 migration path; `getLeaderboard(mode)`, `pushLeaderboard(mode, entry)`, `getLastMode`, `setLastMode` |
| MODE-03 | 09-02 | Title screen 3-option mode picker; sends `SET_MODE`; selected mode highlighted; persists in StorageManager | ✓ SATISFIED (code) | `ModePicker.tsx` created; wired in TitleScreen; UIBridge threads mode state and handles persistence via `setLastMode`; visual highlight requires human check |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `StorageManager.ts` | 58 | `dailyAttempts: Record<string, { count; best }>` initialized as `{}` in `defaults()` | ℹ️ Info | Intentional placeholder — Phase 11 (daily-seed) will populate it; no UI reads this field in Phase 9 |

No blocking or warning anti-patterns found. The `dailyAttempts` placeholder is explicitly intentional per the plan and SUMMARY.md.

### Human Verification Required

#### 1. Mode Picker Visual Rendering

**Test:** Open the game in a browser. Observe the Title screen.
**Expected:** Three segmented buttons labeled "Endless", "Time-Attack", and "Daily" appear above the leaderboard. "Endless" is highlighted (gradient background) and others are transparent.
**Why human:** Cannot verify Preact render output or CSS computed visual state without a browser.

#### 2. Mode Persistence on Refresh

**Test:** On the Title screen, tap "Time-Attack". The button should highlight. Reload the page.
**Expected:** After reload, "Time-Attack" button is still selected (pre-selected from `storage.getLastMode()`). Leaderboard below shows empty Time-Attack entries.
**Why human:** Requires browser interaction and localStorage round-trip verification.

#### 3. Mode-Aware Leaderboard Write

**Test:** Select "Endless" mode. Start a game, score some points, die. Return to Title.
**Expected:** Endless leaderboard shows the score. Switch to Time-Attack — leaderboard is empty. Switch back to Endless — score is still there.
**Why human:** Requires a real gameplay session to trigger the `gameOver` branch and verify `pushLeaderboard(mode, ...)` wrote to the correct bucket.

#### 4. v2 Save Migration

**Test:** Open DevTools → Application → Local Storage → `flappy-3d:v1`. Set the value to a valid v2 JSON: `{"schemaVersion":2,"bestScore":15,"leaderboard":[{"score":15,"ts":1700000000000},{"score":10,"ts":1699000000000}],"settings":{"sound":true,"music":true,"reduceMotion":"auto","palette":"default","flapTrail":false}}`. Reload the page.
**Expected:** The Title screen Endless leaderboard shows entries for score 15 and 10. DevTools shows `schemaVersion: 3` and `leaderboardByMode.endless` contains the migrated entries. The original `leaderboard` key is gone (superseded by `leaderboardByMode`).
**Why human:** Requires manual localStorage injection and DevTools inspection.

#### 5. Phase 6/7/8 Regression Check

**Test:** With Endless mode selected, play through the title and game. Observe: bird bobs on title, demo pipes scroll past, "+1" popups appear when scoring, a gold flash fires at score 10, glass overlay is visible on game-over screen.
**Expected:** All Phase 6/7/8 visual features (bird bob, demo pipes, score popups, milestones, glass UI) unaffected.
**Why human:** Visual regression requires human eyeball; no automated test for these features exists.

### Gaps Summary

No gaps found. All code-level must-haves are verified. The 5 human verification items cover runtime/visual behaviors that cannot be validated by static analysis:

- Visual rendering of ModePicker on Title screen (MODE-03 visual side)
- Mode persistence and localStorage round-trip
- Mode-aware leaderboard routing during actual gameplay
- v2 save migration correctness verified at runtime
- Phase 6/7/8 regression (Endless mode unchanged)

All automated checks passed:
- `tsc --noEmit` exits 0 (zero TypeScript errors)
- Bundle: 196.75 KB gzip (budget: 250 KB; headroom: 53.25 KB)
- GameMode type exported from both `gameMachine.ts` and `StorageManager.ts`
- SET_MODE handler in title state only, no target (assign-only)
- StorageManager v3 schema complete with all required methods
- v2→v3 migration is read-only (no `save()` call in migration branch)
- UIBridge mode-aware push wired
- `main.ts` seeds `createActor` with `mode: storage.getLastMode()`

---

_Verified: 2026-04-29_
_Verifier: Claude (gsd-verifier)_
