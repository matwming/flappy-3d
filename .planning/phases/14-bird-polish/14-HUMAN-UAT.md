---
status: pending
phase: 14-bird-polish
source: [14-01-SUMMARY.md, code, tests/uat-v1.4.spec.ts]
started: 2026-05-02T03:30:00Z
updated: 2026-05-02T03:30:00Z
---

## Current Test
[Code-side checks PASSED via Playwright UAT (tests/uat-v1.4.spec.ts). Visual items pending live observation on https://quietbuildlab.github.io/flappy-3d/]

## Tests

### 1. Rim-light edge glow on bird (POLISH-01)
expected: A subtle yellow-white edge highlight on the bird sphere, especially visible against darker sky keyframes. Should NOT look like a hard outline; it's a soft falloff.
how_to_test: Play any mode → focus on the bird. Tilt the device or play through the day/night cycle to see the rim against different sky colors.
result: [pending]

### 2. WCAG-AA contrast preserved (POLISH-01)
expected: Rim light enhances bird-vs-sky contrast at silhouette without making the bird's interior look muddy. Both default and colorblind palettes still pass.
how_to_test: Settings → Colorblind palette ON → confirm rim is still subtle, not exaggerated.
result: [pending]

### 3. Wing meshes visible (POLISH-02)
expected: 2 small wing meshes flank the bird body (left + right). They share the bird's color, sit at z=0, and move with the bird (squash, position, bob).
how_to_test: Look at the bird at rest on Title screen — wings should be visible as small flaps on either side.
result: [pending]

### 4. Wings flap on FLAP (POLISH-02)
expected: Each tap/click/space rotates wings up to ~0.6rad and back over ~80ms (similar timing to squashStretch). Wings flap UP while body squashes — composite motion.
how_to_test: In any mode, tap repeatedly. Observe wings rotating in/out of plane on each flap.
result: [pending]

### 5. Wings motion-gated (POLISH-02)
expected: Settings → Reduce Motion ON → wings stay still on flap (rotation 0). Bird still flaps physics-wise; just no rotation animation.
how_to_test: Reduce Motion ON → start round → tap → wings should be static.
result: [pending]

### 6. No regression with squashStretch
expected: Existing Phase 7 squashStretch on flap still works, composes naturally with wings.
how_to_test: Tap on Title → see body squash and wings flap together.
result: [pending]

### 7. No mobile-perf regression
expected: Sustained 60fps on iPhone 12 / Pixel 6 with rim light + wings.
how_to_test: Play on device, observe smoothness.
result: [pending]

## Summary
total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
None — all items require live observation on the deployed URL.
