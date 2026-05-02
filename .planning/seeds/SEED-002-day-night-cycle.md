---
id: SEED-002
status: consumed-in-v1.3
planted: 2026-04-29
planted_during: v1.1 Beauty Pass (post-Phase 8)
trigger_when: "atmospheric / mood / progression-tied visual milestone OR when score-progression rewards become a theme"
scope: small
---

# SEED-002: Day/night cycle on sky shader

## Why This Matters

The sky is a static gradient (`SKY_TOP_COLOR` → `SKY_BOTTOM_COLOR` via shader). Animating the gradient over time or score creates a sense of progression and atmospheric reward without any new mesh work.

Two driving options (pick one at planning time):
- **Time-driven:** every ~60s of play, sky cycles morning → afternoon → sunset → dusk → repeat. Continuous, ambient.
- **Score-driven:** sky shifts color per score milestone (matches BEAUTY-07's 10/25/50 milestones — could add tint shift to those moments).

Score-driven gives players a visible reward for progress; time-driven gives the world depth. Both are good ideas; time-driven is simpler.

## When to Surface

**Trigger:** any milestone focused on:
- "atmosphere", "mood", "theme", "visual progression"
- "day/night", "sky", "weather", "scene mood"
- "reward systems", "score milestones expanded"

## Scope Estimate

**Small** — a few hours:
- Add a uniform `uTime` (time-based) or `uProgress` (score-based 0..1) to the existing `ShaderMaterial` in `Background.createSky`
- Update `uniforms.uTopColor.value` and `uBottomColor.value` per frame (or on score events) by lerping between 4-5 keyframe colors
- Motion-gate: under `prefersReducedMotion`, freeze sky at default colors (no animation)

## Breadcrumbs

- `src/entities/Background.ts:61-75` — `createSky()` returns ShaderMaterial; SKY_TOP_COLOR / SKY_BOTTOM_COLOR uniforms already wired
- `src/constants.ts` — sky colors live here; would extend with palette keyframes
- `src/main.ts` — actor.subscribe block is where score-driven hooks would attach
- `.planning/phases/06-title-screen-liveliness/06-CONTEXT.md` — option B in the Beauty Pass brainstorm explicitly mentioned this; deferred to keep Phase 6 tight

## Notes

- Keep the keyframe palette WCAG-friendly with the bird (orange) and pipes (green or colorblind teal). Avoid sunsets that wash out into the bird color.
- If score-driven, cap the cycle (e.g., score 50 = "endgame" sky), don't loop forever.
- Could combine with SEED-001 (clouds) — clouds catch sunset color naturally if they're white/gray and shader uniforms drive everything.
