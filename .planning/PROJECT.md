# Flappy 3D

## What This Is

A 3D Flappy Bird-style mobile-first web game, built with Three.js, that's measurably more polished than the friend's reference baseline ([guiguan/flappy-anna-3d](https://github.com/guiguan/flappy-anna-3d)) along four axes: visuals & animation, UI/HUD/menus, game feel, and performance. Single-player, endless mode for v1, installable as a PWA.

## Core Value

The game must feel **palpably more crafted** than the baseline within 30 seconds of play — that means polished motion, real menus, real audio, and 60fps on a mid-tier phone. Everything else is negotiable; "feels better than flappy-anna-3d" is not.

## Requirements

### Validated

(v1 awaiting human-verify on 7 runtime/device items + v1.0.0 tag — see `.planning/phases/05-hardening-ship/05-HUMAN-UAT.md`)

### v1.1 Milestone — Beauty Pass (CODE-COMPLETE 2026-04-29)

Visual polish shipped on top of v1. Three phases (6, 7, 8) all delivered:
- Phase 6 — Title-screen liveliness (bird bob, demo pipes, logo entrance, CTA pulse) ✓
- Phase 7 — In-game juice (`+1` score popups, flap trail toggle, milestone celebrations at 10/25/50, pipe color cycling) ✓
- Phase 8 — Glass UI refresh (Press Start 2P arcade font, backdrop-filter blur, gradient buttons, 2-layer focus ring) ✓

12 BEAUTY-* requirements all coded and verified. Final bundle: 196KB / 250KB budget. 19 visual UAT items pending in `*-HUMAN-UAT.md` files. v1.1.0 tag pending user sign-off.

### Active

- [ ] Endless flappy gameplay loop (input → gravity-flap → AABB collision → score → death)
- [ ] Polished 3D scene: lighting, materials, post-processing (bloom, vignette/tonemap)
- [ ] Animation polish via tween/spring lib + particles + screen shake
- [ ] Recorded SFX + ambient music (not synthesized oscillators)
- [ ] Real menu/HUD/game-over screens (DOM overlay layer over canvas)
- [ ] Settings (sound, motion-reduce, palette) persisted to localStorage
- [ ] Local leaderboard (top-N personal bests in localStorage)
- [ ] PWA installable with offline play
- [ ] Mobile-first responsive layout + large touch targets
- [ ] Accessibility: prefers-reduced-motion respected, colorblind-safe palette option
- [ ] 60fps on mid-tier mobile (iPhone 12 / Pixel 6 class), Lighthouse PWA ≥90
- [ ] Tree-shaken Three.js bundle, target <250KB gzipped JS
- [ ] State machine via xstate (Title / Playing / Paused / GameOver)
- [ ] Aesthetic: evolved Zelda-anime / cel-shaded direction with elevated craft

### Out of Scope

- **Native mobile builds (React Native / Capacitor / Tauri)** — PWA only; covers our target reach without app-store overhead.
- **Multiplayer / realtime** — out of scope for single-dev v1; doesn't fit core value.
- **Global leaderboard / accounts (Supabase or similar)** — local-only for v1; revisit if game gets traction.
- **Time-attack, daily-seed, hardcore modes** — endless only for v1; can add post-launch as a content drop.
- **AI-generated art mid-build** — defer to a possible v2; we're using procedural + minimal modeled assets.
- **Engine swap (Babylon, PlayCanvas, Unity, Godot WebGL)** — locked to Three.js; engine tax buys nothing for this scope.
- **react-three-fiber / R3F** — vanilla Three.js for smallest bundle and direct control.
- **AI codegen as part of the dev loop** — baseline was 100% AI-generated; we're doing a hand-crafted build for differentiation.

## Context

**Reference baseline:** `github.com/guiguan/flappy-anna-3d`. Vanilla TS + Three.js + Vite, Zelda-anime cel/toon shader, all procedural geometry, hand-rolled state machine, synthesized Web Audio, no menus, no PWA. We have read access to the source layout (see `.planning/research/SUMMARY.md` after research phase).

**Gaps the baseline leaves on the table** (these are the "better than" attack surface):
- No menus, settings, or game-over UI screens (no DOM overlay layer)
- No leaderboard or persistence
- No tween/spring library — animations likely linear lerps
- No post-processing
- No recorded audio
- No PWA / offline / install
- No accessibility considerations
- Mobile perf budget unverified

**Project root:** `/Users/ming/projects/flappy-3d`. Already scaffolded with Vite + TypeScript + Three.js (1 commit, building cleanly). Spinning cube placeholder in `src/main.ts` to be replaced in Phase 1.

## Constraints

- **Tech stack**: Vite + TypeScript + Three.js (vanilla), no React/R3F/Babylon — locked to maximize control and minimize bundle size.
- **Performance**: 60fps on mid-tier mobile (iPhone 12 / Pixel 6) — required for "feels better than baseline" verdict.
- **Bundle**: <250KB gzipped JS for the game shell — tree-shaking three.js is mandatory (current naive build = 510KB raw).
- **Platform**: PWA only — no native app store builds.
- **Backend**: None for v1 — entirely client-side, localStorage for persistence.
- **Solo dev / single context**: Built by one developer using Claude Code + GSD workflow.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stack: Vite + TS + Three.js (vanilla) | Smallest bundle, direct Three.js control, matches baseline so comparisons are fair | — Pending |
| Reject React/R3F | Avoids React+drei runtime tax; DOM overlay is enough for the menu layer | — Pending |
| Reject effect.ts | Single-player offline game has no async/DI/error surface that justifies its abstraction tax | — Pending |
| Adopt xstate for state machine | Replaces hand-rolled state machine in baseline; ~15KB, visualizable, prevents impossible transitions | — Pending |
| Aesthetic: evolve Zelda-anime / cel-shaded | Direct comparison with baseline shows craft uplift; user's preference | — Pending |
| Modes: Endless only (v1) | Focus on nailing the core loop; other modes are content drops | — Pending |
| Leaderboard: Local-only (localStorage) | Zero infra, ships fast, sufficient for solo-play retention | — Pending |
| Granularity: Coarse (3-5 phases) | Small game scope, fast iteration, fewer review checkpoints | — Pending |
| GSD workflow throughout | User's preferred development discipline | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-28 after initialization*
