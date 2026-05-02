---
id: SEED-001
status: consumed-in-v1.3
planted: 2026-04-29
planted_during: v1.1 Beauty Pass (post-Phase 8)
trigger_when: "next visual polish milestone OR atmosphere/depth-focused milestone OR when sprite/SVG art assets become available"
scope: small
---

# SEED-001: Cloud parallax layer

## Why This Matters

The current scene has only sky-shader gradient → mountains → trees → playfield. Adding a mid-depth cloud layer (between sky and mountains, at z≈-7) would:
- Sell the depth illusion stronger — clouds at slow scroll speed (50% of foreground) anchor "the world is huge"
- Add organic motion to the otherwise static sky (currently just color gradient)
- Give the title screen extra ambient life, complementing Phase 6's bird bob + demo pipes
- Cheap visually: 4-6 simple Plane meshes with cloud-shaped sprites/SVG, scrolling on the existing ScrollSystem extension that Phase 6 already enabled for title state

Estimated bundle cost: ~2-4KB if SVG, ~8-15KB if PNG sprites. Negligible vs the 54KB headroom.

## When to Surface

**Trigger:** any visual polish milestone after v1.1, OR if/when sprite art assets are sourced

This seed should surface during `/gsd-new-milestone` when the milestone scope mentions:
- "background", "atmosphere", "depth", "ambient"
- "sky", "scene polish", "visual layers"
- "v1.2 polish", "post-v1.1 visual work"

## Scope Estimate

**Small** — half a day of work:
- Source 3-5 cloud sprites (could be CC0 from kenney.nl game-asset packs, or hand-drawn SVG)
- Add `Cloud` entity (Mesh<PlaneGeometry, MeshBasicMaterial> with sprite texture, transparent)
- Extend ScrollSystem to scroll a separate `clouds[]` array at 0.5× speed
- Loop wrap at x=-15 → x=+15
- Motion-gate: clouds still scroll under reduced-motion (decoration, not animation juice — same call as demo pipes in BEAUTY-02)

## Breadcrumbs

- `src/entities/Background.ts` — sky shader at z=-10, mountains at z=-something. Cloud layer fits between.
- `src/systems/ScrollSystem.ts` — already extended in Phase 6 to scroll on `'title'` state. Same extension covers clouds.
- `.planning/phases/06-title-screen-liveliness/06-CONTEXT.md` — "B. Cloud parallax layer" was discussed in the Beauty Pass brainstorm and explicitly deferred (no art assets yet)
- `public/audio/CREDITS.md` — pattern for attributing CC0 assets (would extend for cloud sprites)

## Notes

- Phase 6 already proved the demo-pipes-on-title pattern works visually; clouds are the "next layer up" of the same idea.
- Keep colorblind-aware: clouds should be desaturated white/gray so they don't interfere with the colorblind palette.
- If using SVG, embed inline in styles.css (zero round-trips); if PNG, ensure SW pre-cache (already configured).
