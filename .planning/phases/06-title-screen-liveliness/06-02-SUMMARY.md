---
phase: "06-title-screen-liveliness"
plan: "02"
subsystem: "ui/animation"
tags: [gsap, css-animation, a11y, preact, reduced-motion]
dependency_graph:
  requires: ["06-01"]
  provides: ["BEAUTY-03", "BEAUTY-04"]
  affects: ["src/ui/screens/TitleScreen.tsx", "src/ui/styles.css"]
tech_stack:
  added: []
  patterns: ["GSAP from() tween with stagger", "one-shot useRef guard", "CSS @keyframes + JS double-gate for reduced-motion"]
key_files:
  created: []
  modified:
    - src/ui/screens/TitleScreen.tsx
    - src/ui/styles.css
decisions:
  - "Used gsap.from() (not timeline) — simpler for a single stagger sequence with no sequenced stages"
  - "reducedMotion derived from window.matchMedia at render time (synchronous read, no side effects)"
  - "logoLetters constant moved to module scope (stable array, no need to re-compute per render)"
  - "CTA pulse uses CSS-only approach (class toggle + media query) — no storage prop threading needed"
  - "clearProps: 'opacity,transform' ensures GSAP leaves no inline styles after animation completes"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-29"
  tasks: 2
  files_modified: 2
---

# Phase 06 Plan 02: Logo Letter-Stagger + CTA Pulse Summary

**One-liner:** GSAP per-character stagger entrance for FLAPPY 3D logo (one-shot, reduced-motion aware) and CSS ctaPulse at 1.6s with double-gate motion suppression.

---

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Logo letter-stagger entrance via GSAP timeline (BEAUTY-03) | 00867f8 | src/ui/screens/TitleScreen.tsx |
| 2 | CTA opacity pulse at 1.6s with reduced-motion gate (BEAUTY-04) | 1cdcccc | src/ui/styles.css, src/ui/screens/TitleScreen.tsx |

---

## What Was Built

### Task 1 — Logo Letter-Stagger (BEAUTY-03)

- "FLAPPY 3D" h1 is now rendered as 9 individual `<span class="title-letter">` elements (space character included as non-breaking space).
- `gsap.from(spans, { opacity: 0, y: 10, duration: 0.35, stagger: 0.05, ease: 'power2.out', clearProps: 'opacity,transform' })` animates letters left-to-right on first mount.
- `hasAnimated = useRef(false)` one-shot guard: animation fires only once per page session. Back-to-title navigation (gameOver → title) shows the logo already fully visible.
- `window.matchMedia('(prefers-reduced-motion: reduce)').matches` check at effect time: if OS prefers reduced motion, the tween is skipped entirely and all letters are immediately visible at natural opacity.
- `clearProps: 'opacity,transform'` removes GSAP inline styles after tween completes, returning elements to pure CSS control.

### Task 2 — CTA Pulse (BEAUTY-04)

- Moved `animation` from `.title-cta` base class to `.title-cta.pulse` selector. The base class is animation-free; pulse is opt-in.
- Duration updated from 2s to 1.6s (`animation: ctaPulse 1.6s ease-in-out infinite`).
- `@keyframes ctaPulse` kept with `0%, 100% { opacity: 0.6 } 50% { opacity: 1 }` pattern (cleaner cycle than `alternate`).
- `@media (prefers-reduced-motion: reduce) { .title-cta.pulse { animation: none; opacity: 0.85 } }` — CSS layer suppression.
- `const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches` in component body gates the `.pulse` class at JS level — double protection.

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Verification Results

```
tsc --noEmit:          exit 0 (clean)
npm run build:         exit 0 (clean)
bundle (gzip):         196.78 KB (budget: ≤250 KB)
grep useRef|hasAnimated TitleScreen.tsx:  4 hits
grep gsap.from|stagger: TitleScreen.tsx:  2 hits
grep title-letter TitleScreen.tsx:        2 hits
grep clearProps TitleScreen.tsx:          1 hit
grep 1.6s|ctaPulse styles.css:            2 hits
grep prefers-reduced-motion styles.css:   1 hit
grep pulse|reducedMotion TitleScreen.tsx: 2 hits
```

---

## Known Stubs

None.

---

## Threat Flags

None — all STRIDE threats from plan's threat model were addressed:
- T-06-04: `clearProps: 'opacity,transform'` applied; GSAP auto-cleans orphaned tweens on DOM removal.
- T-06-05: Accepted — hasAnimated ref resets on full page reload (desired behavior).
- T-06-06: Accepted — window.matchMedia is a read-only OS preference query with no PII or side effects.

## Self-Check: PASSED

- src/ui/screens/TitleScreen.tsx: FOUND
- src/ui/styles.css: FOUND
- Commit 00867f8: verified in git log
- Commit 1cdcccc: verified in git log
