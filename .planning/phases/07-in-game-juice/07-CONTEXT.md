# Phase 7: In-Game Juice - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Milestone:** v1.1 — Beauty Pass

<domain>
## Phase Boundary

Make scoring feel visceral and milestone-rewarding. After Phase 7, each scored point gets a `+1` floating popup, optional flap trail trails the bird, milestone scores (10/25/50) trigger celebration bursts, and pipe colors cycle subtly so consecutive obstacles look distinct.

In scope:
- DOM `+1` score popup rising from bird's screen position (BEAUTY-05)
- Optional bird flap trail — 2-3 fading echo meshes (BEAUTY-06, default OFF in Settings)
- Score milestone burst at 10/25/50 — gold particle + 200ms screen flash (BEAUTY-07)
- Per-pair pipe color cycling across 3-4 toon colors (BEAUTY-08)

Out of scope:
- Title-screen polish (Phase 6 — done)
- Glass UI / typography (Phase 8)
- Day/night cycle (deferred)

</domain>

<decisions>
## Implementation Decisions

### Score popup (BEAUTY-05)
- **D-01:** Implementation: DOM `<div>` per scored point, positioned absolutely over `#ui-root`. Bird's world position projects to screen coordinates via Three.js `Vector3.project(camera)` → CSS pixels. Popup tweens via CSS keyframe (translateY -60px to -80px, opacity 1 → 0, 600-800ms duration), then removes itself.
- **D-02:** Re-use rather than DOM-create: pool 5-8 popup divs (mount on UIBridge mount, reuse on each SCORE event). Avoids GC pressure on rapid scoring.
- **D-03:** Trigger: subscribe to actor SCORE events OR detect via `score > lastScore` in main.ts (already done for SFX). Hook into the existing audio block — play SFX + spawn popup together.
- **D-04:** Motion gate: skip the popup entirely (don't spawn) when `prefersReducedMotion(storage)`.

### Flap trail (BEAUTY-06)
- **D-05:** Default: **OFF**. Adds a `flapTrail: boolean` field to StorageManager v2 settings. SettingsModal gets a new toggle row "Flap trail" (default false). Persists across sessions.
- **D-06:** Implementation when ON: maintain a small ring buffer of 3 cloned bird-mesh "ghosts" with reduced opacity (0.6, 0.4, 0.2) and slightly scaled-down (0.95, 0.9, 0.85). On flap, snapshot bird position into oldest slot, push slots back. Each ghost fades (opacity → 0) over 150-200ms via inline tween or `material.opacity` decrement per frame.
- **D-07:** Cost: 3 extra mesh draws per frame when active. Acceptable on iPhone 12 (still under bundle + frame budget). Document the perf cost in Settings tooltip.
- **D-08:** Motion gate: skip the trail (no spawning) when `prefersReducedMotion(storage)` regardless of Settings toggle. Reduced-motion always wins.
- **D-09:** Cleanup: ghosts use `MeshBasicMaterial` with `transparent: true`, `depthWrite: false`. On `roundStarted`, hide all ghosts and reset opacity. On Settings toggle OFF, remove from scene.

### Milestone celebration (BEAUTY-07)
- **D-10:** Trigger at score == 10, 25, 50 (exact equality, fires once per threshold per round). Subscribe via SCORE-detection in main.ts (same hook as score popup).
- **D-11:** Effect: gold particle burst (reuse `particles.burst` from `createParticles` factory — already wired for death) with a gold tint param + 200ms full-screen overlay flash via DOM div with `background: rgba(255,209,102,0.4)` fading out.
- **D-12:** Motion gate: skip both effects when `prefersReducedMotion(storage)`.
- **D-13:** Particle factory may need a `tint` parameter if it doesn't already have one — Claude's discretion.

### Pipe color cycling (BEAUTY-08)
- **D-14:** Define `PIPE_COLOR_CYCLE: Color[]` of 3-4 colors in constants.ts. Existing `PIPE_COLOR` becomes the first entry.
- **D-15:** ObstaclePair gains a `setColor(c)` method that updates its top + bottom mesh material color (both share the same material reference per current code — may need to clone material per pair, OR swap via `material.color.set(c)` if shared materials are acceptable for this effect).
- **D-16:** ObstacleSpawner cycles through colors per spawn: `const color = PIPE_COLOR_CYCLE[spawnIndex % PIPE_COLOR_CYCLE.length]`. Reset `spawnIndex` on `roundStarted`.
- **D-17:** Material strategy: if all pipes share one material, color-set will affect all visible pipes (bad). Need to either (a) clone material per pair on construction, or (b) accept that all on-screen pipes share the latest color (simpler but less subtle). Recommend (a) for the visual effect to land. Add ~3 extra material instances total — negligible bundle/perf impact.
- **D-18:** Colors must remain WCAG-A11Y-friendly (high contrast against sky, not jarring). Suggested set: `#3FB854` (current green), `#3F8FB8` (teal-blue), `#B8843F` (warm orange-brown), `#9B3FB8` (muted purple). Tune as needed.
- **D-19:** When colorblind palette is ON (existing Phase 4 toggle), this cycle is overridden by the colorblind set (deuteranopia-safe). The colorblind palette is a single-color scheme; cycling is suppressed.

### Cross-cutting
- **D-20:** All effects motion-gated via `prefersReducedMotion(storage)` (CLAUDE.md mandate).
- **D-21:** Bundle target ≤ 250KB gzip; current 188KB. Phase 7 budget overhead estimate <8KB (mostly DOM popups + small ParticleEmitter tweak).
- **D-22:** No new heavy deps. Reuse existing GSAP, Howler, ParticleEmitter, StorageManager.

### Claude's Discretion
- Score popup pool size (5-8) — pick based on max simultaneous score tempo
- Particle tint API design (new param vs preset)
- Material clone strategy for pipe color cycling (per-pair clone vs shared mutation)
- Exact 4 pipe colors (suggest above is a reasonable default)
- Whether the milestone screen-flash uses an existing class or a new one

</decisions>

<specifics>
## Specific Ideas

- **Reference for the "+1" feel:** subtle, not in-your-face. Should feel like the +1 in 2048 or the score increment in Slither.io — quick, satisfying, doesn't block readability of the main HUD.
- **Reference for milestone celebration:** the score-pop in mobile arcade games when you hit a streak. Restrained, not Vegas slot-machine.
- **Reference for pipe color cycling:** Tetris pieces — same shape, distinct colors. Helps the eye track sequential obstacles.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 7: In-Game Juice" — Goal + 4 Success Criteria
- `.planning/REQUIREMENTS.md` §BEAUTY — BEAUTY-05..08 acceptance criteria
- `CLAUDE.md` — locked decisions (motion-gating, named imports, AbortController, no new heavy deps)

### Existing code Phase 7 builds on
- `src/main.ts` — actor.subscribe block (where SCORE detection lives); roundStarted hook (where to reset milestone fires + spawn index)
- `src/ui/UIBridge.tsx` — Preact mount point (score popup pool can mount here)
- `src/particles/ParticleEmitter.ts` and `src/particles/createParticles.ts` — existing particle system, possibly extended with tint
- `src/entities/ObstaclePair.ts` — `setColor` method to add
- `src/systems/ObstacleSpawner.ts` — color cycle index
- `src/storage/StorageManager.ts` — v2 settings schema (add `flapTrail: boolean`)
- `src/ui/screens/SettingsModal.tsx` — add Flap trail toggle row
- `src/render/toonMaterial.ts` — material clone strategy
- `src/constants.ts` — PIPE_COLOR_CYCLE definition
- `src/a11y/motion.ts` — prefersReducedMotion (gate everything)

### External docs
- Three.js Vector3.project: standard projection API; verify via ctx7 only if uncertain
- CSS keyframe animations: standard

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- SCORE detection: `if (s === 'playing' && snapshot.context.score > lastScore)` in main.ts:148 — reuse for popup spawn + milestone trigger
- `roundStarted` hook (main.ts:152): release pool, reset bird; extend to reset milestone-fired set + spawn index + flap trail ghosts
- `prefersReducedMotion(storage)` — gate every effect
- `particles.burst({x,y,z})` in main.ts:144 — already used for death; reuse for milestone (with tint)
- StorageManager v2 settings schema: simple boolean addition (already has reducedMotion, sound, music, colorblind toggles)

### Integration points
- main.ts actor.subscribe (around line 144-149) — score popup spawn + milestone detection
- main.ts roundStarted (line 152) — extend with milestone-fired reset + spawn index reset + flap trail reset
- ObstaclePair constructor + setColor — material clone choice
- SettingsModal.tsx — add `flapTrail` toggle row alongside existing toggles

### Files unchanged in Phase 7
- gameMachine.ts (no new states or events)
- CollisionSystem.ts (still 'playing'-only)
- vite.config.ts, package.json (no new deps; no PWA changes)
- Phase 6 changes (bird bob, demo pipes, music volume, logo, CTA pulse)

</code_context>

<deferred>
## Deferred Ideas

- **Score popup font/animation styling refresh** — Phase 8 covers font + glass treatment; Phase 7 popup uses default styles
- **Combo system / streak multiplier** — out of scope for v1.1; would be its own milestone
- **Confetti for personal-best gold flash** — already implemented in Phase 3 (NewBestBadge); milestone burst in Phase 7 is a separate, less-rare effect

</deferred>

---

*Phase: 07-in-game-juice*
*Context gathered: 2026-04-29*
