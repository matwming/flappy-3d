---
status: partial
phase: 04-pwa-accessibility-bundle-audit
source: [04-VERIFICATION.md]
started: 2026-04-29T15:00:00Z
updated: 2026-04-29T15:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Lighthouse PWA score ≥ 0.90 on deployed URL (PWA-05)
expected: After pushing to `main`, the GitHub Actions `lighthouse` job runs `npx lighthouse <pages-url> --only-categories=pwa --chrome-flags="--headless"` and the resulting `categories.pwa.score` is ≥ 0.90. Score of 1.00 is typical for a properly configured PWA.
how_to_test: Push a commit to `main` (or trigger the workflow manually). Watch the `lighthouse` job in the Actions tab. The job fails with a clear message if the score is below the gate, succeeds otherwise. Alternatively, after the first deploy completes, run locally: `npx lighthouse https://<owner>.github.io/flappy-3d/ --only-categories=pwa --view`.
result: [pending — first push to main not yet performed]

### 2. Sustained 60fps on iPhone 12 / Pixel 6 class device (PERF-03)
expected: The game maintains 60fps during normal play (flapping, scoring, dying, restarting) on real iPhone 12 or Pixel 6 hardware. No sustained drops below 55fps.
how_to_test: Connect device via USB, open Chrome DevTools → Remote Devices → inspect the deployed Pages URL. Open Performance tab → enable FPS meter (Cmd+Shift+P → "Show frames per second meter"). Play a full round (>30s). Record FPS observations. Procedure documented in README → "Performance Testing" section.
result: [pending — requires real-device session, not emulator]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

(none — both items are by-design checkpoints requiring deployment / real device, not failures)
