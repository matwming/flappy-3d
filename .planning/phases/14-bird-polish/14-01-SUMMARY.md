---
phase: 14-bird-polish
plan: 01
subsystem: rendering, animation
tags: [three.js, gsap, toon-material, onBeforeCompile, rim-light, shader, wings, animation]

# Dependency graph
requires:
  - phase: 03-juice
    provides: squashStretch pattern in anim.ts; MeshToonMaterial via createToonMaterial
  - phase: 07-trail-colors
    provides: Bird.ts with ghost/flap trail; anim.ts squashStretch established
  - phase: 13-sky-cycle
    provides: Background.cycleSky pattern; Phase 13 shipped at 198.90KB bundle

provides:
  - addRimLight(material, rimStrength) in toonMaterial.ts — onBeforeCompile rim shader
  - Bird.leftWing + Bird.rightWing public Mesh refs (BoxGeometry children of bird.mesh)
  - wingFlap(bird) GSAP timeline in anim.ts
  - wingFlap call in main.ts gated by prefersReducedMotion

affects: [phase-15-camera-bob, any future bird customization work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onBeforeCompile shader extension: inject uniform + fragment snippet into existing MeshToonMaterial"
    - "Wing meshes as children of bird.mesh: inherit parent transform (squashStretch, bob) automatically"
    - "GSAP parallel tween via '<' position marker for synchronized left/right wing motion"

key-files:
  created: []
  modified:
    - src/render/toonMaterial.ts
    - src/entities/Bird.ts
    - src/anim/anim.ts
    - src/main.ts

key-decisions:
  - "Inject rim contribution into outgoingLight (before opaque_fragment) rather than modifying gl_FragColor directly — plays nicely with colorspace and tonemapping chunks"
  - "Shared BoxGeometry between left/right wings (same geo instance); separate MeshToonMaterial clones so each can be disposed independently"
  - "wingFlap uses '<' position marker so both wings animate in true parallel, not sequentially"
  - "Wing material is a plain MeshToonMaterial (not rim-lit) — rim-light applies via bird.mesh.material which is set separately in main.ts"

patterns-established:
  - "onBeforeCompile pattern: inject uniform declaration after #include <common>, inject GLSL before #include <opaque_fragment>"
  - "Wing animation: GSAP timeline with parallel tweens via '<' offset"

requirements-completed: [POLISH-01, POLISH-02]

# Metrics
duration: 12min
completed: 2026-05-02
---

# Phase 14 Plan 01: Bird Polish Summary

**Rim-light fragment shader on bird toon material via onBeforeCompile, plus BoxGeometry wing meshes that flap ±0.6rad via GSAP on each jump**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-02T02:34:00Z
- **Completed:** 2026-05-02T02:46:43Z
- **Tasks:** 2 implementation + 1 docs
- **Files modified:** 4

## Accomplishments

- Rim-light shader: `addRimLight(material, rimStrength=0.4)` hooks `onBeforeCompile` to inject a `uRimStrength` uniform and compute `rim = pow(1 - dot(normalize(vViewPosition), normal), 2) * strength` added to `outgoingLight` before `opaque_fragment`
- Wing meshes: two `BoxGeometry(0.6, 0.05, 0.3)` children of `bird.mesh` at `x=±0.4` — auto-inherit squashStretch, position, and title-screen bob transforms
- Wing flap animation: GSAP timeline rotates left wing +0.6rad / right wing -0.6rad over 40ms then returns to 0 over 60ms, mirrored and parallel via `'<'` position marker
- All motion (wings) gated by `prefersReducedMotion(storage)` alongside existing `squashStretch`
- Bundle: 199.25KB gzipped (+0.35KB from 198.90KB) — well within 250KB budget

## Task Commits

1. **Task 1: Rim-light shader extension** - `6788209` (feat)
2. **Task 2: Wing meshes + wingFlap animation** - `3f05c85` (feat)
3. **Task 3: SUMMARY + state update** - (docs — this commit)

## Files Created/Modified

- `src/render/toonMaterial.ts` — added `addRimLight()` export with `onBeforeCompile` shader injection
- `src/entities/Bird.ts` — added `leftWing` / `rightWing` public Mesh fields; wing construction + disposal
- `src/anim/anim.ts` — added `wingFlap(bird: Bird)` GSAP timeline helper
- `src/main.ts` — imported `addRimLight` + `wingFlap`; wired both into bird setup and `onFlap` handler

## Decisions Made

- **Inject into `outgoingLight`, not `gl_FragColor`**: The toon shader computes final color as `vec3 outgoingLight = ...` then passes it through `opaque_fragment`, `tonemapping_fragment`, and `colorspace_fragment`. Adding to `outgoingLight` ensures the rim contribution goes through the same tone-mapping and color-space conversion as the rest of the surface — correct behavior vs. directly setting `gl_FragColor.rgb`.
- **`#include <opaque_fragment>` as injection anchor**: This chunk exists in the toon fragment shader at the right point (after lighting accumulation, before colorspace). Replacing it with the rim calculation + the original `#include` is clean and robust.
- **Shared BoxGeometry, cloned MeshToonMaterial**: Both wings share the same `BoxGeometry` instance (read-only geometry, no transform baked in). Materials are cloned so disposal doesn't double-free a shared GPU object.
- **Wing material is plain MeshToonMaterial (not rim-lit)**: Wing size (0.6×0.05×0.3) is small; rim-light on wings would be barely visible and wasteful. Kept simple.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. `vViewPosition` confirmed available as a varying in MeshToonMaterial's fragment shader (declared in `lights_toon_pars_fragment.glsl.js`). `normal` confirmed resolved from `vNormal` in `#include <normal_fragment_begin>` before the injection point.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 15 (camera bob) can proceed. Bird, anim, and main.ts patterns are stable.
- Bird's wing refs (`bird.leftWing`, `bird.rightWing`) are available if Phase 15 wants to extend wing behavior.
- No blockers.

---
*Phase: 14-bird-polish*
*Completed: 2026-05-02*
