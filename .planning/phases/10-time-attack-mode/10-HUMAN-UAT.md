---
status: partial
phase: 10-time-attack-mode
source: [10-VERIFICATION.md]
started: 2026-05-01T13:00:00Z
updated: 2026-05-01T13:00:00Z
---

## Current Test
[6/6 code checks PASSED via verifier; 3 visual/runtime items pending live play]

## Tests

### 1. Timer countdown + auto-end (MODE-04, MODE-06)
expected: Title → tap Time-Attack → tap to start → HUD shows mm:ss countdown decrementing each second. At 0:00 the round auto-ends to GameOver (no death required, bird falls per dying state).
how_to_test: Open https://matwming.github.io/flappy-3d/ → Time-Attack → start → wait or play. Confirm timer counts 1:00 → 0:59 → ... → 0:00 → GameOver.
result: [pending]

### 2. Time-attack leaderboard at GameOver (MODE-06)
expected: After auto-end, GameOverScreen shows time-attack-specific leaderboard entries (separate from endless). Score pushed to `leaderboardByMode.timeAttack`.
how_to_test: Play one Time-Attack round. Inspect localStorage `flappy-3d-state`: confirm new entry in `leaderboardByMode.timeAttack`, not `endless`.
result: [pending]

### 3. Urgency styling at ≤10s
expected: When timer reaches 10 seconds, `.timer-urgent` class applies — color shifts to red, optional pulse animation (motion-gated).
how_to_test: Watch HUD timer in time-attack near 0:10. Should visibly shift color.
result: [pending]

### 4. No regression in Endless mode
expected: Selecting Endless on Title shows NO timer in HUD. Round runs normally; only ends on death; score pushes to `leaderboardByMode.endless`.
how_to_test: Title → Endless → play → die. Confirm no timer + endless leaderboard updated.
result: [pending]

### 5. Pause/resume preserves timer
expected: In Time-Attack, tapping pause freezes the timer. RESUME continues from where it stopped.
how_to_test: Time-Attack → start → at ~0:30 remaining tap pause → wait 10s → tap resume → timer should continue from 0:30 (not 0:20).
result: [pending]

## Summary
total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
None — all items are runtime gameplay observation.
