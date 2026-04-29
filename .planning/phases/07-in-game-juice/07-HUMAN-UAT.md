---
status: partial
phase: 07-in-game-juice
source: [07-VERIFICATION.md]
started: 2026-04-29T18:00:00Z
updated: 2026-04-29T18:00:00Z
---

## Current Test
[awaiting visual confirmation on live deploy]

## Tests

### 1. `+1` score popup floats from bird (BEAUTY-05)
expected: On each scored point, a `+1` element rises ~70px from the bird's screen position over ~700ms while fading out.
how_to_test: Play on https://matwming.github.io/flappy-3d/, score points. Watch for popups.
result: [pending]

### 2. Flap trail ghosts (BEAUTY-06)
expected: With "Flap trail" toggle ON in Settings, flapping spawns 3 fading bird-mesh echoes that fade in ~180ms. Default OFF.
how_to_test: Settings → enable Flap trail → play and flap. Toggle persists across sessions.
result: [pending]

### 3. Milestone celebrations at 10/25/50 (BEAUTY-07)
expected: When score == 10, 25, or 50, a one-shot gold particle burst + 200ms screen-flash overlay fires. Each milestone fires only once per round.
how_to_test: Score to 10 — watch for gold burst + flash. Continue to 25, 50. Restart — milestones fire again.
result: [pending]

### 4. Pipe color cycling (BEAUTY-08)
expected: Consecutive pipe pairs cycle through 4 toon colors (green, teal, orange, purple). Index resets each round.
how_to_test: Play long enough to see 4+ pipe pairs. Each should be a different color.
result: [pending]

### 5. Colorblind mode suppresses cycling (D-19)
expected: With "Colorblind palette" Settings toggle ON, all pipes are uniform green (no cycling).
how_to_test: Settings → enable Colorblind palette → play. Pipes should not cycle colors.
result: [pending]

### 6. Reduced motion gates apply to all 4 effects
expected: With OS Reduce Motion ON, popups, flap trail, milestone bursts/flashes are all suppressed. Pipe color cycling is NOT motion-related and continues normally.
how_to_test: Mac System Settings → Accessibility → Display → Reduce Motion → ON. Reload, play.
result: [pending]

### 7. No Phase 6 regression
expected: Title bird bob, demo pipes, logo entrance, and CTA pulse all still work.
how_to_test: Open the live deploy. Watch the title for ~5s.
result: [pending]

## Summary
total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
(none — all items are visual confirmations)
