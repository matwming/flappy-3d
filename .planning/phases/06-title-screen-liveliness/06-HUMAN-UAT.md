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
result: [pending — visual smoothness not Playwright-measurable; static code verified by Phase 6 verification]

### 2. Demo pipes scroll smoothly on title (BEAUTY-02)
expected: Pipes spawn from right, scroll past at relaxed speed (1.8 units/s, 2.2s spawn interval, 3.2m gap), despawn off left. No collision (you can't die on the title).
how_to_test: Watch the title screen for ~10 seconds. 4-5 pairs should spawn and scroll across.
result: [pending — visual + timing observation, not Playwright-measurable in 30s; static code verified by Phase 6 verification]

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
result: [pending — requires multi-state Playwright test; `useRef` one-shot guard verified in source via 06-VERIFICATION.md]

### 7. CTA pulse rhythm (BEAUTY-04)
expected: "Tap to start" CTA pulses at 1.6s cycle (0.6 ↔ 1.0 opacity). Subtle, not distracting.
how_to_test: Stare at the CTA for 5+ seconds. Should pulse smoothly.
result: PASSED (structural) — Playwright C6 confirmed `animationName: ctaPulse` on CTA element. CSS `@keyframes ctaPulse` 1.6s ease-in-out infinite verified.

## Summary

total: 7
passed: 3
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
None blocking. Pending items require human visual/auditory confirmation:
- Visual smoothness (#1, #2)
- Audio level (#3)
- State persistence across rounds (#6)
