# Phase 13: Day/Night Cycle on Sky Shader - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Milestone:** v1.3 — Atmosphere (final phase, completes v1.3)

<domain>
## Phase Boundary

Animate the existing sky `ShaderMaterial` uniforms `uTopColor` and `uBottomColor` between 4-5 keyframe color pairs over a 60-second continuous cycle. Adds atmospheric progression without scene-geometry changes. Motion-gated.

In scope:
- 4-5 keyframe sky-color pairs (morning, afternoon, sunset, dusk, night-back-to-morning)
- Per-frame lerp between current and next keyframe based on elapsed time
- 60-second total cycle duration (configurable constant)
- Reset cycle clock on `roundStarted` (so each round starts from morning)
- Motion gate: when `prefersReducedMotion(storage)` is true, hold default morning-blue colors (no animation)

Out of scope:
- Score-driven cycling (continuous time-based is simpler, picked over per-milestone shifts)
- Cloud color reactive to sky (clouds stay white in v1.3; could be v1.4 polish)
- Mountain/tree silhouette tinting (out of scope)
- Audio cue on cycle transitions (out of scope)
- Per-mode cycle variation (same cycle in endless / time-attack / daily)

</domain>

<decisions>
## Implementation Decisions

### Cycle structure (ATMOS-03)
- **D-01:** 60-second total cycle. 4 keyframes evenly spaced at 0s / 15s / 30s / 45s. Lerp between current and next over 15-second segments. Loops back to keyframe 0 at 60s.
- **D-02:** Keyframe palette (top/bottom color pairs):
  - **0s — Morning:** top `#7ec8e3` (sky blue), bottom `#bce6f0` (light blue) — current default
  - **15s — Midday:** top `#5dabd0`, bottom `#a8d5e8` — slightly more saturated, deeper blue
  - **30s — Sunset:** top `#ff9966` (warm orange), bottom `#ffd6b3` (peach) — warm tones
  - **45s — Dusk:** top `#3a4a8c` (deep blue), bottom `#7a5a9c` (purple) — twilight
  - Loops back to morning
- **D-03:** Color palette WCAG-friendly: avoid sunsets that wash out into bird (`#ffd166` colorblind / `#ff7043` default). Sunset top `#ff9966` is warm but distinct from bird; bottom `#ffd6b3` is light enough that bird color contrasts. Verify visually.

### Animation engine (ATMOS-03)
- **D-04:** Implementation: a small `SkyCycle` system class (or extend `Background.ts`). Per-frame `step(dt)`:
  - Increment elapsed time
  - Compute current keyframe index from `elapsed % 60 / 15`
  - Lerp top/bottom colors between current and next keyframe (using THREE.Color.lerpColors)
  - Update sky shader uniforms
- **D-05:** Reset on `roundStarted`: `elapsed = 0`, snap colors to keyframe 0 (morning). Same hook as bird/clouds/timer.
- **D-06:** Recommendation: extend `Background.ts` with a `cycleSky(dt: number, prefersReducedMotion: boolean)` method. Background owns the sky mesh, so cycle logic naturally lives there. main.ts calls `background.cycleSky(dt, prefersReducedMotion(storage))` per frame in the loop.

### Reduced-motion gate (ATMOS-04)
- **D-07:** When `prefersReducedMotion(storage)` is true, `cycleSky` early-returns without updating uniforms. Sky stays at whatever color was last set. Snap to morning on roundStarted (also early-returns the cycle, but the snap-to-keyframe-0 still happens for consistency).
- **D-08:** Polish detail: when reduced-motion is toggled OFF mid-session via Settings, cycle resumes from current elapsed time. When toggled ON mid-cycle, sky freezes mid-cycle (acceptable; user can refresh page to reset).

### Cross-cutting
- **D-09:** Bundle target ≤250KB; current 198.66KB. Estimated +1-2KB (cycle code + 4 color constants). Comfortable.
- **D-10:** No new dependencies. THREE.Color.lerpColors is built-in.
- **D-11:** Endless / Time-Attack / Daily / Title all show the cycle. Modes don't change cycle.
- **D-12:** Phase 12 clouds (white) remain white — they don't tint with sky. Acceptable v1.3 limitation; cloud-tinting is a v1.4 polish idea.

### Claude's Discretion
- Exact keyframe colors (4 pairs above are starting point; tune for visual appeal)
- Cycle duration: 60s is the seed; adjustable to 90s or 120s if 60s feels too fast
- Whether to step or smooth-lerp between keyframes (smooth-lerp is the default; step feels artificial)
- Whether to expose cycle time as a Settings toggle ("slow / fast" — out of scope for v1.3 unless trivial)

</decisions>

<specifics>
## Specific Ideas

- **Reference for sky cycle feel:** No Man's Sky, Sky: Children of the Light — slow, ambient, mostly unnoticed but adds richness. NOT day-night-cycle-as-gameplay-mechanic. Just vibe.
- **The win:** title screen + every gameplay round has subtle atmospheric variation. Today: sky is one fixed gradient. Tomorrow: open the page at any time and the sky might be sunset.
- **Cycle reset on roundStarted matters:** prevents disorienting mid-round sky shifts. Each new round starts fresh at morning.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 13: Day/Night Cycle" — Goal + 4 SC
- `.planning/REQUIREMENTS.md` §ATMOS — ATMOS-03, ATMOS-04 acceptance criteria
- `.planning/seeds/SEED-002-day-night-cycle.md` — original seed (consumed)
- `CLAUDE.md` — locked decisions

### Existing code Phase 13 builds on
- `src/entities/Background.ts` — sky shader lives here (`createSky()` returns `Mesh<PlaneGeometry, ShaderMaterial>`); uniforms `uTopColor` and `uBottomColor` already wired
- `src/constants.ts` — current `SKY_TOP_COLOR` and `SKY_BOTTOM_COLOR` constants; extend with keyframe palette
- `src/main.ts` — loop step + roundStarted reset hook
- `src/a11y/motion.ts` — `prefersReducedMotion(storage)` helper

### External docs
- THREE.Color.lerpColors: standard Three.js API; verify via project use
- ShaderMaterial uniform updates: standard pattern; uniforms.uTopColor.value.setHex() or .copy(color)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- Background.ts has `createSky()` returning Mesh with ShaderMaterial — extend with cycle method
- main.ts roundStarted hook — add `background.resetSkyCycle()` alongside other resets
- prefersReducedMotion gate pattern from Phase 6/7/12

### Integration points
- Background.ts: add `cycleSky(dt, isReducedMotion)` method + private `cycleElapsed: number`
- main.ts loop: call `background.cycleSky(dt, prefersReducedMotion(storage))` per frame
- main.ts roundStarted: call `background.resetSkyCycle()`
- constants.ts: add `SKY_KEYFRAMES` array of 4 `{top, bottom}` color pairs

### Files unchanged in Phase 13
- gameMachine.ts, StorageManager.ts (no new state/persistence)
- src/ui/* (no DOM impact — sky is Three.js-only)
- vite.config.ts, package.json (no new deps)
- All Phase 6/7/8/9/10/11/12 features

</code_context>

<deferred>
## Deferred Ideas

- **Cloud color tinting at sunset** — Phase 12 clouds stay white; future polish could tint with sky color
- **Per-mode cycle variation** (faster cycle in time-attack?) — out of scope; same cycle for all modes
- **Score-driven cycle** (sky shifts at milestones) — pursued continuous-time approach; can revisit
- **Audio cue on cycle transitions** — out of scope
- **Settings toggle for cycle speed/disable** — out of scope; prefersReducedMotion gate is sufficient

</deferred>

---

*Phase: 13-day-night-cycle*
*Context gathered: 2026-05-02*
