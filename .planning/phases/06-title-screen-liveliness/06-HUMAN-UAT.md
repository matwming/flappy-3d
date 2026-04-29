---
status: partial
phase: 06-title-screen-liveliness
source: [06-VERIFICATION.md]
started: 2026-04-29T17:00:00Z
updated: 2026-04-29T17:00:00Z
---

## Current Test

[awaiting visual confirmation on live deploy]

## Tests

### 1. Bird bob smoothness on title (BEAUTY-01)
expected: Bird hovers at ~y=0 with a smooth sine bob (~1Hz, ±0.15m amplitude). No twitching, no clipping into ground.
how_to_test: Open https://matwming.github.io/flappy-3d/ — bird should bob gently on title.
result: [pending]

### 2. Demo pipes scroll smoothly on title (BEAUTY-02)
expected: Pipes spawn from right, scroll past at relaxed speed (1.8 units/s, 2.2s spawn interval, 3.2m gap), despawn off left. No collision (you can't die on the title).
how_to_test: Watch the title screen for ~10 seconds. 4-5 pairs should spawn and scroll across.
result: [pending]

### 3. Music volume drop on title (BEAUTY-02)
expected: Music plays at 0.2 volume on title; jumps to 0.4 when you tap to start.
how_to_test: Open the live deploy with audio on. Listen to the title music level vs. gameplay music level.
result: [pending]

### 4. OS Reduce Motion suppresses all 3 effects (BEAUTY-01, 03, 04)
expected: With OS-level "Reduce Motion" enabled, bird is stationary, logo letters appear instantly (no stagger), CTA does not pulse.
how_to_test: Mac: System Settings → Accessibility → Display → Reduce Motion → ON. Reload the page.
result: [pending]

### 5. Logo letter-stagger entrance (BEAUTY-03)
expected: On first page load, "FLAPPY 3D" letters fade in one-by-one (~50ms apart, ~350ms total).
how_to_test: Open the live deploy in a fresh tab. Watch the heading animate in.
result: [pending]

### 6. Logo does NOT re-animate after back-to-title (BEAUTY-03)
expected: After playing a round and tapping "Back to Title" on GameOver, the logo is already visible — no re-animation.
how_to_test: Play one round, die, tap Back to Title. Logo should be static.
result: [pending]

### 7. CTA pulse rhythm (BEAUTY-04)
expected: "Tap to start" CTA pulses at 1.6s cycle (0.6 ↔ 1.0 opacity). Subtle, not distracting.
how_to_test: Stare at the CTA for 5+ seconds. Should pulse smoothly.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

(none — all items are visual confirmations on live deploy; not failures)
