---
gsd_state_version: 1.0
milestone: v1.0.0
milestone_name: milestone
status: unknown
last_updated: "2026-04-29T05:46:25.107Z"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 20
  completed_plans: 15
  percent: 75
---

# Project State — Flappy 3D

**Last updated:** 2026-04-29
**Updated by:** gsd-executor (05-01)

---

## Project Reference

**Core value:** The game must feel palpably more crafted than `guiguan/flappy-anna-3d` within 30 seconds of play — polished motion, real menus, real audio, 60fps on a mid-tier phone.
**Current focus:** Phase 05 — hardening-ship (Phase 4 complete)

---

## Current Position

Phase: 5
Plan: 1 → COMPLETE
| Field | Value |
|-------|-------|
| Phase | 5 — in progress |
| Phase name | Hardening + Ship |
| Plans complete | 05-01 (hardening-audit) |
| Plans planned not executed | 05-02 (ios-audio), 05-03 (final-qa) |
| Status | 1/3 plans complete |
| Phase goal | Memory stable, event listeners clean, iOS audio unlock, final QA |

**Progress bar:**

```
Phase 1 [██████████] 100% ✓ (user-verified 2026-04-28)
Phase 2 [██████████] 100% ✓ (user-verified 2026-04-29)
Phase 3 [██████████] 100% ✓ (03-01 audio ✓, 03-02 ui-infra ✓, 03-03 screens ✓, 03-04 juice ✓, 03-05 fix-ui-state ✓, 03-06 fix-audio-motion ✓)
Phase 4 [██████████] 100% ✓ (04-01 pwa-setup ✓, 04-02 a11y ✓, 04-03 bundle-audit ✓, 04-04 deploy ✓)
Phase 5 [███       ] 33% (05-01 hardening-audit ✓)
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

- Phase 4 Plan 04 (deploy) executed: 2 tasks, 2 commits.
  - Task 1 (53a8698): .github/workflows/deploy.yml — 3-job workflow (build → deploy → lighthouse). build job runs bundle-check.sh gate. deploy job has job-level outputs.page_url for cross-job chaining. lighthouse job audits live URL with npx lighthouse, fails if PWA score < 0.90.
  - Task 2 (30e45db): README.md Deployment section — one-time Pages setup, workflow steps, manual preview, CI artifacts, Cloudflare Pages migration path.
- Current bundle: 188.01 KB gzip (61.98 KB headroom under 250 KB budget)
- Requirements PWA-05, DEPLOY-02, DEPLOY-03 now SATISFIED
- Phase 4 COMPLETE — all 4 plans executed

**What's next:**

Phase 5 — Hardening + Ship (iOS on-device audio, memory stability, final QA).

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
| Phase 04 P02 | 258 | 2 tasks | 9 files |
| Phase 04 P04 | 6 | 2 tasks | 2 files |
| Phase 05 P01 | 2 | 3 tasks | 6 files |

## Phase Log

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| 1 | ✓ Complete | 2026-04-28 | 4 plans, 4 commits, user-verified in browser |
| 2 | ✓ Complete | 2026-04-29 | 3 plans, 6 atomic commits; user-verified in browser |
| 3 | ✓ Complete | 2026-04-29 | 6 plans, 12 atomic commits; HUD-04, AUD-03, ANIM-06 closed; 194.49 KB gzip |
| 4 | ✓ Complete | 2026-04-29 | 4 plans, 8 atomic commits; PWA-05, DEPLOY-02, DEPLOY-03 closed; 188.01 KB gzip |
| 5 | In progress | - | 05-01 hardening-audit ✓; AbortController resize, DEV memory probe, actor.send audit |

---

*This file is the project's memory. Update at every phase transition and plan completion.*

**Planned Phase:** 05 (hardening-ship) — 3 plans — 2026-04-29T05:41:06.487Z
