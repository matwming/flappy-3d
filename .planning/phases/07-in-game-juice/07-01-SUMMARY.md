---
phase: 07-in-game-juice
plan: "01"
subsystem: ui
tags: [three.js, particles, dom-pool, css-animation, motion-gate, preact]

requires:
  - phase: 06-title-screen-liveliness
    provides: UIBridge mount pattern, prefersReducedMotion gate, ParticleEmitter for death burst

provides:
  - ScorePopupPool (6-div DOM pool) in UIBridge with world-to-screen projection
  - spawnScorePopup() and triggerMilestoneFlash() public methods on UIBridge
  - burstTinted(origin, color) method on ParticleEmitter and ParticleSystemAdapter interface
  - @keyframes scorePopup + .milestone-flash CSS in styles.css
  - MILESTONE_SCORES (10/25/50) + firedMilestones Set wired in main.ts actor.subscribe

affects: [07-02-pipe-color-flap-trail, future-beauty-polish]

tech-stack:
  added: []
  patterns:
    - DOM pool pattern (pre-allocate 6 divs, reuse via animating class flag, animationend listener returns to pool)
    - World-to-screen projection via Vector3.project(camera) then NDC-to-CSS-pixel mapping
    - One-shot milestone tracking per round via firedMilestones Set, cleared on roundStarted

key-files:
  created: []
  modified:
    - src/particles/ParticleEmitter.ts
    - src/particles/createParticles.ts
    - src/ui/UIBridge.tsx
    - src/ui/styles.css
    - src/main.ts

key-decisions:
  - "ScorePopupPool uses pool.find(!animating) to avoid GC; max 6 simultaneous popups, extras dropped"
  - "burstTinted sets mat.color.setHex before calling burst(); both death+milestone use gold 0xffd166 so setHex is explicit API not a no-op in future"
  - "createParticles now returns explicit adapter object instead of bare ParticleEmitter so burstTinted is type-safe through the ParticleSystemAdapter interface"
  - "milestoneFlash uses CSS class toggle + setTimeout(200ms) rather than CSS transition end event for simplicity"
  - "camera passed as optional 5th arg to UIBridge constructor; null-checked in spawnScorePopup so no throw if camera not provided"

patterns-established:
  - "DOM pool pattern: pre-warm N divs at mount, reuse via CSS class sentinel, animationend returns to pool"
  - "World-to-screen: Vector3.project(camera) + NDC offset formula (x+1)/2 * width, (-y+1)/2 * height"
  - "Per-round one-shot: Set<number> + .clear() on roundStarted pattern for milestone/event tracking"

requirements-completed: [BEAUTY-05, BEAUTY-07]

duration: 6min
completed: "2026-04-29"
---

# Phase 7 Plan 01: +1 Popup + Milestone Celebrations Summary

**DOM pool of 6 +1 popups projected via Vector3.project(camera) + gold particle burst + screen flash at score milestones 10/25/50, all gated behind prefersReducedMotion**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-29T12:10:44Z
- **Completed:** 2026-04-29T12:16:46Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- ParticleEmitter.burstTinted(origin, color) added — sets material color and delegates to existing burst(); createParticles adapter interface extended with burstTinted
- ScorePopupPool class in UIBridge: 6 pre-allocated divs, Vector3.project(camera) for world-to-screen, CSS @keyframes scorePopup (translateY -70px + opacity 0 over 700ms), animationend returns div to pool
- main.ts wired: MILESTONE_SCORES Set (10/25/50), firedMilestones per-round tracking, spawnScorePopup + burstTinted + triggerMilestoneFlash all gated behind prefersReducedMotion(storage)

## Task Commits

1. **Task 1: ParticleEmitter.burstTinted + createParticles adapter extension** - `3361109` (feat)
2. **Task 2: +1 popup pool in UIBridge + milestone flash CSS + @keyframes scorePopup** - `c83b031` (feat)
3. **Task 3: Wire popup + milestone in main.ts** - `01214bf` (feat)

## Files Created/Modified

- `src/particles/ParticleEmitter.ts` — added burstTinted(origin, color) method
- `src/particles/createParticles.ts` — extended ParticleSystemAdapter interface; refactored to explicit adapter object
- `src/ui/UIBridge.tsx` — added ScorePopupPool class, camera field, spawnScorePopup(), triggerMilestoneFlash(); updated constructor and mount()
- `src/ui/styles.css` — added @keyframes scorePopup, .score-popup/.score-popup.animating, .milestone-flash/.milestone-flash.active
- `src/main.ts` — added MILESTONE_SCORES, firedMilestones, camera arg to UIBridge, popup+milestone wiring in actor.subscribe, firedMilestones.clear() in roundStarted

## Decisions Made

- Used `pool.find(d => !d.classList.contains('animating'))` as the pool availability sentinel — simple, no extra state
- burstTinted keeps mat.color.setHex even though both effects use the same gold 0xffd166, making the API explicit for future color changes
- createParticles now returns an explicit adapter object (was returning bare ParticleEmitter); this makes the interface concrete and type-safe
- Milestone flash uses `setTimeout(200ms)` to remove 'active' class rather than transitionend listener — simpler and reliable
- camera passed as optional 5th arg to UIBridge to avoid breaking existing construction sites that don't have camera

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 07-01 complete; 07-02 (flap trail + pipe color cycling) can proceed in wave 2
- Both spawnScorePopup and triggerMilestoneFlash are public on UIBridge; no further interface changes needed from 07-02
- Bundle at 195.81KB gzip (budget: 250KB); 54KB headroom remains for 07-02

---
*Phase: 07-in-game-juice*
*Completed: 2026-04-29*
