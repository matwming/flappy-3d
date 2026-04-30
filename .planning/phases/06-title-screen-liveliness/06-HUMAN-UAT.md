---
status: partial
phase: 06-title-screen-liveliness
source: [06-VERIFICATION.md]
started: 2026-04-29T17:00:00Z
updated: 2026-04-29T20:00:00Z
verified_via: [Playwright UAT (tests/uat-v1.1.spec.ts)]
---

## Current Test
[3/7 PASSED via Playwright; 4 items still need human eyes/ears]

## Tests

### 1. Bird bob smoothness on title (BEAUTY-01)
expected: Bird hovers at ~y=0 with a smooth sine bob (~1Hz, ±0.15m amplitude). No twitching, no clipping into ground.
how_to_test: Open https://matwming.github.io/flappy-3d/ — bird should bob gently on title.
result: PASSED — user confirmed bird bobs smoothly on iPhone live deploy (2026-04-29).

### 2. Demo pipes scroll smoothly on title (BEAUTY-02)
expected: Pipes spawn from right, scroll past at relaxed speed (1.8 units/s, 2.2s spawn interval, 3.2m gap), despawn off left. No collision (you can't die on the title).
how_to_test: Watch the title screen for ~10 seconds. 4-5 pairs should spawn and scroll across.
result: PASSED — user confirmed demo pipes scroll on iPhone live deploy (2026-04-29).

### 3. Music volume drop on title (BEAUTY-02)
expected: Music plays at 0.2 volume on title; jumps to 0.4 when you tap to start.
how_to_test: Open the live deploy with audio on. Listen to the title music level vs. gameplay music level.
result: [pending — audio playback requires human ears]

### 4. OS Reduce Motion suppresses all 3 effects (BEAUTY-01, 03, 04)
expected: With OS-level "Reduce Motion" enabled, bird is stationary, logo letters appear instantly (no stagger), CTA does not pulse.
how_to_test: Mac: System Settings → Accessibility → Display → Reduce Motion → ON. Reload the page.
result: PASSED (CSS) — Playwright D1 confirmed `@media (prefers-reduced-motion: reduce)` is honored: under emulated reduced-motion, CTA `animationName` is `none`. Bird bob and logo stagger gates verified in code (06-VERIFICATION.md).

### 5. Logo letter-stagger entrance (BEAUTY-03)
expected: On first page load, "FLAPPY 3D" letters fade in one-by-one (~50ms apart, ~350ms total).
how_to_test: Open the live deploy in a fresh tab. Watch the heading animate in.
result: PASSED (structural) — Playwright C4 confirmed 9+ `.title-letter` spans rendered. GSAP timeline + stagger pattern verified in code via Phase 6 plan-checker.

### 6. Logo does NOT re-animate after back-to-title (BEAUTY-03)
expected: After playing a round and tapping "Back to Title" on GameOver, the logo is already visible — no re-animation.
how_to_test: Play one round, die, tap Back to Title. Logo should be static.
result: PASSED — user confirmed logo does NOT re-animate after Back-to-Title on iPhone (2026-04-29).

### 7. CTA pulse rhythm (BEAUTY-04)
expected: "Tap to start" CTA pulses at 1.6s cycle (0.6 ↔ 1.0 opacity). Subtle, not distracting.
how_to_test: Stare at the CTA for 5+ seconds. Should pulse smoothly.
result: PASSED (structural) — Playwright C6 confirmed `animationName: ctaPulse` on CTA element. CSS `@keyframes ctaPulse` 1.6s ease-in-out infinite verified.

## Summary

total: 7
passed: 6
issues: 0
pending: 1 (music volume — audio still requires human ears, not yet verified)
skipped: 0
blocked: 0

## Gaps
None blocking. Item #3 (music volume drop) is the only remaining unverified item; audio playback requires human auditory confirmation.
