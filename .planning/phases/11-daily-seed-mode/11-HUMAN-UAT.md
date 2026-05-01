---
status: partial
phase: 11-daily-seed-mode
source: [11-VERIFICATION.md]
started: 2026-05-02T13:00:00Z
updated: 2026-05-02T13:00:00Z
---

## Current Test
[4/4 code checks PASSED via verifier; 4 visual/runtime items pending live play]

## Tests

### 1. Daily mode deterministic pipe layout (MODE-07)
expected: Playing two Daily rounds back-to-back on the same UTC date produces identical pipe gap Y-positions (same seed → same sequence).
how_to_test: Title → Daily → start → die → Restart → die again. Compare pipe positions: should match.
result: [pending]

### 2. Today's best on Title (MODE-08)
expected: Title with Daily mode selected shows "Today's best: N (M attempts)" — or "First attempt today" if first run. Updates after each round.
how_to_test: Title → Daily → check stats line above leaderboard. Play a round → return to Title (Back to Title or restart) → confirm M increments.
result: [pending]

### 3. Share button on GameOver in daily mode (MODE-09)
expected: After dying in Daily mode, GameOver shows a "Share" button next to Restart and Back-to-Title. Clicking it copies "Daily YYYY-MM-DD: <score> 🐦" to clipboard and shows "Copied!" feedback for ~2s.
how_to_test: Daily → play → die → click Share → paste in another app to verify content.
result: [pending]

### 4. No regression in Endless and Time-Attack
expected: Endless still uses random pipes (different layout each run); Time-Attack still has 60s timer + auto-end (Phase 10 behavior); Phase 6/7/8 juice all still works.
how_to_test: Switch between modes, play one round of each. Confirm differences.
result: [pending]

### 5. Cross-session seed consistency (MODE-07)
expected: Closing and reopening the tab on the same UTC date shows the same pipe sequence in Daily mode. Attempt count increments across sessions.
how_to_test: Play Daily → die → close tab → reopen → Daily → start → confirm pipes identical to previous session AND count went from N→N+1.
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
