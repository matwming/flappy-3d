---
phase: "05"
plan: "03"
subsystem: verify-ship
tags: [readme, documentation, ios-note, shipped]
dependency_graph:
  requires: [05-01-hardening-audit, 05-02-real-audio]
  provides: [hardening-verification-docs, ios-silent-switch-ux, ship-summary]
  affects: [README.md, src/ui/screens/SettingsModal.tsx, src/ui/styles.css, docs/SHIPPED.md]
tech_stack:
  added: []
  patterns: [settings-note CSS utility, docs/ directory]
key_files:
  created:
    - docs/SHIPPED.md
  modified:
    - README.md
    - src/ui/screens/SettingsModal.tsx
    - src/ui/styles.css
decisions:
  - "docs/SHIPPED.md created as standalone file per D-20 (Claude's discretion) rather than further expanding README"
  - "Hardening verification section appended between Performance Testing and Deployment in README — surgical, no reformat"
  - "settings-note p element added after Music toggle only (not after Sound toggle) per plan spec"
  - "Tasks 4 (human verify) and 5 (v1.0.0 tag) deliberately skipped — await user real-device verification"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-29"
  tasks_completed: 3
  tasks_total: 5
  files_modified: 4
---

# Phase 05 Plan 03: Verify + Ship Summary

**One-liner:** README hardening section (SC-1..SC-4 procedures) + SettingsModal iOS silent switch note + docs/SHIPPED.md created; Tasks 4-5 (real-device verify + v1.0.0 tag) await human sign-off.

---

## Partial Completion Status

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | README polish — fix Live link + Hardening verification section | COMPLETE | 8f7debf |
| 2 | Add iOS silent switch note to SettingsModal | COMPLETE | cf239dd |
| 3 | Create docs/SHIPPED.md v1.0.0 summary | COMPLETE | bcd8d78 |
| 4 | Human verification: SC-2, SC-3, PERF-03, VIS-07 | AWAITING HUMAN | — |
| 5 | Tag v1.0.0 and push | NOT STARTED | — |

Tasks 4-5 are intentionally deferred. The v1.0.0 tag is a production artifact that must only be created after the user confirms all four real-device checks pass.

---

## What Was Built

### Task 1 — README: Live URL + Hardening verification section

**Edit 1:** Fixed the Live link placeholder:
- Before: `https://<owner>.github.io/flappy-3d/`
- After: `https://matwming.github.io/flappy-3d/`

**Edit 2:** Added `## Hardening verification` section between "Performance Testing" and "Deployment". The section contains four sub-sections:

| Sub-section | Maps to | Key verification |
|-------------|---------|-----------------|
| SC-1: Memory stability | PERF-05 | DEV console `[mem probe]` log; heap snapshot before/after |
| SC-2: iOS audio | AUD-01, AUD-02 | `Howler.ctx.state === 'running'` via Safari Web Inspector; ringer ON/OFF |
| SC-3: Tab-blur pause/resume | HUD-04 | Switch tab → paused state; return → score preserved; RESUME → music plays |
| SC-4: No stopped-actor / listener accumulation | SC-4 | 20-cycle warning check; `getEventListeners(window)` baseline vs after-10 |

No other README sections were modified or reformatted.

### Task 2 — SettingsModal: iOS silent switch note

Added a single `h('p', { className: 'settings-note' }, ...)` element immediately after the Music toggle in SettingsModal:

```typescript
h('p', { className: 'settings-note' },
  'On iOS, the silent switch mutes all app audio.',
),
```

Added `.settings-note` CSS rule in `src/ui/styles.css`:

```css
.settings-note {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
  margin: -0.25rem 0 0.5rem 0;
  padding: 0;
}
```

The note is subdued (55% white opacity, 0.72rem) so it reads as informational context, not a warning. No new imports added. TypeScript strict mode passes.

### Task 3 — docs/SHIPPED.md

Created `docs/` directory and `docs/SHIPPED.md` with:
- Shipped date, live URL, bundle size
- What-shipped narrative (stack overview)
- 5-phase requirements coverage table (62/62 requirements)
- Known limitations (4 items: endless-only, local leaderboard, iOS silent switch, parallax seam)
- Stack summary
- Acknowledgements (guiguan/flappy-anna-3d reference baseline)

File: 46 lines, standalone, does not duplicate README.

---

## Task 4: Human Verification Checklist (AWAITING YOUR ACTION)

Before running `git tag v1.0.0`, please verify all four checks against https://matwming.github.io/flappy-3d/

**Check A — SC-2: iOS audio (real device required)**
1. Open URL in Safari on a real iOS device (iOS 16+)
2. Tap to start a game — confirm flap/score/death sounds play (not silence)
3. In Safari Web Inspector: run `Howler.ctx.state` — expected: `"running"`
4. Flip ringer to OFF — audio should silence (documented platform behaviour)
5. Open Settings — confirm "On iOS, the silent switch mutes all app audio." note is visible under Music toggle

**Check B — SC-3: Tab-blur pause**
1. Start a game round
2. Switch to a different tab
3. Return — confirm Pause screen shown and score preserved
4. Tap RESUME — confirm music resumes

**Check C — PERF-03: 60fps on real device**
1. Open on iPhone 12 or Pixel 6 in Chrome
2. Enable FPS meter via DevTools
3. Play until score >= 20
4. Confirm sustained >= 58fps

**Check D — VIS-07: Parallax background**
1. Play a round on device
2. Observe mountain/tree background layers scrolling at different speeds
3. Confirm: no visible jitter or pop at the x=-20 wrap point during normal play

When all four pass, run:
```bash
git tag -a v1.0.0 -m "v1.0.0 — Flappy 3D initial release" && git push origin v1.0.0
```

---

## Deviations from Plan

None — tasks 1-3 executed exactly as specified. Tasks 4-5 deliberately not executed per the objective instructions (user runs real-device tests and decides when to tag).

---

## Known Stubs

None in tasks 1-3. The only "stub" is the deferred v1.0.0 tag — awaiting human verification before creation.

---

## Threat Flags

None. All files are documentation or minor UI text. No new network endpoints, auth paths, or schema changes introduced.

---

## Self-Check: PASSED

Files exist:
- /Users/ming/projects/flappy-3d/README.md — MODIFIED, contains "Hardening verification" and "matwming"
- /Users/ming/projects/flappy-3d/src/ui/screens/SettingsModal.tsx — MODIFIED, contains "silent switch"
- /Users/ming/projects/flappy-3d/src/ui/styles.css — MODIFIED, contains ".settings-note"
- /Users/ming/projects/flappy-3d/docs/SHIPPED.md — CREATED, 46 lines, contains "v1.0.0"

Commits exist:
- 8f7debf — Task 1 README (FOUND)
- cf239dd — Task 2 SettingsModal + CSS (FOUND)
- bcd8d78 — Task 3 SHIPPED.md (FOUND)

No v1.0.0 tag: confirmed (git tag --list v1.0.0 returns empty)
TypeScript: tsc --noEmit exits 0
