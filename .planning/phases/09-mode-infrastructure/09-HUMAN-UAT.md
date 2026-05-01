---
status: partial
phase: 09-mode-infrastructure
source: [09-VERIFICATION.md]
started: 2026-05-01T12:00:00Z
updated: 2026-05-01T12:00:00Z
---

## Current Test
[8/8 code checks PASSED via verifier; 5 visual/runtime items pending]

## Tests

### 1. Mode picker visual rendering (MODE-03)
expected: 3 segmented buttons (Endless / Time-Attack / Daily) appear above the leaderboard on Title; Endless highlighted by default on first load.
how_to_test: Open https://matwming.github.io/flappy-3d/ in a fresh tab.
result: [pending]

### 2. Mode persistence on refresh (MODE-03)
expected: Selecting Time-Attack and reloading keeps Time-Attack selected (storage.lastMode persisted).
how_to_test: Title → tap Time-Attack → reload page → Time-Attack still highlighted.
result: [pending]

### 3. Mode-aware leaderboard write (MODE-02)
expected: Playing in Endless mode pushes the score only to `leaderboardByMode.endless`. Time-Attack/Daily buckets stay empty in v1.2 Phase 9 (those modes don't auto-end yet — phases 10/11 add timer + seed).
how_to_test: Play one round in Endless. Inspect localStorage `flappy-3d-state`: confirm score in `leaderboardByMode.endless`, others empty.
result: [pending]

### 4. v2 → v3 migration on existing save (MODE-02)
expected: A pre-existing v2 save (with `version: 2` + flat `leaderboard` array) migrates to v3 (`leaderboardByMode.endless = old leaderboard`) without data loss.
how_to_test: DevTools → Application → Local Storage → set `flappy-3d-state` to a v2 JSON shape with seeded scores → reload → inspect: should show v3 shape with entries under `endless`.
result: [pending]

### 5. No regression on Phase 6/7/8 features
expected: Bird bob, demo pipes, logo entrance, CTA pulse, score popups, milestone bursts, pipe color cycling, frosted-glass overlays, gradient buttons all still work.
how_to_test: Play a round in Endless mode (default), observe.
result: [pending]

## Summary
total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
None — all items are runtime visual/state inspection.
