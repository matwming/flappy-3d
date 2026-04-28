# Project State — Flappy 3D

**Last updated:** 2026-04-28
**Updated by:** gsd-roadmapper

---

## Project Reference

**Core value:** The game must feel palpably more crafted than `guiguan/flappy-anna-3d` within 30 seconds of play — polished motion, real menus, real audio, 60fps on a mid-tier phone.
**Current focus:** Phase 1 — Scaffold + Core Loop

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | 1 |
| Phase name | Scaffold + Core Loop |
| Plan | None (ready to plan) |
| Status | Ready to plan |
| Phase goal | Bird falls, flaps, collides; renderer hardened; strict TS enforced |

**Progress bar:**
```
Phase 1 [          ] 0%
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
- Roadmap initialized. Scaffold is at commit cccfe9c (Vite + TS + Three.js spinning cube).

**What's next:**
- Run `/gsd-plan-phase 1` to decompose Phase 1 into executable tasks.
- First commit of Phase 1 must: replace `import * as THREE` with named imports, enable `"strict": true` in tsconfig, add `touch-action: none` to canvas.

**Blockers:**
- None

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| JS bundle gzipped | <250KB | ~128KB (Three.js only, naive import — fix in Phase 1) |
| FPS on Pixel 6 class | 60fps | Unmeasured |
| Lighthouse PWA | ≥90 | 0 (not yet a PWA) |
| tsc --noEmit | 0 errors | Unknown (strict mode not yet enabled) |

---

## Phase Log

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| 1 | Not started | - | Ready to plan |
| 2 | Not started | - | Blocked on Phase 1 |
| 3 | Not started | - | Blocked on Phase 2 (XState is load-bearing for all screens) |
| 4 | Not started | - | Blocked on Phase 3 (SW must cache final feature set) |
| 5 | Not started | - | Blocked on Phase 4 (needs deployed URL) |

---

*This file is the project's memory. Update at every phase transition and plan completion.*
