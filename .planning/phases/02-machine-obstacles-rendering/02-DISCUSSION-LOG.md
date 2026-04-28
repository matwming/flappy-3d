# Phase 2: Game Machine + Obstacles + Rendering — Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md.

**Date:** 2026-04-28
**Mode:** `/gsd-discuss-phase 2 --auto --chain` (auto: Claude picked recommended defaults; chain: continues into plan + execute)
**Areas auto-resolved:** XState topology, Obstacles & pooling, Camera & scrolling, Difficulty ramp, Scoring, Toon rendering, Post-processing, Mobile gate, Background environment, Persistence schema, Death flow, System wiring, Tuning numbers

---

## XState topology

| Option | Description | Selected |
|--------|-------------|----------|
| Hierarchical states (parallel pause) | Pause as parallel region containing playing | |
| Flat 5-state (recommended) | title → playing ↔ paused → dying → gameOver, no nesting | ✓ |
| Heavy actor model with child machines | One machine per system | |

**Selected:** Flat. **Rationale:** Phase 2 has only 5 states with linear transitions; nesting is ceremony without benefit. Matches research/ARCHITECTURE.md.

---

## Obstacle pair geometry

| Option | Description | Selected |
|--------|-------------|----------|
| Single elongated mesh with subtraction | One Mesh per pair via CSG | |
| Two separate Mesh in a Group (recommended) | Top pipe + bottom pipe as siblings under one Group | ✓ |
| InstancedMesh of 16 pipes | Pre-create 16 instances, position 8 active | |

**Selected:** Two Mesh in a Group. **Rationale:** Matches baseline simplicity; Group makes scroll/release one operation; InstancedMesh would require positions buffer churn.

---

## Object pool size

| Option | Description | Selected |
|--------|-------------|----------|
| 4 pairs | Tight; maybe under-provisioned at high difficulty | |
| 8 pairs (recommended) | ~1.4s scroll × ~1.0s spawn = 4 active max + buffer | ✓ |
| 16 pairs | Over-provisioned but cheap memory | |

**Selected:** 8. **Rationale:** Sized for highest difficulty (1.0s spawn at 6.0/sec scroll = ~3 simultaneous active). 8 doubles that for safety.

---

## Spawn cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Distance-based (e.g., every 4 units of scroll) | Self-regulating with scroll speed | |
| Time-based (recommended) | Fixed seconds between spawns; difficulty ramps interval | ✓ |
| Pattern-based (e.g., from a level array) | Predefined obstacle layouts | |

**Selected:** Time-based. **Rationale:** Difficulty ramp easier to reason about; matches arcade flappy convention.

---

## Camera follow strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Bird scrolls right; camera follows | Camera moves with bird through world | |
| Fixed camera; world scrolls past (recommended) | Bird stays at x=0; obstacles scroll x-decrement | ✓ |
| Smooth-follow with lerp | Camera lags bird with damping | |

**Selected:** Fixed camera. **Rationale:** Industry standard for endless side-scrollers; simplest culling logic; matches baseline.

---

## Difficulty ramp curve

| Option | Description | Selected |
|--------|-------------|----------|
| Step function (every 10 score = harder) | Discontinuous jumps at thresholds | |
| Linear from 0 to 40 then plateau (recommended) | Single lerp; predictable pacing | ✓ |
| Exponential (early easy, late savage) | Steeper toward score 30+ | |

**Selected:** Linear with plateau at 40. **Rationale:** ROADMAP success criterion 2 specifies "ramps until ~40"; linear is easiest to playtest and tune.

---

## Toon material implementation

| Option | Description | Selected |
|--------|-------------|----------|
| MeshToonMaterial + gradient ramp DataTexture (recommended) | 5-band gradient, single shared texture | ✓ |
| Custom ShaderMaterial with stepped lighting | More control, more code | |
| MeshBasicMaterial (no shading) | Flat colors only | |

**Selected:** MeshToonMaterial + 5-band ramp. **Rationale:** Built into Three; minimal code; cel look without custom shader.

---

## Post-processing chain

| Option | Description | Selected |
|--------|-------------|----------|
| RenderPass → Bloom → Vignette → Tonemap → Output (recommended) | Standard chain; handles ACES tone-mapping correctly | ✓ |
| Render only, no post (defer to Phase 4) | Skip composer entirely in Phase 2 | |
| pmndrs/postprocessing library | Merged passes, slightly faster but +30KB | |

**Selected:** Three's built-in chain. **Rationale:** Research/STACK §4 explicitly recommends built-ins (10.7KB vs 30–112KB for pmndrs at our scene complexity).

---

## Mobile-perf gate

| Option | Description | Selected |
|--------|-------------|----------|
| `hardwareConcurrency <= 4` only | Misses high-end-mobile Apple A-series with 6 cores | |
| `hardwareConcurrency <= 4 || /Mobile|Android/i UA` (recommended) | Conservative — disable on all mobile | ✓ |
| Detect via WebGL renderer string | Brittle; varies by browser | |

**Selected:** Combined check. **Rationale:** Conservative default per pitfalls research; can lift in Phase 4 with real measurement.

---

## Background environment (VIS-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Sky-blue solid (Phase 1 default) | Simplest; no parallax | |
| 3-layer parallax (sky gradient + mountains + trees) (recommended) | Reads as "world" without adding much code | ✓ |
| Skybox with cubemap | Photo-realistic; needs textures (out of scope) | |

**Selected:** 3-layer procedural parallax. **Rationale:** REQ VIS-07 explicitly calls for "parallax decoration layers"; procedural matches baseline aesthetic and saves bundle weight.

---

## StorageManager schema

| Option | Description | Selected |
|--------|-------------|----------|
| Single key per field (`flappy-3d:bestScore`, `flappy-3d:settings`) | Simpler reads; harder versioning | |
| Single JSON blob with schemaVersion (recommended) | Atomic reads/writes; explicit migration path | ✓ |
| IndexedDB | Overkill for <1KB of data | |

**Selected:** Single JSON blob with `schemaVersion`. **Rationale:** Phase 4 may add settings/leaderboard fields; single-blob makes migrations simple.

---

## Death flow during dying state

| Option | Description | Selected |
|--------|-------------|----------|
| Bird freezes mid-air for 800ms | Cheap; less satisfying | |
| Bird gets upward kick + rotates 90° (recommended) | Death-pop feel; matches arcade convention | ✓ |
| Bird falls with full gravity | Realistic but jarring after collision | |

**Selected:** Upward kick + linear rotation. **Rationale:** Matches Flappy Bird conventions; linear rotation in Phase 2 is upgraded to GSAP elastic ease in Phase 3.

---

## Scoring dedup

| Option | Description | Selected |
|--------|-------------|----------|
| Distance check + last-scored-pair-ref | Tracks the "last counted" pair | |
| Per-pair `passed` flag reset on acquire (recommended) | Self-resetting via pool lifecycle | ✓ |
| Score on collision-with-trigger-zone Mesh | Adds a third invisible Mesh per pair | |

**Selected:** Per-pair flag. **Rationale:** Pool already manages lifecycle; flag resets in `acquire()`; one source of truth.

---

## Claude's Discretion

These were left to Claude:
- Internal naming of helper functions
- Whether to share a single `Box3` across collision checks
- Specific hex values for placeholder pipe/mountain colors
- Class vs function for systems internally
- Specific bloom/vignette parameter values within stated ranges

---

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Major items: GSAP-driven dying spin, particle bursts, screen shake, real game-over screen DOM, audio, settings persistence, leaderboard, prefers-reduced-motion JS check, tab-blur pause.
