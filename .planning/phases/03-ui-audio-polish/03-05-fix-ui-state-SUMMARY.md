---
phase: 03-ui-audio-polish
plan: 05
subsystem: ui
tags: [preact, xstate, css, a11y, animation]

requires:
  - phase: 03-ui-audio-polish/03-03-screens
    provides: UIBridge, SettingsModal, GameOverScreen, NewBestBadge, styles.css

provides:
  - priorBest captured via useRef on round-start (playing entry), not at gameOver
  - SettingsModal reduce-motion toggle evaluates live OS matchMedia for 'auto' mode
  - Screen opacity transitions capped at 120ms (satisfies HUD-07 <150ms)

affects: [03-06-fix-audio-motion, phase-04-pwa]

tech-stack:
  added: []
  patterns:
    - "Snapshot-before-write: when a state machine entry action mutates storage synchronously, capture UI state before entry via useRef on the preceding transition"
    - "matchMedia live query for OS preference display (not persisted value alone)"

key-files:
  created: []
  modified:
    - src/ui/UIBridge.tsx
    - src/ui/screens/SettingsModal.tsx
    - src/ui/styles.css

key-decisions:
  - "Use useRef (not useState) to snapshot priorBest — ref persists across renders without causing re-renders on round-start"
  - "matchMedia evaluated inline in render (not cached in state) so it reflects current OS setting at modal-open time"
  - "replace_all used for CSS 250ms→120ms to update both .screen and .hud-screen in one operation"

patterns-established:
  - "Pattern: pre-write snapshot via useRef — capture storage value when entering the preceding state, use it when exiting"

requirements-completed: [HUD-05, HUD-06, HUD-07, ANIM-06]

duration: 8min
completed: 2026-04-29
---

# Phase 03 Plan 05: Fix UI State Summary

**priorBest race fixed via useRef snapshot on round-start; reduce-motion toggle wired to live matchMedia; both screen opacity transitions reduced from 250ms to 120ms**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-29T00:55:00Z
- **Completed:** 2026-04-29T01:03:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Fixed priorBest race condition: gameMachine writes best score synchronously on gameOver entry, so reading `getBestScore()` inside the gameOver subscriber always returned the new (already-updated) value. A `useRef` now snapshots the best score when transitioning INTO `playing`, and that ref value is used in the gameOver branch — enabling NewBestBadge to display on every run where the player beats their previous best.
- Fixed SettingsModal reduce-motion toggle: the old expression `reduceMotion !== 'off'` treated `'auto'` as enabled. Replaced with a proper expression that evaluates `window.matchMedia('(prefers-reduced-motion: reduce)').matches` for the `'auto'` case, so the toggle shows OFF when the OS allows motion.
- Reduced both screen opacity transitions from 250ms to 120ms (satisfies HUD-07 <150ms requirement); cubic-bezier easing preserved.

## Task Commits

1. **Task 1: Fix priorBest race in UIBridge** - `cd5d362` (fix)
2. **Task 2: Fix SettingsModal reduce-motion and CSS transitions** - `91ac3f5` (fix)

## Files Created/Modified

- `src/ui/UIBridge.tsx` — Added `useRef` import; added `priorBestRef` initialized from storage; snapshot on `playing` entry; use ref value (not storage) in `gameOver` block
- `src/ui/screens/SettingsModal.tsx` — Replaced `reduceMotion !== 'off'` with `=== 'on' || (=== 'auto' && matchMedia(...).matches)` on line 48
- `src/ui/styles.css` — Changed both `250ms` opacity transition durations to `120ms` (lines 19 and 89)

## Decisions Made

- Used `useRef` (not `useState`) for `priorBestRef` — the snapshot only needs to persist across renders, not trigger re-renders on round-start.
- `matchMedia` evaluated inline at render time rather than cached in state — reflects current OS setting when the modal opens, no staleness risk.
- Did NOT touch the `onChange` handler in SettingsModal (line 75 writes `'on'/'off'` when user explicitly toggles — already correct behavior).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- HUD-05, HUD-06, HUD-07, ANIM-06 requirements now SATISFIED
- NewBestBadge will display correctly from the very first run (priorBest=0, any score>0 is a new best)
- Plan 03-06 (audio + motion fixes) can proceed — no file overlap with this plan

## Threat Flags

None — `window.matchMedia` is a read-only browser API returning a boolean; no PII involved (per plan threat register T-03-05-01: accepted).

## Self-Check

- `src/ui/UIBridge.tsx` modified: CONFIRMED (git log shows cd5d362)
- `src/ui/screens/SettingsModal.tsx` modified: CONFIRMED (git log shows 91ac3f5)
- `src/ui/styles.css` modified: CONFIRMED (git log shows 91ac3f5)
- `tsc --noEmit` exits 0: CONFIRMED
- `npm run build` exits 0 at 194.43 KB gzip: CONFIRMED
- `priorBestRef` — 3 hits in UIBridge.tsx: CONFIRMED
- `getBestScore` NOT inside gameOver block: CONFIRMED
- `matchMedia` — 1 hit in SettingsModal.tsx: CONFIRMED
- `120ms` — 2 hits in styles.css: CONFIRMED
- `250ms` — 0 hits in styles.css: CONFIRMED

## Self-Check: PASSED

---
*Phase: 03-ui-audio-polish*
*Completed: 2026-04-29*
