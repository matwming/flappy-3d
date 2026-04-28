---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-04-28T22:15:00.000Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
  percent: 20
---

# Project State — Flappy 3D

**Last updated:** 2026-04-28
**Updated by:** gsd-roadmapper

---

## Project Reference

**Core value:** The game must feel palpably more crafted than `guiguan/flappy-anna-3d` within 30 seconds of play — polished motion, real menus, real audio, 60fps on a mid-tier phone.
**Current focus:** Phase 2 — Game Machine + Obstacles + Rendering (ready to discuss)

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | 2 |
| Phase name | Game Machine + Obstacles + Rendering |
| Plan | None (ready to discuss/plan) |
| Status | Ready to discuss |
| Phase goal | Full playable loop; XState machine; pooled obstacles; toon materials; difficulty ramp |

**Progress bar:**

```
Phase 1 [██████████] 100% ✓ (user-verified 2026-04-28)
Phase 2 [          ] 0%
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

- Phase 1 COMPLETE (user-verified). 4 atomic feat commits: 01-01 renderer hardening, 01-02 TS strict + visualizer, 01-03 GameLoop + InputManager, 01-04 Bird + Physics + Collision.
- Bird falls, flaps via Space/click/tap, collides with test obstacle and floor/ceiling — all working in browser.
- Build green; tsc strict clean; no `import * as THREE` anywhere.

**What's next:**

- Run `/gsd-discuss-phase 2 --auto --chain` to start Phase 2 (XState game machine, obstacle pool, toon materials, difficulty ramp).
- Phase 2 will replace the death stub (`console.warn` + `loop.stop()`) with `actor.send({ type: 'HIT' })`.

**Blockers:**

- None

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
| 2 | Not started | - | Ready to discuss |
| 3 | Not started | - | Blocked on Phase 2 (XState is load-bearing for all screens) |
| 4 | Not started | - | Blocked on Phase 3 (SW must cache final feature set) |
| 5 | Not started | - | Blocked on Phase 4 (needs deployed URL) |

---

*This file is the project's memory. Update at every phase transition and plan completion.*

**Planned Phase:** 01 (scaffold-core-loop) — 4 plans — 2026-04-28T12:07:39.581Z
