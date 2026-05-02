---
status: pending
phase: 12-cloud-parallax-layer
source: [12-01-SUMMARY.md, code]
started: 2026-05-02T03:30:00Z
updated: 2026-05-02T03:30:00Z
---

## Current Test
[All Phase 12 items pending live observation on https://quietbuildlab.github.io/flappy-3d/]

## Tests

### 1. Cloud sprites visible at z=-7 (ATMOS-01)
expected: 5 white-ish puffy SVG cloud sprites are visible behind the bird and pipes, drifting from right to left across the sky. They sit between the sky shader and the mountains.
how_to_test: Open the live URL → start any mode → look at the background as you fly. Clouds should be drifting horizontally, not in front of the playfield, not stacked unnaturally.
result: [pending]

### 2. Parallax scroll at 0.5× (ATMOS-02)
expected: Clouds scroll at half the speed of the pipes/ground. As pipes whoosh past, clouds drift more slowly behind them, creating depth.
how_to_test: Compare cloud horizontal motion to pipe motion. Clouds should visibly lag.
result: [pending]

### 3. Clouds reset cleanly on roundStarted
expected: Restarting after death does not leave clouds frozen, doubled, or off-screen.
how_to_test: Die → Restart 3 times in a row. Cloud drift should look continuous and smooth each round.
result: [pending]

### 4. No visible seam / pop-in
expected: Clouds wrap or recycle off-screen without a visible "snap" or hard cut. Cycling through the same cloud sprites is acceptable; flicker is not.
how_to_test: Play a long round (~30s) and watch the clouds. No flicker, no sudden teleport.
result: [pending]

### 5. No mobile-perf regression
expected: Sustained 60fps on iPhone 12 / Pixel 6 with clouds enabled.
how_to_test: Play on device, observe smoothness. Compare to v1.1 baseline if needed.
result: [pending]

## Summary
total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
None — all items require live observation on the deployed URL.
