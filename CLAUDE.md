# Flappy 3D — Project Guide

## What This Is

A polished 3D Flappy Bird-style PWA built with Three.js (vanilla, no React/R3F). The project's measured success target is **"feels palpably more crafted than [`guiguan/flappy-anna-3d`](https://github.com/guiguan/flappy-anna-3d) within 30 seconds of play."** Single-player, endless mode for v1, mobile-first, installable as a PWA.

## Source of truth

| Question | Read this file |
|---|---|
| What are we building? | `.planning/PROJECT.md` |
| What requirements must v1 deliver? | `.planning/REQUIREMENTS.md` |
| What phases and in what order? | `.planning/ROADMAP.md` |
| What's the current state? | `.planning/STATE.md` |
| What stack/libs and why? | `.planning/research/STACK.md` |
| What features are table-stakes vs polish? | `.planning/research/FEATURES.md` |
| How is the code organized? | `.planning/research/ARCHITECTURE.md` |
| What pitfalls to avoid? | `.planning/research/PITFALLS.md` |
| Tight overview of all of the above? | `.planning/research/SUMMARY.md` |

**Always re-read `.planning/STATE.md` at the start of any session** — it points to the active phase.

## Locked Decisions (do NOT relitigate without explicit user instruction)

- **Stack:** Vite + TypeScript + Three.js (vanilla). No React, no R3F, no Babylon, no engine swap.
- **Auxiliary libs:** GSAP (tweens), xstate v5 (state machine), Howler.js (audio), Preact (DOM overlay UI), three.quarks (particles), Three.js built-in postprocessing (EffectComposer + UnrealBloomPass + VignetteShader), vite-plugin-pwa.
- **No physics library** — hand-rolled AABB via `THREE.Box3` (~20 lines).
- **No GLTF assets** — all geometry procedural.
- **Aesthetic:** evolved Zelda-anime / cel-shaded direction.
- **Modes:** endless only (v1). Time-attack/daily-seed/hardcore are deferred.
- **Leaderboard:** local-only via `localStorage`. No backend, no accounts.
- **Persistence:** `localStorage` only.
- **Bundle budget:** ≤250KB gzipped JS (named imports only — `import * as THREE` is forbidden).
- **Perf target:** sustained 60fps on iPhone 12 / Pixel 6 class device.

## GSD Workflow

This project uses [Get-Shit-Done (GSD)](https://github.com/) for planning. The workflow per phase is:

```
/gsd-discuss-phase N    # gather phase-specific context → CONTEXT.md
/gsd-plan-phase N       # research + plan → RESEARCH.md + N-PLAN.md
/gsd-execute-phase N    # execute plan with atomic commits
/gsd-verify-work N      # UAT verification → VERIFICATION.md
```

Config: `.planning/config.json` — granularity=coarse, mode=yolo, parallel execution, all workflow agents enabled.

## Coding Rules

- **TypeScript strict mode is mandatory.** `tsconfig.json` must have `"strict": true` and `"noUncheckedIndexedAccess": true`. `tsc --noEmit` must exit 0.
- **Three.js:** always named imports (`import { WebGLRenderer, Scene, ... } from 'three'`). Never `import * as THREE` — it costs 128KB gzipped.
- **No `new THREE.Mesh()` in the game loop.** Use `ObjectPool<T>` for obstacles, particles, score popups. Pre-warm at load time.
- **Always `disposeMesh()`** when removing entities. `scene.remove()` does NOT free GPU buffers.
- **Event listeners use `AbortController`.** They accumulate across restarts otherwise.
- **xstate machine has zero Three.js imports.** Keep `src/machine/gameMachine.ts` pure.
- **DOM overlay never touches Three.js scene; systems never touch DOM.** Single bridge: `UIBridge.sync(snapshot)`.
- **`prefers-reduced-motion` checked in JS** (not just CSS) before triggering screen shake / particles / aggressive tweens.
- **iOS audio unlock:** `Howler.ctx.resume()` inside the FIRST `pointerup` handler, synchronously.
- **Cap renderer DPR** to `Math.min(devicePixelRatio, 2)`.
- **Disable shadows** (no `PCFSoftShadowMap`) — too expensive on mobile.

## API Research (per user CLAUDE.md global rule)

Never cite Three.js, GSAP, Howler, xstate, or vite-plugin-pwa APIs from memory — always verify via `ctx7` or `find-docs` skill before citing:

```bash
npx ctx7@latest library three "<question>"
npx ctx7@latest docs /mrdoob/three.js "<question>"
```

This is mandatory for API surface details. Training data may be stale.

## Reference Baseline

`https://github.com/guiguan/flappy-anna-3d` — the friend's implementation, the thing we're benchmarking against. Source structure summarized in `.planning/research/SUMMARY.md`. Clone to `/tmp/flappy-anna-3d-ref/` if you need to inspect source-level patterns.

**The baseline's gaps are our roadmap's spine.** Every phase exists to close one or more of those gaps with elevated craft.

## Current Status

Initialized 2026-04-28. Scaffold complete (Vite + TS + Three.js, rotating-cube placeholder). Roadmap covers 5 phases, 62 v1 requirements. Next: `/gsd-discuss-phase 1`.
