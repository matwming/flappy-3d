---
status: pending
phase: 15-camera-depth
source: [15-01-SUMMARY.md, code, tests/uat-v1.4.spec.ts]
started: 2026-05-02T03:30:00Z
updated: 2026-05-02T03:30:00Z
---

## Current Test
[Code-side checks PASSED via Playwright UAT (tests/uat-v1.4.spec.ts: cameraBob defaults false, persists, toggle visible). Behavioral items pending live observation on https://quietbuildlab.github.io/flappy-3d/]

## Tests

### 1. Camera bob defaults OFF (POLISH-03)
expected: First time opening the game (or after clearing localStorage), Camera bob toggle in Settings is OFF. The camera doesn't move.
how_to_test: Open in private/incognito tab → start a round → camera should be perfectly still.
result: [pending]

### 2. Toggle ON: subtle camera y-bob (POLISH-03)
expected: With Camera bob ON, the camera y-position eases toward `bird.velocity.y * 0.05`. Result: gentle look-up when bird rises sharply, gentle look-down when bird falls fast. Not nauseating.
how_to_test: Settings → Camera bob ON → start a round → flap several times. Compare against toggle OFF.
result: [pending]

### 3. Reduce Motion overrides (POLISH-03)
expected: With Camera bob ON AND Reduce Motion ON, camera stays at base y (no bob). The OS-level/Settings reduce-motion gate wins.
how_to_test: Reduce Motion ON + Camera bob ON → start round → camera should NOT bob.
result: [pending]

### 4. Snap-to-base when toggled OFF mid-game
expected: Toggling Camera bob OFF inside a round (via Pause → Settings) snaps the camera back to base y immediately. No lingering offset.
how_to_test: Camera bob ON → start → flap to mid-round → Pause → Settings → toggle Camera bob OFF → close Settings → Resume. Camera should be at base y.
result: [pending]

### 5. Reset on roundStarted
expected: Each new round starts with camera at base y, even if previous round ended at a non-zero offset.
how_to_test: Camera bob ON → die mid-flap (so velocity.y was non-zero at death) → Restart → camera should reset to base y.
result: [pending]

### 6. No nausea / motion-discomfort regression
expected: For users sensitive to motion: leaving toggle OFF means zero camera motion (parity with v1.3 and earlier).
how_to_test: Confirm default-off behavior is identical to v1.3.
result: [pending]

### 7. No mobile-perf regression
expected: Sustained 60fps on iPhone 12 / Pixel 6 with toggle ON.
how_to_test: Play on device with bob ON; observe smoothness.
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
