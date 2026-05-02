# Phase 14: Bird Polish - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Milestone:** v1.4 — Polish (first phase)

<domain>
## Phase Boundary

The bird is currently a single sphere with cel-shaded toon material. Phase 14 adds two visual upgrades:

1. **Rim lighting** — subtle edge glow that picks up the bird silhouette against any sky color
2. **Animated wings** — two small wing meshes as children of the bird; rotate in/out via GSAP on every flap

After Phase 14, the bird looks more characterful but the core gameplay shape (sphere body) is unchanged. Camera bob (the third SEED-003 component) is split into Phase 15 because it has separate motion-sickness implications.

In scope:
- Toon material extension with rim-light fragment shader contribution + uniform for strength
- Two small wing geometries (Plane or thin Box) added as children of `bird.mesh`
- GSAP timeline rotating wings in/out on each flap, motion-gated
- Wings inherit bird's transform (squashStretch, position, rotation) automatically

Out of scope:
- Camera bob (Phase 15)
- Bird color customization beyond colorblind palette swap (already in)
- New bird body shape (still a sphere — wings are additive)
- Per-mode bird variation

</domain>

<decisions>
## Implementation Decisions

### Rim lighting (POLISH-01)
- **D-01:** Extend `src/render/toonMaterial.ts` with rim-light support. The current `MeshToonMaterial` uses a built-in toon gradient ramp; rim light is a fragment-shader extension via `onBeforeCompile`.
- **D-02:** Implementation: hook into Three.js material's `onBeforeCompile(shader)` callback. Inject a uniform `uRimStrength` (default 0.4) and a fragment-shader snippet computing rim contribution:
  ```glsl
  // In onBeforeCompile, prepend uniforms:
  uniform float uRimStrength;
  
  // Inject after fragment color computed (replace #include <output_fragment>):
  float rim = 1.0 - max(dot(normalize(vViewPosition), vNormal), 0.0);
  rim = pow(rim, 2.0) * uRimStrength;
  gl_FragColor.rgb += vec3(rim);
  ```
- **D-03:** `uRimStrength` configurable via material's `userData.uniforms.uRimStrength.value`. Default 0.4 (subtle). Tune for visual appeal.
- **D-04:** WCAG-AA contrast preservation: rim adds ~+0.4 to RGB at the silhouette only. Bird's interior remains untouched. Contrast against sky is enhanced, not reduced. Validate visually in default + colorblind palettes.

### Animated wings (POLISH-02)
- **D-05:** Add 2 small wing meshes in `Bird` constructor (existing class at `src/entities/Bird.ts`). Use `BoxGeometry` (very thin, e.g., 0.6 × 0.05 × 0.3) or `PlaneGeometry`. Two-sided material (`side: DoubleSide`) so they render from both viewpoints.
- **D-06:** Position: left wing at `x = -0.4, y = 0`, right wing at `x = +0.4, y = 0`, both at `z = 0`. Children of `bird.mesh` (parented), so they inherit translation/scale/rotation including the bob and squashStretch from Phase 6/7.
- **D-07:** Wing material: same toon gradient as bird (or slightly desaturated). Reuses the rim-light extension automatically since it's the same material.
- **D-08:** Wing animation: GSAP timeline that rotates each wing on its z-axis: from 0 (flat) → 0.6rad (wings up) over 40ms, then back to 0 over 60ms. Total ~100ms cycle, similar to existing squashStretch (80ms).
- **D-09:** Motion-gating: wing flap animation skipped when `prefersReducedMotion(storage)` is true. Wings remain at rest position (rotation 0). Bird still flaps physics-wise; just no animation polish.
- **D-10:** Trigger: same hook as squashStretch — call `wingFlap(bird)` (new helper in `src/anim/anim.ts`) inside main.ts `input.onFlap` callback for the playing state.

### Cross-cutting
- **D-11:** Bundle target ≤250KB; current 198.90KB. Estimated +2-3KB (rim shader code + 2 wing meshes + GSAP timeline). Comfortable.
- **D-12:** No new dependencies. GSAP is already in (Phase 3, Phase 6).
- **D-13:** No mobile-perf regression. Two extra mesh draws are negligible. Rim shader is simple math (1 dot product + pow + 1 vec3 add); no perf concern on iPhone 12.
- **D-14:** Keeps Phase 6 (bird bob), Phase 7 (squashStretch on flap), Phase 12 (clouds), Phase 13 (sky cycle) all intact and compatible.

### Claude's Discretion
- Exact wing geometry (Plane vs Box, dimensions)
- Wing rotation amount (0.6rad is a starting point; tune for visual)
- Whether wings have separate material color or share bird's
- Whether rim-light strength is animated (e.g., pulse) or static — recommend static for simplicity

</decisions>

<specifics>
## Specific Ideas

- **Rim-light reference:** Splatoon 3, Mario Galaxy — subtle yellow-white edge against dark backgrounds. Adds character. Avoid overdoing it.
- **Wing reference:** simple Flappy Bird sprite + 2-frame wing animation. We're 3D so use small flat meshes, not full sprite animation.
- **Squash + wings interaction:** existing squashStretch squashes the BIRD MESH on flap (40-80ms). Wings (children) inherit the squash. So wings flap UP while body squashes — natural composite motion. No conflict.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 14: Bird Polish" — Goal + 4 SC
- `.planning/REQUIREMENTS.md` §POLISH — POLISH-01, POLISH-02 acceptance criteria
- `.planning/seeds/SEED-003-3d-scene-polish.md` — original seed (consumed; A + B in this phase, C in Phase 15)
- `CLAUDE.md` — locked decisions

### Existing code Phase 14 builds on
- `src/render/toonMaterial.ts` — extend with rim-light shader injection
- `src/entities/Bird.ts` — add wing meshes as children of mesh
- `src/anim/anim.ts` — add `wingFlap(bird)` helper (mirrors `squashStretch` shape)
- `src/main.ts` — wire `wingFlap` call inside input.onFlap, gated by `prefersReducedMotion`
- `src/a11y/motion.ts` — `prefersReducedMotion(storage)` helper

### External docs
- Three.js `onBeforeCompile`: standard hook for shader extension; verify via Three.js docs
- GSAP timeline + rotation: existing project pattern in `anim.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- toonMaterial.ts (Phase 3, extended in Phase 4 colorblind) — pattern for material factory
- anim.ts squashStretch — same shape as wingFlap helper
- Bird.ts mesh ownership — wings as children (auto-inherit transform)

### Integration points
- `Bird.ts` constructor — add wing geometries + meshes; add public refs `leftWing` / `rightWing`
- `anim.ts` — new `wingFlap(bird: Bird)` helper using GSAP
- `main.ts input.onFlap` — call `wingFlap(bird)` after `squashStretch(bird.mesh)`
- `toonMaterial.ts` — add `withRimLight(material, strength)` helper or extend `createToonMaterial` factory

### Files unchanged in Phase 14
- gameMachine.ts, StorageManager.ts (no state/persistence changes)
- src/ui/* (no DOM impact)
- src/systems/* (no game-loop logic changes)
- vite.config.ts, package.json (no new deps)
- All Phase 6/7/8/9/10/11/12/13 features

</code_context>

<deferred>
## Deferred Ideas

- **Camera bob** — Phase 15 (separate phase due to motion-sickness implications)
- **Bird customization** (skin chooser, unlock progression) — out of scope; v1+ feature
- **Trail effects on wings** (particle wake) — out of scope; flap trail (Phase 7) covers similar feel
- **Mode-specific bird variations** — out of scope

</deferred>

---

*Phase: 14-bird-polish*
*Context gathered: 2026-05-02*
