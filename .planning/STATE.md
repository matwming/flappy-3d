---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-04-28T22:55:00.000Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 7
  completed_plans: 5
  percent: 28
---

# Project State — Flappy 3D

**Last updated:** 2026-04-28
**Updated by:** gsd-roadmapper

---

## Project Reference

**Core value:** The game must feel palpably more crafted than `guiguan/flappy-anna-3d` within 30 seconds of play — polished motion, real menus, real audio, 60fps on a mid-tier phone.
**Current focus:** Phase 2 — Game Machine + Obstacles + Rendering (in progress; Plan 02-01 done; Plans 02-02 + 02-03 remaining)

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | 2 |
| Phase name | Game Machine + Obstacles + Rendering |
| Plans complete | 02-01 (xstate machine + StorageManager + actor wiring) |
| Plans remaining | 02-02 (ObjectPool + obstacles + systems mods), 02-03 (toon + composer + parallax bg + main.ts rewire) |
| Status | Ready to execute remaining plans |
| Phase goal | Full playable loop; XState machine; pooled obstacles; toon materials; difficulty ramp |

**Progress bar:**

```
Phase 1 [██████████] 100% ✓ (user-verified 2026-04-28)
Phase 2 [███       ] 33% (1/3 plans done — 02-01)
Phase 3 [          ] 0%
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

**What was done last:**

- Phase 2 discussed → 02-CONTEXT.md (32 decisions D-01 through D-32) committed
- Phase 2 planned → 3 PLAN.md files (02-01, 02-02, 02-03) committed
- Plan 02-01 EXECUTED: xstate@5.20.1 installed; `src/machine/gameMachine.ts` (flat 5-state, zero three imports); `src/storage/StorageManager.ts` (versioned localStorage); `src/main.ts` rewired to read bestScore → create actor → route flap based on state
- 3 atomic feat commits for 02-01: a5c7ad6, bbcd80a, 3c5d6dc
- tsc strict clean

**What's next (resume in fresh session — recommend `/clear`):**

- Plan 02-02: ObjectPool + ObstaclePair + Difficulty + ObstacleSpawner + ScrollSystem + ScoreSystem; modify PhysicsSystem (add actor + dying-rotation) + CollisionSystem (replace console.warn/loop.stop with actor.send HIT; switch from static obstacle to pool)
- Plan 02-03: toon materials + EffectComposer (mobile-gated) + parallax bg (sky/mountains/trees) + GameLoop modification + full main.ts rewire to register all new systems and pre-warm pool

**Resume commands:**

- `/gsd-execute-phase 02 --auto --no-transition` (executes both remaining plans)
- OR `cat .planning/phases/02-machine-obstacles-rendering/02-02-PLAN.md` then implement inline manually

**Blockers:**

- None functional. Recommendation is fresh `/clear` — current Phase 2 plans are large (28K + 35K tokens each); fresh context yields cleaner xstate + shader code.

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| JS bundle gzipped | <250KB | 128.59KB (named imports, no tree-shake yet — Phase 4 PERF-01 will tighten) |
| FPS on Pixel 6 class | 60fps | Unmeasured (Phase 4 PERF-03) |
| Lighthouse PWA | ≥90 | 0 (Phase 4 PWA-05) |
| tsc --noEmit | 0 errors | ✓ 0 errors (strict + noUncheckedIndexedAccess) |

---

## Phase Log

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| 1 | ✓ Complete | 2026-04-28 | 4 plans, 4 commits, user-verified in browser |
| 2 | In progress (1/3 plans) | - | Plan 02-01 done; 02-02 and 02-03 remaining; recommend `/clear` before resuming |
| 3 | Not started | - | Blocked on Phase 2 |
| 4 | Not started | - | Blocked on Phase 3 |
| 5 | Not started | - | Blocked on Phase 4 |

---

*This file is the project's memory. Update at every phase transition and plan completion.*

**Planned Phase:** 01 (scaffold-core-loop) — 4 plans — 2026-04-28T12:07:39.581Z
