# Phase 12: Cloud Parallax Layer - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Milestone:** v1.3 — Atmosphere (first phase)

<domain>
## Phase Boundary

Add a cloud layer between the sky shader and mountains. 4-6 cloud meshes drifting at half scroll speed, sourced from inline-SVG-as-data-URL (zero HTTP fetches). Adds depth without art-asset dependencies.

In scope:
- 4-6 cloud sprite meshes (`Mesh<PlaneGeometry, MeshBasicMaterial>` with `transparent: true`, `depthWrite: false`)
- Inline SVG cloud shape encoded as data URL, used as material map texture
- Pool/array of clouds in `Background.ts` (or new `CloudSystem.ts`)
- Clouds scroll at 0.5× current `scrollSpeed` per frame in title + playing + dying states
- Wrap behavior: when cloud x < -wrapThreshold, respawn at +wrapThreshold with randomized y/z within bounds

Out of scope:
- Day/night cycle on sky (Phase 13)
- Per-cloud animation (rotation, scale pulsing) — static sprites only
- Cloud collision with bird (decoration only — no gameplay impact)
- Different cloud types (rain, snow, etc.)
- Per-mode cloud variation (same clouds in endless / time-attack / daily)

</domain>

<decisions>
## Implementation Decisions

### Cloud sprite source (ATMOS-01, ATMOS-02)
- **D-01:** Single inline SVG cloud shape, ~200 bytes uncompressed, encoded as data URL. One shape, used by all 4-6 cloud meshes. Sufficient for visual variety via different scales + positions.
- **D-02:** SVG content: simple cloud silhouette (3-4 overlapping circles fused via path). White fill, no stroke. Approximate dimensions: 200×100 viewBox.
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
    <path d="M40,80 Q20,80 20,60 Q20,40 50,40 Q60,20 90,30 Q120,10 150,40 Q180,40 180,60 Q180,80 160,80 Z" fill="#ffffff" opacity="0.95"/>
  </svg>
  ```
- **D-03:** Texture loading: `new TextureLoader().load(dataUrl)` — synchronous-from-data-URL (no network). The texture loader returns immediately because data URLs don't await network.
- **D-04:** Material: `MeshBasicMaterial({ map: cloudTexture, transparent: true, depthWrite: false, opacity: 0.7 })`. The `opacity` softens the clouds; SVG `opacity="0.95"` gives a baseline, mesh opacity layered on top dims further.

### Placement (ATMOS-01)
- **D-05:** Z position: -7 (between sky shader at -10 and mountains at variable z near -2..-5). Clouds appear in front of sky, behind mountains.
- **D-06:** X range: spawn x in `[-15, +15]`, despawn at `x < -20`, respawn at `x > +20` with new randomized x near +15.
- **D-07:** Y range: clouds spread vertically `y ∈ [+1.5, +3.5]` (above gameplay area, below sky-top). Random y per cloud.
- **D-08:** Scale: each cloud randomized scale `[0.7, 1.3]` for visual variety from a single SVG.

### Scroll behavior (ATMOS-01)
- **D-09:** Scroll speed: 0.5× of current `difficultyFrom(score).scrollSpeed`. Calculated per frame in CloudSystem.step.
- **D-10:** Active states: scroll in title (current title-state behavior allows demo pipes per Phase 6; clouds piggyback) + playing + dying. NOT in paused, gameOver — clouds freeze (matches obstacle scroll behavior).
- **D-11:** Reset on `roundStarted`: respawn clouds at randomized starting positions to avoid stale layout from a paused/gameOver state. Same hook as bird/obstacles already use.

### Bundle/perf (ATMOS-02)
- **D-12:** Total cloud-asset overhead: ≤2KB gzipped. SVG is ~200B raw, base64 data URL ~270B, gzipped maybe 200-300B. Cloud system code ~1.5KB. Well under cap.
- **D-13:** No new dependencies. PlaneGeometry + MeshBasicMaterial are already imported via Three.js.
- **D-14:** Reuse `PlaneGeometry` instance across all clouds (don't create per-cloud).
- **D-15:** Motion gating: clouds NOT motion-gated (decoration, same call as Phase 6 demo pipes per BEAUTY-02). Reduced-motion users see scrolling clouds; cycling/decoration is acceptable.

### Architecture
- **D-16:** Implementation choice (Claude's discretion): extend `src/entities/Background.ts` with cloud array + step method, OR new `src/entities/Clouds.ts` (or `src/systems/CloudSystem.ts`). Recommendation: new `Clouds.ts` entity that the loop scrolls; mirrors `Background` shape.
- **D-17:** main.ts wiring: instantiate `clouds = new Clouds(scene)`; loop.add a step function that calls `clouds.step(dt, scrollSpeed)`. roundStarted hook: `clouds.reset()`.

### Cross-cutting
- **D-18:** Endless / Time-Attack / Daily / Title all show clouds. Modes don't change clouds.
- **D-19:** Phase 13 day/night cycle (next phase) will animate sky color; clouds remain white. Clouds catch the sunset color via material color override IF Phase 13 needs it (deferred decision).
- **D-20:** No regression on Phase 6 demo pipes, Phase 7 juice, Phase 10 timer, Phase 11 daily-seed.

### Claude's Discretion
- Exact SVG cloud silhouette path (the suggested path is a starting point; tune for visual appeal)
- Number of clouds (4 vs 6)
- Whether to use one shared MeshBasicMaterial or per-cloud opacity tuning
- Whether `Clouds` lives in `src/entities/` or `src/systems/`

</decisions>

<specifics>
## Specific Ideas

- **Reference for cloud feel:** Studio Ghibli, Animal Crossing — soft, friendly, drifting. NOT photorealistic, NOT noisy. Single repeating SVG silhouette is fine; the parallax sells the depth.
- **The win:** Title screen + every gameplay round feels less flat. Today: sky is a static gradient. Tomorrow: sky has gentle motion that the eye picks up immediately.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope source of truth
- `.planning/ROADMAP.md` §"Phase 12: Cloud Parallax Layer" — Goal + 4 SC
- `.planning/REQUIREMENTS.md` §ATMOS — ATMOS-01, ATMOS-02 acceptance criteria
- `.planning/seeds/SEED-001-cloud-parallax-layer.md` — original seed (consumed)
- `CLAUDE.md` — locked decisions

### Existing code Phase 12 builds on
- `src/entities/Background.ts` — pattern reference (sky shader + mountains + trees, position management)
- `src/systems/ScrollSystem.ts` — Phase 6 extended scroll to title state; cloud system mirrors that gating
- `src/main.ts` — loop.add registration, roundStarted hook
- `src/loop/GameLoop.ts` — system step contract

### External docs
- Three.js TextureLoader with data URLs: standard, no network fetch needed
- SVG to data URL: `data:image/svg+xml;utf8,<svg ...>` or base64 `data:image/svg+xml;base64,<encoded>` — utf8 is more readable + roughly equivalent gzipped size

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable patterns
- Background.ts has sky/mountains/trees pattern — Cloud entity follows same shape
- ScrollSystem state-gating from Phase 6 — clouds use same gate logic
- roundStarted reset hook — extend with `clouds.reset()`
- PlaneGeometry instance shared across multiple meshes (memory-efficient)

### Integration points
- main.ts: instantiate clouds, register in loop, reset on roundStarted
- Background.ts (optional): if extending instead of new file, add cloud array property + scroll method

### Files unchanged in Phase 12
- gameMachine.ts (no new states/events)
- StorageManager.ts (no new data)
- src/ui/* (clouds are scene-only, no DOM impact)
- vite.config.ts, package.json (no new deps)
- All Phase 6/7/8/9/10/11 features

</code_context>

<deferred>
## Deferred Ideas

- **Cloud color reactive to sky color** (Phase 13 day/night cycle) — clouds stay white in Phase 12; Phase 13 may tint them at sunset
- **Per-cloud animation** (slight rotation, scale pulse) — static sprites are sufficient for v1.3
- **Different cloud types** (cumulus, cirrus, storm) — out of scope; one SVG shape covers v1.3
- **Cloud shadows on bird/pipes** — out of scope; would require shadow-map setup which CLAUDE.md forbids on mobile

</deferred>

---

*Phase: 12-cloud-parallax-layer*
*Context gathered: 2026-05-02*
