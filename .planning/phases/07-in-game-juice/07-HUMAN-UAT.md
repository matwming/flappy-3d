---
status: failed_visual
phase: 07-in-game-juice
source: [07-VERIFICATION.md]
started: 2026-04-29T18:00:00Z
updated: 2026-04-29T20:30:00Z
verified_via: [Playwright UAT, user iPhone testing]
---

## Current Test
[5 visual items reported FAILED by user during iPhone UAT; investigation skipped per user request. Code wiring verified present in production bundle (spawnScorePopup, burstTinted, triggerMilestoneFlash, setColorblindMode, snapshotGhost). Likely causes: stale SW cache OR system reduce-motion still active OR mobile-specific behavior — not investigated. Items left FAILED for honest record.]

## Tests

### 1. `+1` score popup floats from bird (BEAUTY-05)
expected: On each scored point, a `+1` element rises ~70px from the bird's screen position over ~700ms while fading out.
how_to_test: Play on https://matwming.github.io/flappy-3d/, score points. Watch for popups.
result: FAILED — user reports popup not visible during iPhone gameplay (2026-04-29). Code wiring confirmed: `spawnScorePopup` defined in UIBridge, called from main.ts `actor.subscribe` SCORE branch behind `prefersReducedMotion` gate. CSS `@keyframes scorePopup` present. Investigation skipped per user request.

### 2. Flap trail ghosts (BEAUTY-06)
expected: With "Flap trail" toggle ON in Settings, flapping spawns 3 fading bird-mesh echoes that fade in ~180ms. Default OFF.
how_to_test: Settings → enable Flap trail → play and flap. Toggle persists across sessions.
result: FAILED — user reports ghosts not visible with toggle ON (2026-04-29). Code wiring confirmed: `bird.snapshotGhost`, `stepGhosts`, `resetGhosts` all in production bundle. Setting persists via Playwright D2. Investigation skipped per user request.

### 3. Milestone celebrations at 10/25/50 (BEAUTY-07)
expected: When score == 10, 25, or 50, a one-shot gold particle burst + 200ms screen-flash overlay fires. Each milestone fires only once per round.
how_to_test: Score to 10 — watch for gold burst + flash. Continue to 25, 50. Restart — milestones fire again.
result: FAILED — user reports no milestone burst/flash visible (2026-04-29). Code wiring confirmed: MILESTONE_SCORES Set + firedMilestones + burstTinted + triggerMilestoneFlash all in production bundle. Investigation skipped per user request.

### 4. Pipe color cycling (BEAUTY-08)
expected: Consecutive pipe pairs cycle through 4 toon colors (green, teal, orange, purple). Index resets each round.
how_to_test: Play long enough to see 4+ pipe pairs. Each should be a different color.
result: FAILED — user reports cycling not visible (2026-04-29). Code wiring confirmed: PIPE_COLOR_CYCLE constant present, ObstacleSpawner cycles spawnIndex, ObstaclePair.setColor + per-pair material clone all in production bundle. NOT motion-gated. Investigation skipped per user request.

### 5. Colorblind mode suppresses cycling (D-19)
expected: With "Colorblind palette" Settings toggle ON, all pipes are uniform green (no cycling).
how_to_test: Settings → enable Colorblind palette → play. Pipes should not cycle colors.
result: FAILED — user reports test inconclusive (2026-04-29). Could be artifact of #4 failure. Investigation skipped per user request.

### 6. Reduced motion gates apply to all 4 effects
expected: With OS Reduce Motion ON, popups, flap trail, milestone bursts/flashes are all suppressed. Pipe color cycling is NOT motion-related and continues normally.
how_to_test: Mac System Settings → Accessibility → Display → Reduce Motion → ON. Reload, play.
result: PASSED (CSS) — Playwright D1 confirmed `@media (prefers-reduced-motion: reduce)` is honored.

### 7. No Phase 6 regression
expected: Title bird bob, demo pipes, logo entrance, and CTA pulse all still work.
how_to_test: Open the live deploy. Watch the title for ~5s.
result: PASSED — user confirmed Phase 6 items #1, #2, #5 visible on live iPhone testing.

## Summary
total: 7
passed: 2
issues: 5 (visual-only failures, code wiring verified present)
pending: 0
skipped: 0
blocked: 0

## Gaps
5 visual effects don't render on user's iPhone session despite code being deployed correctly. Investigation was skipped per user request. Phase 7 ships with these as known visual issues; downstream phases or future sessions can dig into runtime cause.
