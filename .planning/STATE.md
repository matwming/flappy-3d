---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-04-29T04:35:59.168Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 17
  completed_plans: 12
  percent: 71
---

# Project State — Flappy 3D

**Last updated:** 2026-04-28
**Updated by:** gsd-roadmapper

---

## Project Reference

**Core value:** The game must feel palpably more crafted than `guiguan/flappy-anna-3d` within 30 seconds of play — polished motion, real menus, real audio, 60fps on a mid-tier phone.
**Current focus:** Phase 03 — ui-audio-polish

---

## Current Position

Phase: 4
Plan: 4 (next to execute)
| Field | Value |
|-------|-------|
| Phase | 4 |
| Phase name | PWA + Accessibility + Bundle Audit |
| Plans complete | 04-01 (pwa-setup), 04-03 (bundle-audit) |
| Plans planned not executed | 04-02 (a11y), 04-04 (deploy) |
| Status | 04-01 ✓, 04-03 ✓; ready for 04-02 and 04-04 |
| Phase goal | Lighthouse PWA ≥90, offline play, colorblind mode, <250KB confirmed, deploy target locked |

**Progress bar:**

```
Phase 1 [██████████] 100% ✓ (user-verified 2026-04-28)
Phase 2 [██████████] 100% ✓ (user-verified 2026-04-29)
Phase 3 [██████████] 100% ✓ (03-01 audio ✓, 03-02 ui-infra ✓, 03-03 screens ✓, 03-04 juice ✓, 03-05 fix-ui-state ✓, 03-06 fix-audio-motion ✓)
Phase 4 [████      ] 50% (04-01 pwa-setup ✓, 04-03 bundle-audit ✓)
Phase 5 [          ] 0%
```

---

## Accumulated Context

### Decisions Locked

| Decision | Rationale |
|----------|-----------|
| Vite + TS + Three.js vanilla | Smallest bundle, direct control, fair comparison to baseline |
| No React / R3F | Avoids runtime tax; DOM overlay sufficient for menu layer |
| No physics library | Hand-rolled AABB via THREE.Box3 (~20 lines, zero KB) |
| XState v5 for state machine | Replaces hand-rolled booleans; flat 5-state machine |
| GSAP for tweens | Elastic/back eases; integrates via `gsap.ticker.add` |
| Howler.js for audio | Handles iOS unlock; SFX sprites + music |
| Preact for reactive UI bits | 4.7KB; score, leaderboard, settings toggles |
| three.quarks for particles | 42KB; fallback = bespoke THREE.Points if compat fails |
| Granularity: Coarse (5 phases) | Small game scope; fast iteration |
| Endless mode only (v1) | Focus on core loop polish |
| Local-only leaderboard | Zero infra; localStorage sufficient for solo play |
| Named Three.js imports only | Mandatory — `import * as THREE` = 128KB gzip penalty |
| HUD uses .hud-screen (not .screen) | Avoids blocking canvas pointer events during play |
| gameMachine paused state real (not stub) | PauseScreen requires actor.value==='paused' to activate |
| Score reset on START/RESTART actions (not playing entry) | Allows resume-from-pause without resetting score |
| scheduleAutoRestart removed | GameOverScreen tap → actor.send(RESTART) is the restart path |

### Pre-Phase Flags

| Flag | Phase | Action |
|------|-------|--------|
| Verify three.quarks 0.17.0 vs Three.js r175 compat | Before Phase 3 | Test before writing particle system; fallback = bespoke THREE.Points |
| Decide deployment target | Before Phase 4 | GitHub Pages sub-path vs custom domain → sets Vite `base` |

### Known Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| three.quarks r175 compat breaks | MEDIUM | Pin 0.17.0; fallback = THREE.Points |
| Tree-shaken Three.js > 50KB | MEDIUM | Run visualizer after Phase 1; rebudget if needed |
| Mobile GPU tier heuristic inaccurate | LOW | Test bloom gating on real Pixel 6 |

### Session Continuity

**What was done last (this session):**

- Phase 4 Plan 03 (bundle-audit) executed: 2 tasks, 2 commits.
  - Task 1: scripts/bundle-check.sh — CI gate, gzips dist/assets/*.js, exits non-zero if >250KB; npm run bundle-check added (b960fb0)
  - Task 2: README.md created with Bundle Budget + Performance Testing sections (60fps manual procedure) (cba1d55)
- Current bundle: 187.64 KB gzip (62.35 KB headroom under 250 KB budget)
- Requirements PERF-01, PERF-03 now SATISFIED

**What's next:**

Execute Phase 4 Plan 02 (a11y): install prompt, keyboard nav, aria-live, colorblind palette swap (PWA-04, A11Y-01..05)
Then Phase 4 Plan 04 (deploy): GitHub Pages workflow, Lighthouse gate.

**Phase 3 plan summary:**

- `03-01-audio-PLAN.md` — Howler install, fetch 4 audio assets, AudioManager singleton with iOS unlock, music fade-out (AUD-01..05)
- `03-02-ui-infra-PLAN.md` — Preact install, #ui-root in index.html, UIBridge mount, StorageManager v2 schema (HUD-01, HUD-08, SAVE-03, SAVE-04)
- `03-03-screens-PLAN.md` — 5 Preact screens (Title, HUD, Pause, GameOver, Settings) + 4 shared components (HUD-02..07)
- `03-04-juice-PLAN.md` — GSAP install, squash/shake/score-pop helpers, ParticleEmitter (bespoke fallback) (ANIM-01..06 + A11Y-01 motion gate)

**Bundle target:** Phase 3 should land at ~210KB gzipped (was 143KB after Phase 2; +60-70KB for Howler + Preact + GSAP + game code). Still under 250KB Phase 4 budget.

**Resume commands:**

- `/gsd-execute-phase 03 --auto --no-transition` (recommended — auto-execute all 4 plans sequentially)
- OR `cat .planning/phases/03-ui-audio-polish/03-01-audio-PLAN.md` then implement inline

**Blockers:**

- None functional. Audio sourcing is the only realtime-dependent step (WebFetch from Pixabay needs working internet); plan has fallback to TODO-marked placeholder if fetch fails.

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| JS bundle gzipped | <250KB | 194.40KB (Phase 3 complete; +65.8KB for Howler+Preact+GSAP; Phase 4 PERF-01 will audit) |
| FPS on Pixel 6 class | 60fps | Unmeasured (Phase 4 PERF-03) |
| Lighthouse PWA | ≥90 | 0 (Phase 4 PWA-05) |
| tsc --noEmit | 0 errors | ✓ 0 errors (strict + noUncheckedIndexedAccess) |

---
| Phase 03 P01 | 218 | 2 tasks | 9 files |
| Phase 03 P02 | 420 | 3 tasks | 9 files |
| Phase 03 P03 | 1089 | 3 tasks | 13 files |
| Phase 03 P04 | 119 | 3 tasks | 6 files |
| Phase 04 P01 | 165 | 2 tasks | 8 files |
| Phase 04 P03 | 87 | 2 tasks | 3 files |

## Phase Log

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| 1 | ✓ Complete | 2026-04-28 | 4 plans, 4 commits, user-verified in browser |
| 2 | ✓ Complete | 2026-04-29 | 3 plans, 6 atomic commits; user-verified in browser |
| 3 | ✓ Complete | 2026-04-29 | 6 plans, 12 atomic commits; HUD-04, AUD-03, ANIM-06 closed; 194.49 KB gzip |
| 4 | In progress | - | 04-01 pwa-setup ✓; 04-02..04 pending |
| 5 | Not started | - | Blocked on Phase 4 |

---

*This file is the project's memory. Update at every phase transition and plan completion.*

**Planned Phase:** 04 (pwa-accessibility-bundle-audit) — 4 plans — 2026-04-29T04:25:17.075Z
