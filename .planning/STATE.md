---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-04-28T23:09:19.723Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 11
  completed_plans: 5
  percent: 45
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

Phase: 03 (ui-audio-polish) — EXECUTING
Plan: 3 of 4
| Field | Value |
|-------|-------|
| Phase | 3 |
| Phase name | UI + Audio + Polish |
| Plans complete | All Phase 1 + Phase 2 |
| Plans planned not executed | Phase 3 (4 plans: audio, ui-infra, screens, juice) |
| Status | Ready to execute in fresh /clear session |
| Phase goal | DOM overlay screens (Preact), Howler audio + iOS unlock, GSAP juice, particle burst, leaderboard |

**Progress bar:**

```
Phase 1 [██████████] 100% ✓ (user-verified 2026-04-28)
Phase 2 [██████████] 100% ✓ (user-verified 2026-04-29)
Phase 3 [██▒▒▒▒▒▒▒▒]  20% (CONTEXT.md + 4 PLAN.md files committed; awaiting execute)
Phase 4 [          ] 0%
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

- Phase 2 fully shipped: all 3 plans executed inline; 6 atomic feat commits; user-verified ✓
- Phase 3 discussed: `03-CONTEXT.md` committed with 36 decisions (D-01 through D-36). Audio source decision: **CC0 free libraries via WebFetch** (user-confirmed). Cadence: **plan-now-execute-fresh** (user-confirmed).
- Phase 3 planned: 4 PLAN.md files committed (audio, ui-infra, screens, juice). 21 REQs distributed across the 4 plans.

**What's next (resume in FRESH session — recommend `/clear` first):**

```
/clear
/gsd-execute-phase 03 --auto --no-transition
```

This will execute Phase 3 plans in 4 sequential waves. Audio plan (03-01) will WebFetch CC0 samples from Pixabay (or fall back to placeholder synth markers). Each plan ends with atomic commit.

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
| JS bundle gzipped | <250KB | 128.59KB (named imports, no tree-shake yet — Phase 4 PERF-01 will tighten) |
| FPS on Pixel 6 class | 60fps | Unmeasured (Phase 4 PERF-03) |
| Lighthouse PWA | ≥90 | 0 (Phase 4 PWA-05) |
| tsc --noEmit | 0 errors | ✓ 0 errors (strict + noUncheckedIndexedAccess) |

---
| Phase 03 P01 | 218 | 2 tasks | 9 files |
| Phase 03 P02 | 420 | 3 tasks | 9 files |

## Phase Log

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| 1 | ✓ Complete | 2026-04-28 | 4 plans, 4 commits, user-verified in browser |
| 2 | ✓ Complete | 2026-04-29 | 3 plans, 6 atomic commits; user-verified in browser |
| 3 | Planned | - | CONTEXT (36 decisions) + 4 PLAN.md committed; ready to execute |
| 4 | Not started | - | Blocked on Phase 3 |
| 5 | Not started | - | Blocked on Phase 4 |

---

*This file is the project's memory. Update at every phase transition and plan completion.*

**Planned Phase:** 01 (scaffold-core-loop) — 4 plans — 2026-04-28T12:07:39.581Z
