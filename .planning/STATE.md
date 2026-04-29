---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: — Beauty Pass
status: unknown
last_updated: "2026-04-29T08:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 20
  completed_plans: 19
  percent: 95
---

# Project State — Flappy 3D

**Last updated:** 2026-04-29
**Updated by:** gsd-executor (06-02)

---

## Project Reference

**Core value:** The game must feel palpably more crafted than `guiguan/flappy-anna-3d` within 30 seconds of play — polished motion, real menus, real audio, 60fps on a mid-tier phone.
**Current focus:** Phase 06 — title-screen-liveliness (v1.1 Beauty Pass)

---

## Current Position

Phase: 06
Plan: 02 complete
| Field | Value |
|-------|-------|
| Phase | 6 — COMPLETE |
| Phase name | Title-Screen Liveliness |
| Plans complete | 06-01 (bird-bob + demo-pipes) ✓, 06-02 (logo-entrance + CTA-pulse) ✓ |
| Plans in progress | None |
| Status | 2/2 plans complete |
| Phase goal | Title screen alive within 2s: bird bobbing, pipes scrolling, logo animating, CTA pulsing |
| Blocked on | None |

**Progress bar:**

```
Phase 1 [██████████] 100% ✓ (user-verified 2026-04-28)
Phase 2 [██████████] 100% ✓ (user-verified 2026-04-29)
Phase 3 [██████████] 100% ✓ (03-01 audio ✓, 03-02 ui-infra ✓, 03-03 screens ✓, 03-04 juice ✓, 03-05 fix-ui-state ✓, 03-06 fix-audio-motion ✓)
Phase 4 [██████████] 100% ✓ (04-01 pwa-setup ✓, 04-02 a11y ✓, 04-03 bundle-audit ✓, 04-04 deploy ✓)
Phase 5 [████████  ] 80% (05-01 ✓, 05-02 ✓, 05-03 tasks 1-3 ✓ | tasks 4-5 awaiting human)
Phase 6 [██████████] 100% ✓ (06-01 bird-bob+demo-pipes ✓ | 06-02 logo+CTA ✓)
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

- Phase 6 Plan 02 (logo entrance + CTA pulse) executed: 2 tasks, 2 commits.
  - Task 1 (00867f8): TitleScreen.tsx — GSAP per-character stagger for FLAPPY 3D logo, hasAnimated useRef one-shot guard, reducedMotion matchMedia check, clearProps cleanup.
  - Task 2 (1cdcccc): styles.css — ctaPulse 1.6s on .title-cta.pulse, prefers-reduced-motion media query, JS-level pulse class gate in TitleScreen.tsx.
- tsc --noEmit: exit 0. Build: clean. Bundle: 196.78KB gzip.
- BEAUTY-03 and BEAUTY-04 requirements marked complete.
- Phase 6 COMPLETE: all 2 plans done.

**What's next:**

Phase 6 is complete. Run verification:

```bash
/gsd-verify-work 06
```

**Blockers:**

- None.

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| JS bundle gzipped | <250KB | 196.78KB (Phase 6 complete; logo stagger + CTA pulse added) |
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
| Phase 04 P02 | 258 | 2 tasks | 9 files |
| Phase 04 P04 | 6 | 2 tasks | 2 files |
| Phase 05 P01 | 2 | 3 tasks | 6 files |
| Phase 05 P02 | 1480 | 2 tasks | 5 files |
| Phase 06 P01 | 180 | 2 tasks | 4 files |
| Phase 06 P02 | 10 | 2 tasks | 2 files |

## Phase Log

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| 1 | ✓ Complete | 2026-04-28 | 4 plans, 4 commits, user-verified in browser |
| 2 | ✓ Complete | 2026-04-29 | 3 plans, 6 atomic commits; user-verified in browser |
| 3 | ✓ Complete | 2026-04-29 | 6 plans, 12 atomic commits; HUD-04, AUD-03, ANIM-06 closed; 194.49 KB gzip |
| 4 | ✓ Complete | 2026-04-29 | 4 plans, 8 atomic commits; PWA-05, DEPLOY-02, DEPLOY-03 closed; 188.01 KB gzip |
| 5 | In progress | - | 05-01 hardening-audit ✓; 05-02 real-audio ✓ (AUD-02 closed); 05-03 tasks 1-3 ✓ (docs+iOS note+SHIPPED.md); tasks 4-5 awaiting human real-device verify + v1.0.0 tag |
| 6 | ✓ Complete | 2026-04-29 | 06-01 bird-bob+demo-pipes ✓ (BEAUTY-01, BEAUTY-02 closed; 188KB gzip); 06-02 logo+CTA ✓ (BEAUTY-03, BEAUTY-04 closed; 196.78KB gzip) |

---

*This file is the project's memory. Update at every phase transition and plan completion.*

**Planned Phase:** 06 (title-screen-liveliness) — 2 plans — 2026-04-29T07:19:30.690Z
