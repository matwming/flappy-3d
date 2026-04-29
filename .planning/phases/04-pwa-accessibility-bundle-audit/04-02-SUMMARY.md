---
phase: "04"
plan: "02"
subsystem: accessibility-pwa
tags: [pwa, a11y, colorblind, keyboard-nav, aria, focus-ring, wcag]
dependency_graph:
  requires: ["04-01"]
  provides: ["PWA-04", "A11Y-01", "A11Y-02", "A11Y-03", "A11Y-04", "A11Y-05"]
  affects: ["src/main.ts", "src/ui/UIBridge.tsx", "src/ui/screens/*", "src/render/toonMaterial.ts", "src/ui/styles.css"]
tech_stack:
  added: []
  patterns:
    - "AbortController for all keydown listeners (CLAUDE.md mandate)"
    - "beforeinstallprompt capture with window augmentation type"
    - "Colorblind palette swap via material.color.set() — no scene rebuild"
    - "onPaletteChange callback bus: main.ts → UIBridge → SettingsModal"
key_files:
  created:
    - ".planning/phases/04-pwa-accessibility-bundle-audit/04-A11Y-AUDIT.md"
  modified:
    - "src/main.ts"
    - "src/ui/UIBridge.tsx"
    - "src/ui/screens/TitleScreen.tsx"
    - "src/ui/screens/GameOverScreen.tsx"
    - "src/ui/screens/PauseScreen.tsx"
    - "src/ui/screens/SettingsModal.tsx"
    - "src/ui/styles.css"
    - "src/render/toonMaterial.ts"
decisions:
  - "Used lightweight callback prop (onPaletteChange) rather than storage events or a pub/sub bus — simplest path given SettingsModal already calls update() synchronously"
  - "birdMaterial lives in main.ts scope so palette swap requires no Bird.ts changes"
  - "install CTA gated on both showInstall (browser event fired) AND leaderboard.length >= 1 (per D-10)"
metrics:
  duration_seconds: 258
  completed_date: "2026-04-29"
  tasks_completed: 2
  files_modified: 8
  files_created: 1
---

# Phase 04 Plan 02: Install Prompt + Accessibility Summary

**One-liner:** PWA install CTA deferred to post-first-run, full keyboard nav with AbortController across all screens, aria-live score, WCAG-verified #ffd166 focus ring, 44px touch targets, and colorblind palette swap via material color set — no scene rebuild.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PWA install prompt + keyboard nav + aria-live + a11y audit | 93056ba | main.ts, TitleScreen, GameOverScreen, PauseScreen, SettingsModal, UIBridge, styles.css, toonMaterial.ts, 04-A11Y-AUDIT.md |
| 2 | Colorblind palette swap wired to Settings toggle | 93056ba | toonMaterial.ts, UIBridge.tsx, SettingsModal.tsx, main.ts (all in same commit as Task 1 — files overlapped) |

## What Was Built

### PWA Install Prompt (PWA-04, D-10)
- `BeforeInstallPromptEvent` type declared in main.ts (not in TS DOM lib)
- `window.deferredInstallPrompt` set in `beforeinstallprompt` handler using the shared AbortController
- UIBridge `App` listens for `beforeinstallprompt` via `useEffect` → sets `showInstall` state
- TitleScreen shows install CTA only when `showInstall && leaderboard.length >= 1`

### Keyboard Navigation (A11Y-01, D-15, D-16)
- TitleScreen: Enter → `actor.send({ type: 'START' })`
- GameOverScreen: Enter or Escape → `actor.send({ type: 'RESTART' })`
- PauseScreen: Escape → `actor.send({ type: 'RESUME' })` (migrated from bare addEventListener)
- All handlers use AbortController pattern per CLAUDE.md mandate

### ARIA (A11Y-02, D-19)
- GameOverScreen score div: `aria-live="polite" aria-atomic="true"` — screen readers announce final score

### Focus Ring (A11Y-03, D-16)
- Updated from `3px solid #f9c74f` to `2px solid #ffd166; outline-offset: 2px`
- Added `[role="switch"]:focus-visible` rule for Toggle components

### Touch Targets (A11Y-04, D-18)
- `#ui-root button`: `min-width: 44px; min-height: 44px` (covers all buttons)
- `.install-cta`: `min-width: 44px; min-height: 44px`

### Colorblind Palette (A11Y-05, D-13)
- `applyColorblindPalette(birdMaterial, pipeMaterial)`: bird → #ffd166, pipes → #118ab2
- `applyDefaultPalette(birdMaterial, pipeMaterial)`: bird → #ff7043, pipes → #4caf50
- Applied at startup from stored settings; toggled live via SettingsModal → onPaletteChange callback → main.ts

### WCAG Contrast Audit (A11Y-04, D-17)
- 8 UI color pairs audited; all pass ≥4.5:1 WCAG AA
- Highest ratio: GameOver heading white on overlay (19.69:1)
- Lowest ratio: New Best badge text on gold (8.97:1) — still well above threshold
- No color adjustments needed

### prefers-reduced-motion (D-12)
- All three motion call sites in main.ts are gated: `squashStretch`, `screenShake`, `particles.burst`
- No ungated calls found — Phase 3 was thorough

## Deviations from Plan

None — plan executed exactly as written. Both tasks were implemented in a single commit because the files overlapped completely; the atomic commit covers all requirements for both tasks.

## Build Status

- `tsc --noEmit`: 0 errors
- `npm run build`: clean
- Bundle: 188.01 KB gzipped (61.98 KB headroom under 250 KB budget)

## Self-Check: PASSED

- [x] `src/main.ts` modified — `git show 93056ba --name-only` confirms
- [x] `src/render/toonMaterial.ts` — `applyColorblindPalette` and `applyDefaultPalette` exported
- [x] `src/ui/screens/TitleScreen.tsx` — `AbortController`, `Enter`, `install-cta`, `leaderboard.length >= 1`
- [x] `src/ui/screens/GameOverScreen.tsx` — `AbortController`, `aria-live`
- [x] `src/ui/screens/PauseScreen.tsx` — `AbortController`
- [x] `src/ui/UIBridge.tsx` — `onPaletteChange` (6 hits)
- [x] `src/ui/styles.css` — `ffd166`, `min-width: 44px` (2 hits), `min-height: 44px` (2 hits)
- [x] `.planning/phases/04-pwa-accessibility-bundle-audit/04-A11Y-AUDIT.md` created with 8 pairs
