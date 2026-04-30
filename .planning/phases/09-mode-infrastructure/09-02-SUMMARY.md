---
phase: 09-mode-infrastructure
plan: "02"
subsystem: ui-components, title-screen, ui-bridge
tags: [game-mode, ui, preact, accessibility, segmented-control]
dependency_graph:
  requires: [09-01 — GameMode type, StorageManager v3 getLastMode/setLastMode, gameMachine SET_MODE]
  provides: [ModePicker component, mode-aware TitleScreen, mode state in UIBridge]
  affects: [src/ui/components/ModePicker.tsx, src/ui/screens/TitleScreen.tsx, src/ui/UIBridge.tsx, src/ui/styles.css]
tech_stack:
  added: []
  patterns: [Preact h() functional component, aria-pressed segmented control, e.stopPropagation() for nested click isolation, CSS specificity override via #ui-root .mode-btn]
key_files:
  created:
    - src/ui/components/ModePicker.tsx
  modified:
    - src/ui/screens/TitleScreen.tsx
    - src/ui/UIBridge.tsx
    - src/ui/styles.css
decisions:
  - "Used h('button', ...) directly in ModePicker rather than the Button wrapper to override the base #ui-root button gradient cleanly without fighting specificity"
  - "Selector #ui-root .mode-btn used instead of plain .mode-btn to win specificity over #ui-root button gradient rule for inactive (transparent) state"
  - "Initial leaderboard state in UIBridge reads getLastMode() so the leaderboard shown on mount matches the pre-selected mode — avoids stale endless entries when last mode was timeAttack/daily"
metrics:
  duration_seconds: 480
  completed: "2026-04-29"
  tasks_completed: 2
  files_modified: 4
  bundle_gzip_kb: 196.75
---

# Phase 09 Plan 02: ModePicker UI Summary

**One-liner:** 3-button segmented mode picker (Endless/Time-Attack/Daily) on Title screen wired to gameMachine SET_MODE and StorageManager persistence with leaderboard refresh.

## What Was Built

A fully accessible segmented control on the Title screen letting players select game mode before starting. The selected mode persists across sessions, the leaderboard below the picker reflects entries for that mode, and mode buttons use stopPropagation to avoid accidentally triggering the tap-anywhere-START behavior.

### Task 1 — ModePicker component and segmented control CSS (9c2c0f7)

- Created `src/ui/components/ModePicker.tsx`:
  - `h('div', { role: 'group', 'aria-label': 'Game mode' }, ...)` wrapper
  - Three `h('button', ...)` elements: Endless / Time-Attack / Daily
  - `aria-pressed` on each button communicates selection state to screen readers
  - `aria-label` on each button provides accessible name
  - `e.stopPropagation()` prevents mode-button taps from bubbling to TitleScreen's onClick START handler (threat T-09-05)
  - All three modes always enabled — no unlock gating (D-14)
- Appended to `src/ui/styles.css`:
  - `.mode-picker`: flex row, `rgba(0,0,0,0.25)` pill background, padding 4px, max-width 320px
  - `#ui-root .mode-btn`: transparent background, `box-shadow: none` — overrides base `#ui-root button` gradient for inactive state (specificity match)
  - `#ui-root .mode-btn.active`: `linear-gradient(var(--btn-top), var(--btn-bottom))` — reuses theme tokens
  - `min-height: 44px` on `.mode-btn` (BEAUTY-11 touch target standard)
  - Hover, active, focus-visible states for all button variants

### Task 2 — TitleScreen + UIBridge wiring (b4d83a7)

- `src/ui/screens/TitleScreen.tsx`:
  - Added `import type { GameMode }` from gameMachine and `import { ModePicker }` from components
  - Extended `Props` with `mode: GameMode` and `onModeChange: (mode: GameMode) => void`
  - `h(ModePicker, { mode, onModeChange })` inserted above leaderboard div
  - Existing keyboard handler (Enter → START) and tap-anywhere-START unchanged

- `src/ui/UIBridge.tsx`:
  - Added `import type { GameMode }` from gameMachine
  - `const [mode, setMode] = useState<GameMode>(() => props.storage.getLastMode())` — pre-selects stored mode on mount
  - Initial leaderboard state changed from hardcoded `'endless'` to `props.storage.getLastMode()` — synced with mode state
  - `handleModeChange(newMode)`: sends `SET_MODE` to actor, calls `setLastMode`, updates `mode` state, refreshes leaderboard
  - Mode and onModeChange threaded through to TitleScreen in JSX

## Verification Results

```
tsc --noEmit: 0 errors
npm run build: 196.75 KB gzip (budget: 250 KB; delta: +0.20 KB from 09-01 baseline)

grep "export function ModePicker" src/ui/components/ModePicker.tsx   → 1 hit (line 15)
grep "mode-picker\|mode-btn" src/ui/styles.css                       → 6 hits
grep "ModePicker" src/ui/components/ModePicker.tsx                   → 1 hit
grep "ModePicker" src/ui/screens/TitleScreen.tsx                     → 2 hits (import + usage)
grep "handleModeChange\|setLastMode" src/ui/UIBridge.tsx             → 3 hits
grep "getLastMode" src/ui/UIBridge.tsx                               → 2 hits
grep "SET_MODE" src/ui/UIBridge.tsx                                  → 1 hit
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. ModePicker renders all 3 modes as fully interactive. Time-Attack and Daily buttons are visible and selectable (as intended by D-14); they store the selection and show the (currently empty) per-mode leaderboard. No placeholder text or hardcoded empty UI.

## Threat Flags

No new threat surface beyond the plan's threat model.

| Threat | Status |
|--------|--------|
| T-09-05: mode-button tap triggers TitleScreen START | Mitigated via e.stopPropagation() in ModePicker onClick |
| T-09-06: invalid GameMode rendered | Accept — TypeScript literal union prevents out-of-range values at compile time |
| T-09-07: Time-Attack/Daily labels visible before mechanics exist | Accept — no PII, no security concern |

## Self-Check: PASSED

| Item | Result |
|------|--------|
| src/ui/components/ModePicker.tsx | FOUND |
| src/ui/screens/TitleScreen.tsx | FOUND (ModePicker import + usage verified) |
| src/ui/UIBridge.tsx | FOUND (handleModeChange + SET_MODE send verified) |
| src/ui/styles.css | FOUND (.mode-picker + #ui-root .mode-btn rules verified) |
| commit 9c2c0f7 (Task 1) | FOUND |
| commit b4d83a7 (Task 2) | FOUND |
