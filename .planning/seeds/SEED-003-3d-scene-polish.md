---
id: SEED-003
status: consumed-in-v1.4
planted: 2026-04-29
planted_during: v1.1 Beauty Pass (post-Phase 8)
trigger_when: "3D scene polish milestone OR character-animation milestone OR when willing to take mobile-perf risk for visual upgrades"
scope: medium
---

# SEED-003: 3D scene polish bundle (rim light + wing flap + camera bob)

## Why This Matters

The bird is a single sphere with toon material. The camera is fixed. These are intentional v1 simplifications that left the door open for character/scene polish later. Three discrete enhancements, all related, all with mobile-perf risk:

**A. Rim lighting on bird** — cel-shaded edge highlight via toon material extension. Adds a subtle outline glow that makes the bird "pop" against backgrounds. New uniform in `toonMaterial`. Cost: ~negligible.

**B. Bird wing flap animation** — current bird is a single mesh. Adding 2 small wing meshes with rotation tweened on flap (GSAP) gives the bird character. Replaces the current squashStretch-only flap feedback. Cost: ~3KB CSS-equivalent for materials.

**C. Subtle camera bob** — camera y-offset following bird velocity creates parallax depth on the playfield. RISKY for motion sickness — must gate behind `prefersReducedMotion(storage)` AND a separate Settings opt-in (not default-on).

## When to Surface

**Trigger:** any milestone focused on:
- "character animation", "bird polish", "3D scene polish"
- "v1.2 visuals", "post-Beauty-Pass scene work"
- Camera bob specifically requires "willing to gate aggressively for motion sensitivity"

## Scope Estimate

**Medium** — could be 1-2 phases:
- A (rim light) is small — half a day, isolated to toon material + maybe 1 uniform
- B (wing flap) is small — geometry + GSAP integration via existing anim.ts pattern
- C (camera bob) is small but risky — needs Settings toggle + double motion-gate + on-device testing on iPhone 12 to confirm no jank

Could split into 2 phases (A+B together = "Bird polish", C alone = "Camera depth") OR roll all 3 into one phase if user is comfortable with the perf risk on C.

## Breadcrumbs

- `src/render/toonMaterial.ts` — existing `createToonMaterial` factory; rim-light uniform extends here
- `src/entities/Bird.ts` — current single-sphere mesh; would add wing meshes as children of `mesh`
- `src/anim/anim.ts` — GSAP `squashStretch` pattern; wing rotation tween follows same shape
- `src/main.ts:80-82` — flap juice gate; wing flap call would land here
- `src/render/createRenderer.ts` — camera lives here; bob would tween camera.position.y per frame
- `src/a11y/motion.ts` — prefersReducedMotion gate (essential for camera bob)
- `src/storage/StorageManager.ts` — Settings v2 schema (would add `cameraBob: boolean`, default OFF)
- `src/ui/screens/SettingsModal.tsx` — Settings toggle row pattern (mirrors existing flapTrail toggle)
- `.planning/phases/06-title-screen-liveliness/06-CONTEXT.md` — option E "3D polish" was deferred from Beauty Pass for mobile-perf risk

## Notes

- **Don't bundle camera bob with A+B unless you're confident in mobile testing capacity.** If you don't have an iPhone 12 / Pixel 6 to test on, leave C out.
- Wing flap interaction with squashStretch: pick one or the other, not both. Wing flap is more characterful; squashStretch is the existing mechanic. Probably keep squashStretch and add wings as additional motion (wings rotate during the squash window).
- Rim light should remain subtle — overdoing it makes the toon shading muddy.
