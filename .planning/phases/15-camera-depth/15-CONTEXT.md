# Phase 15: Camera Depth (opt-in) - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Milestone:** v1.4 — Polish (final phase)

<domain>
## Phase Boundary

The camera is currently fixed at `(0, 0, 8)` and never moves during play. Phase 15 adds an **opt-in subtle camera y-offset** that follows the bird's velocity, creating a parallax-depth feel. This is the third (and last) component of SEED-003 (after rim light + wing flap in Phase 14).

Critical: this feature is RISKY for motion sickness. It must be **double-gated**:
1. New "Camera bob" Settings toggle, **default OFF** (opt-in)
2. AND `prefersReducedMotion(storage)` is false

If either gate is closed, the camera stays at its original `(0, 0, 8)` position — zero behavioral change for users who don't enable it.

After Phase 15, v1.4 ships and SEED-003 is fully consumed (5/5 seeds shipped overall).

In scope:
- StorageManager v3 settings schema extension: add `cameraBob: boolean` (default `false`)
- SettingsModal: new "Camera bob" toggle row, with `settings-note` explaining it's opt-in for motion sensitivity
- main.ts loop: a new step function that, when both gates open, eases `camera.position.y` toward `bird.velocity.y * factor`
- Reset camera position to `(0, 0, 8)` on `roundStarted` (no lingering offset between rounds)

Out of scope:
- Camera x/z motion (only y-bob)
- Camera-shake on death (already exists from Phase 7 via `screenShake`; orthogonal to this)
- Per-mode camera variation
- FOV change / zoom effects

</domain>

<decisions>
## Implementation Decisions

### Settings persistence (POLISH-03)
- **D-01:** Extend `SettingsV3` interface in `src/storage/StorageManager.ts` with `cameraBob: boolean`. Add `cameraBob: false` to `DEFAULT_SETTINGS_V3`. No schema-version bump needed — the existing v3 spread (`{ ...DEFAULT_SETTINGS_V3, ...parsed.settings }` in `getSettings()`) already handles forward-compat additions for users on prior v3 saves.
- **D-02:** Toggle position in SettingsModal: place the new row **after "Flap trail"** (most niche / motion-sensitive opt-ins grouped together at the bottom). Add a `settings-note` paragraph below: "Subtle camera tilt that follows the bird. Off by default — may cause motion discomfort. Disabled when Reduce Motion is on."

### Camera bob loop (POLISH-03)
- **D-03:** New per-frame step function in `main.ts` (similar shape to the existing bird-bob and cloud step blocks). Pseudocode:
  ```ts
  const CAMERA_BOB_FACTOR = 0.05      // y-offset = bird.velocity.y * 0.05 (rough range ±0.4 units at extremes)
  const CAMERA_BOB_LERP = 0.08        // smoothing factor (lower = smoother / laggier)
  const CAMERA_BASE_Y = 0             // camera's resting y (matches createRenderer)
  loop.add({
    step: (_dt: number) => {
      const s = actor.getSnapshot().value
      if (s !== 'playing' && s !== 'dying') return
      if (!storage.getSettings().cameraBob) return
      if (prefersReducedMotion(storage)) return
      const target = CAMERA_BASE_Y + bird.velocity.y * CAMERA_BOB_FACTOR
      camera.position.y += (target - camera.position.y) * CAMERA_BOB_LERP
    },
  })
  ```
- **D-04:** Use **frame-rate-independent lerp**? — for v1, plain `lerp` per fixed-timestep tick is fine because the GameLoop fires `step()` at 60Hz fixed cadence. No need for `1 - Math.exp(-dt/tau)` complexity.
- **D-05:** Factor + lerp tuning: `0.05` and `0.08` are starting points. Bird velocity ranges roughly `-6..+8 m/s` on flap, so peak offset is ~`±0.4 units` — gentle, not nauseating. Tune visually.
- **D-06:** Reset on `roundStarted`: add `camera.position.y = 0` to the existing `actor.on('roundStarted', ...)` handler in main.ts. Keeps camera coherent across restarts.
- **D-07:** Toggle behavior: when user flips the toggle OFF mid-game, the next frame the gate fails and the lerp stops updating. Camera stays where it was — undesirable. Mitigation: add a one-time return-to-base lerp when the toggle is OFF. Simpler alternative: when gate closes, snap immediately to `CAMERA_BASE_Y`. Choose **immediate snap** for v1 (game is paused via Settings modal anyway, so the snap happens behind the modal — invisible).

  Refined pseudocode:
  ```ts
  if (!storage.getSettings().cameraBob || prefersReducedMotion(storage)) {
    if (camera.position.y !== CAMERA_BASE_Y) camera.position.y = CAMERA_BASE_Y
    return
  }
  ```

### Cross-cutting
- **D-08:** Bundle target ≤250KB; current 199.25KB. Estimated +0.3KB (1 toggle + ~15 lines of loop code + 1 setting key). Comfortable.
- **D-09:** No new dependencies.
- **D-10:** No mobile-perf regression. The lerp is 1 multiply + 1 add + 1 assign per frame, gated by 2 boolean checks. Negligible.
- **D-11:** Phase 15 leaves all Phase 14 features intact (rim light, wings) — they live on the bird mesh, independent of camera.

### Claude's Discretion
- Exact `CAMERA_BOB_FACTOR` (0.03..0.08 reasonable range) — tune for visual
- Exact `CAMERA_BOB_LERP` smoothing (0.05..0.15)
- Whether to also reset camera on initial `actor.start()` — not strictly needed because `createRenderer` sets `(0,0,8)`, but defensive

</decisions>

<specifics>
## Specific Ideas

- **Reference feel:** Celeste's camera follows player y subtly during platforming. Hollow Knight has a similar look-ahead/look-behind smoothing. We're doing something quieter — just velocity-driven y-offset.
- **Why opt-in not opt-out:** prior research on FPS / 3D web games shows that ~5-10% of players experience nausea from any camera motion. Default OFF is the safest choice; users who like the depth feel can turn it on. SEED-003 explicitly called this out.
- **Why double-gated:** the Settings toggle is a player-explicit preference, but `prefersReducedMotion` is the OS-level signal that overrides everything (`flapTrail` and other animations follow the same pattern). Both must be open for camera bob to fire.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 15: Camera Depth (opt-in)" — Goal + 4 SC
- `.planning/REQUIREMENTS.md` §POLISH-03 — full acceptance criteria
- `.planning/seeds/SEED-003-3d-scene-polish.md` — original seed (consumed; C in this phase)
- `CLAUDE.md` — locked decisions (motion-gating mandate)

### Existing code Phase 15 builds on
- `src/storage/StorageManager.ts` — extend `SettingsV3` + `DEFAULT_SETTINGS_V3`
- `src/ui/screens/SettingsModal.tsx` — add Camera bob Toggle row + settings-note
- `src/main.ts` — add per-frame loop step + `roundStarted` camera.position.y reset
- `src/a11y/motion.ts` — `prefersReducedMotion(storage)` helper (already in)
- `src/render/createRenderer.ts` — camera defined at `(0, 0, 8)`; CAMERA_BASE_Y in main.ts mirrors that
- `src/entities/Bird.ts` — `bird.velocity.y` is the input signal

### External docs
- Three.js `PerspectiveCamera.position` — straightforward Vector3 mutation; no API surprises
- No GSAP needed (manual lerp per tick is simpler than a continuous tween)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- SettingsModal Toggle rows + settings-note paragraph (Phase 4 pattern, extended in Phase 7 for flapTrail)
- main.ts `loop.add({ step: ... })` pattern for per-frame work outside core systems
- `actor.on('roundStarted', ...)` for round-reset side effects (Phase 9 pattern)
- Double-gating pattern: `storage.getSettings().X && !prefersReducedMotion(storage)` (already used for flapTrail in Phase 7)

### Integration points
- `StorageManager.ts` — 1 line in interface, 1 line in defaults
- `SettingsModal.tsx` — 1 Toggle + 1 settings-note paragraph (~10 lines)
- `main.ts` — 1 step block (~10 lines) + 1 reset line in roundStarted handler
- No changes to gameMachine, no changes to renderer factory

### Files unchanged in Phase 15
- gameMachine.ts (camera bob is purely visual; no state-machine awareness needed)
- All systems/* (camera is visual-only; physics/collision/scoring all use bird.position which doesn't move)
- All entities/* (bird, clouds, background, obstacles)
- toonMaterial.ts, anim.ts (untouched)
- vite.config.ts, package.json (no new deps)

</code_context>

<deferred>
## Deferred Ideas

- **Camera x-offset look-ahead** (anticipate scroll direction) — out of scope; SEED-003 was y-only
- **Camera shake on milestone score** — already covered by Phase 7 particles + screen flash; not needed
- **FOV pulse on flap** — out of scope; could add jank
- **Multiple camera-bob intensity levels** (subtle / medium / strong) — out of scope; one curated default is enough for v1.4
- **Per-device tuning** (less bob on mobile) — premature; tune the defaults and ship

</deferred>

---

*Phase: 15-camera-depth*
*Context gathered: 2026-05-02*
