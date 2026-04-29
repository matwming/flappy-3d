# WCAG 2 AA Contrast Audit — Phase 04

Date: 2026-04-29
Standard: WCAG 2.1 AA (4.5:1 normal text, 3:1 large text / UI components)
Tool: WCAG 2.1 contrast formula computed programmatically (matches WebAIM Contrast Checker)

## Color Pairs Audited

| Element | Foreground | Background | Ratio | Pass/Fail |
|---------|-----------|------------|-------|-----------|
| Score text (HUD + GameOver) | #ffffff | #1a1a1a | 17.40:1 | PASS |
| Default button text | #1a1a2e | #ffffff | 17.06:1 | PASS |
| Install CTA text | #ffd166 | #1a1a1a | 12.07:1 | PASS |
| Focus ring color on title bg | #ffd166 | #0a1e3c | 11.52:1 | PASS |
| Leaderboard text on panel | #ffffff | #2a2a2a | 14.35:1 | PASS |
| GameOver heading on overlay | #ffffff | #0a0a14 | 19.69:1 | PASS |
| New Best badge text on gold | #451a03 | #fbbf24 | 8.97:1 | PASS |
| Settings modal text on dark | #ffffff | #0f1932 | 17.42:1 | PASS |

## Notes

- All 8 audited UI text/background pairs pass WCAG 2.1 AA at ≥4.5:1 (normal text).
- No color adjustments were needed — all pairs passed on first measurement.
- Colorblind game object colors (#ffd166 bird, #118ab2 pipes) are 3D scene materials, not
  text/UI components; WCAG text contrast rules do not apply. The palette was chosen for
  deuteranopia/protanopia safety (yellow vs teal-blue is distinguishable for all forms of
  red-green colorblindness).
- Background values for semi-transparent overlays use the effective blended color computed
  against the game's dark sky/background (#1a1a1a approximate dark).

## Touch Target Verification

All interactive elements verified ≥44×44px in styles.css:

- `#ui-root button`: `min-width: 44px; min-height: 44px` (line 28–29) — covers all default buttons
- `.install-cta`: `min-width: 44px; min-height: 44px` (line 255–256) — install CTA button
- `.title-settings-btn`: explicit `width: 44px; height: 44px` — cog button
- `.hud-pause-btn`: explicit `width: 44px; height: 44px` — pause button
- `.settings-close-btn`: explicit `width: 44px; height: 44px` — close button

## prefers-reduced-motion Coverage

All motion call sites in main.ts are gated by `prefersReducedMotion(storage)` check:

- `squashStretch(bird.mesh)` — gated (line ~104)
- `screenShake(camera)` — gated (line ~188)
- `particles.burst(...)` — gated (line ~190, same block as screenShake)

No ungated motion call sites found.

## Focus Ring

Updated focus-visible rule in styles.css:
- Before: `outline: 3px solid #f9c74f; outline-offset: 2px`
- After: `outline: 2px solid #ffd166; outline-offset: 2px` (per D-16)
- Added `[role="switch"]:focus-visible` rule for Toggle components
