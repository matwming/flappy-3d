# Feature Research

**Domain:** Single-player endless 3D Flappy Bird-style web game (Three.js, PWA, mobile-first)
**Researched:** 2026-04-28
**Confidence:** HIGH (table stakes verified across multiple reference games; differentiators from established juice/polish literature)
**Scope lock:** Endless mode only, local leaderboard, solo play — per PROJECT.md

---

## Reference Games

| Game | Why Referenced | Live URL |
|------|---------------|----------|
| Original Flappy Bird (2013) | Canonical genre baseline — medal system, game-over screen, tap-to-flap | https://flappybird.io |
| Crossy Road (web) | Polished endless-arcade gold standard — character roster, sound design, game-over flow | https://www.crossyroad.com |
| PolyTrack | Top-rated Three.js browser game — low-poly aesthetic, performance, immediate playability | https://kodub.itch.io/polytrack |
| Vampire Survivors (web/Steam) | Best-in-class minimalist HUD, "juicy" cascade feedback, restartable in seconds | https://store.steampowered.com/app/1794680 |
| Subway Surfers Web | Mobile infinite-runner table stakes — onboarding, controls, responsive layout | https://subwaysurf.io |

---

## Table Stakes

Features users assume exist. Missing one = product feels broken or amateur.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Tap/click/spacebar flap input** | Core mechanic; keyboard AND touch must both work from frame 1 | SMALL | None | Pointer events + keydown; no separate code paths needed |
| **Live score counter (HUD)** | Players expect instant feedback on progress; missing = confusion | SMALL | DOM overlay layer | Top-center, large enough to read at a glance on 375px wide screens |
| **Personal best (high score) display** | Players compare runs; missing = no retention loop | SMALL | localStorage | Show on HUD and game-over screen; persist across sessions |
| **Game-over screen** | Without it users don't know if game crashed or they died | SMALL | State machine (GameOver state) | Must show: final score, personal best, "new best" indicator, restart CTA |
| **Restart without reload** | Fundamental to the infinite-runner loop; reload-to-restart = fatal churn | SMALL | State machine | Tap/space anywhere on game-over → back to Playing state within 1s |
| **Title / start screen** | Orients new players; shows controls; provides re-entry point after leaving | SMALL | State machine (Title state) | Minimal: logo, "tap to start", best score |
| **Sound on/off toggle** | Users in public spaces mute immediately; missing = auto-churned | SMALL | Settings overlay, localStorage | Persisted across sessions; icon button on HUD always visible |
| **Background music** | Silence = dead-feeling; casual players expect ambient audio loop | MEDIUM | Audio system, sound toggle | Recorded loop, not synthesized oscillators (already in PROJECT.md) |
| **SFX: flap, score, death** | Audio feedback confirms every meaningful action | SMALL | Audio system | Flap (wing beat), point (ding), death (thud/crunch); volume separate from music |
| **Responsive layout (mobile-first)** | Most plays are on phone; if it doesn't fit — no plays | MEDIUM | CSS/canvas sizing | Portrait lock on mobile, landscape on desktop; 375px minimum width |
| **60fps on mid-tier mobile** | Drops below 30fps = unplayable; frame drops = unfair deaths | LARGE | Three.js scene budget, draw calls | Perf budget already in PROJECT.md; iPhone 12 / Pixel 6 class target |
| **PWA installable (manifest + service worker)** | Users on mobile expect "Add to Home Screen"; offline play expected post-install | MEDIUM | Service worker, web manifest | Lighthouse PWA ≥ 90 already in PROJECT.md |
| **Offline play** | Once installed, must work on plane/subway; offline failure destroys PWA trust | MEDIUM | Service worker (cache-first) | Cache all JS, CSS, audio assets; no network requests during play |
| **Splash screen / loading indicator** | Cold-load on 3G shows nothing for 2-3s without it; looks broken | SMALL | PWA manifest, HTML | Auto-generated from manifest icon + theme color; add CSS skeleton for <3s loads |
| **Prefers-reduced-motion respected** | Users with vestibular disorders get motion sick; legal/ethical table stakes in 2026 | SMALL | Settings, CSS media query | Check `prefers-reduced-motion: reduce` — disable screen shake, reduce parallax |
| **Colorblind-safe default palette** | ~8% of males have color vision deficiency; pipes vs background must be distinguishable without color | SMALL | Material/shader system | Use shape + luminance contrast as primary differentiators; offer palette toggle |
| **Local leaderboard (top-N scores)** | Players expect to see their run history; missing = no progression sense | SMALL | localStorage | Top 5–10 runs with score + date; shown on game-over screen and title; no account required |

---

## Differentiators

Features that separate a polished, memorable game from a competent clone. Prioritized for our specific gap vs. flappy-anna-3d baseline.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Screen shake on death** | Visceral death feedback; industry standard "juice" move | SMALL | Camera rig, reduced-motion check | 0.2–0.3s, eased decay, skip if reduced-motion enabled |
| **Squash & stretch on flap** | Bird feels alive and physical; cheap to implement, huge feel delta | SMALL | Tween/spring lib (GSAP or custom) | Scale Y compress on flap, elongate at apex; ~80ms cycle |
| **Particle burst on death** | Visual payoff for losing; satisfying not punishing | SMALL | Three.js Points / BufferGeometry | 20–40 particles, 0.5s lifetime, match bird color palette |
| **Score pop animation** | "1… 2… 3…" feel as you thread pipes; rewards skill in the moment | SMALL | DOM overlay layer | Brief scale pulse on score digit each point; CSS animation, no JS frame cost |
| **"New best!" celebration** | Moment of triumph when PB broken; drives replay | SMALL | Score comparison logic, DOM overlay | Distinct animation (golden flash, text pulse) on game-over when new PB set |
| **Smooth pipe spawning + gap difficulty ramp** | Difficulty progression keeps expert players engaged beyond 10 runs | MEDIUM | Game loop, difficulty state | Gap narrows and speed increases gradually; plateau after score ~40 to keep it winnable |
| **Dynamic difficulty adjustment (DDA) — basic** | Prevents early-churn (too hard) and expert-boredom (too easy); researched to increase replay | MEDIUM | Score tracking, game loop | Simple: widen gap for first 5 pipes, then tighten gradually. No ML needed. |
| **Cel-shaded / toon materials** | Distinctive aesthetic vs. flat 2D Flappy clones; references baseline's Zelda-anime direction | MEDIUM | Three.js custom ShaderMaterial / MeshToonMaterial | Already the planned aesthetic; differentiates from every Pixi.js/2D clone |
| **Post-processing (bloom + vignette)** | Depth and atmosphere; makes screenshot-worthy | MEDIUM | Three.js EffectComposer (tree-shaken) | Bloom on bright materials (pipe rims, bird), subtle vignette; desktop-only or reduced on mobile |
| **Haptic feedback on flap + death** | Native-app feel on Android; subtle, not annoying | SMALL | Vibration API | Android Chrome only (iOS Safari does not support); graceful no-op on iOS |
| **DOM overlay menu system** | Real menus (title/settings/game-over) vs. baseline's total absence | MEDIUM | xstate state machine | HTML+CSS over canvas; pointer-events: none when playing; baseline has zero menus |
| **Settings panel: SFX volume, music volume, reduced motion, palette** | Customization = ownership; players who customise stay longer | SMALL | localStorage, DOM overlay | Four controls max; persist immediately on change |
| **Animated parallax background layers** | Depth cue that 2D clones can't match; reinforces 3D differentiation | MEDIUM | Three.js scene, reduced-motion check | 2–3 depth layers (near/mid/far) moving at different speeds |
| **Ambient idle animation (bird bobbing on title)** | Polish signal within 3 seconds of load; instant "this is different" cue | SMALL | Spring/tween lib | Bird floats/pulses on title screen before game starts |
| **Share score (navigator.share / clipboard fallback)** | Low-cost social hook; "I got 47!" posts; fits solo-play scope | SMALL | navigator.share API | One button on game-over screen; formats "I scored X in [game name]"; clipboard fallback for desktop |

---

## Anti-Features

Explicitly excluded for v1 with rationale.

| Anti-Feature | Why It Seems Attractive | Why We're Not Building It | What We Do Instead |
|-------------|------------------------|--------------------------|-------------------|
| **Global leaderboard / accounts** | Social pressure, bragging | Backend infra, auth, privacy; zero-backend is a constraint; no traction to justify yet | Local leaderboard + share-my-score button |
| **Ads / interstitials** | Monetization | Destroys casual game feel; hostile to PWA UX; our goal is craft, not monetization v1 | None; ship a beloved game first |
| **IAP / premium unlocks** | Monetization, cosmetics hook | Store APIs don't exist for PWA; massive scope; no payment infra | Explore post-traction |
| **Character / skin selection UI** | Customization = engagement | Medium-large scope; requires art assets; delays core loop polish | Single bird, evolve aesthetic through shaders |
| **Time-attack / daily seed / hardcore modes** | Variety | Out of scope per PROJECT.md; endless only for v1 | Add post-launch as content drop |
| **Multiplayer / rivals mode** | Modern Flappy 2024 has it | Single-dev v1; no realtime infra; doesn't serve core value | Not revisited until v2+ with traction |
| **Tutorial overlay with arrows** | First-time onboarding | Flappy Bird genre is self-teaching; "tap to start" IS the tutorial | "Tap to flap" text on title screen; physics are immediately obvious |
| **Haptics on iOS** | Native feel | Vibration API not supported on Safari/iOS; polyfills are unreliable | Android haptics only; silent no-op on iOS |
| **User-generated content / level editor** | Longevity | Massive scope; conflicts with hand-crafted aesthetic goal | Procedural generation with tuned seeds |
| **Push notifications** | Re-engagement | Hostile in casual games; users revoke permissions; PWA permission fatigue | None |
| **Analytics / tracking** | Understand usage | Privacy concerns, GDPR; zero-backend constraint; solo dev doesn't need dashboards v1 | None |
| **AI-generated art** | Speed | Out of scope per PROJECT.md; hand-crafted is the differentiation | Procedural + minimal modeled assets |

---

## Feature Dependencies

```
State machine (xstate: Title / Playing / Paused / GameOver)
    ├── requires──> DOM overlay layer (HTML/CSS menu system)
    │                   ├── requires──> Title screen
    │                   ├── requires──> Game-over screen
    │                   │                   ├── enhances──> Local leaderboard
    │                   │                   ├── enhances──> "New best!" celebration
    │                   │                   └── enhances──> Share score button
    │                   └── requires──> Settings panel
    │                                       ├── enhances──> Sound on/off toggle
    │                                       ├── enhances──> Reduced-motion toggle
    │                                       └── enhances──> Palette toggle
    └── requires──> Restart-without-reload

Audio system (Web Audio API)
    ├── requires──> Sound on/off toggle (gate all sounds)
    ├── requires──> User gesture unlock (autoplay policy — first tap starts AudioContext)
    └── requires──> Service worker (cache audio assets for offline)
    
Local leaderboard
    └── requires──> localStorage (score + date serialization)

Screen shake + particles (death juice)
    └── requires──> Reduced-motion check (skip if prefers-reduced-motion)

Post-processing (EffectComposer)
    └── enhances──> Cel-shaded materials (bloom targets emissive elements)
    └── conflicts──> Mobile perf budget (must disable or reduce on mid-tier phones)

PWA (installable + offline)
    ├── requires──> Web manifest (name, icons, theme color, display: standalone)
    ├── requires──> Service worker (cache-first for all assets)
    └── requires──> HTTPS serving

Haptic feedback
    └── requires──> User gesture (vibration API requires activation)
    └── conflicts──> iOS Safari (no-op; Vibration API unsupported)
```

### Dependency Notes

- **State machine is the load-bearing dependency**: title screen, game-over screen, pause, and restart all flow through it. Must be built in Phase 1 alongside core loop — not retrofitted.
- **DOM overlay layer is a prerequisite for all menu features**: settings, leaderboard, game-over screen, and share button all live in the same HTML layer over the canvas. Build once, use everywhere.
- **Audio system needs user gesture unlock on first interaction**: Web Audio API `AudioContext` must be created or resumed inside a tap/click handler. Handle this in the "tap to start" action — not on load.
- **Post-processing conflicts with mobile perf budget**: EffectComposer adds a full render pass. Disable bloom on devices that fail a perf probe (e.g., `navigator.hardwareConcurrency < 4` heuristic), or reduce resolution.
- **Service worker must cache audio**: offline play breaks silently if audio assets are network-only. Cache-first strategy required for all static assets.
- **Reduced-motion must gate**: screen shake AND parallax background AND squash/stretch should all check `window.matchMedia('(prefers-reduced-motion: reduce)')` and the stored settings override.

---

## MVP Definition (v1 Launch)

### Must Ship (Table Stakes + Core Differentiators)

- [ ] Tap/click/spacebar flap input — without this there is no game
- [ ] Live score counter on HUD — players need to know their score
- [ ] Personal best persisted to localStorage — closes the loop
- [ ] Game-over screen (score + PB + restart CTA) — required for retry loop
- [ ] Restart-without-reload — fundamental to infinite runner
- [ ] Title screen with "tap to start" — orients players
- [ ] Sound on/off toggle (persisted) — public-space mute
- [ ] Background music + SFX (flap/score/death) — recorded audio
- [ ] Responsive layout, portrait-locked mobile — mobile-first
- [ ] 60fps on mid-tier mobile — non-negotiable perf target
- [ ] PWA manifest + service worker (offline, installable) — stated goal
- [ ] Prefers-reduced-motion respected — table stakes accessibility in 2026
- [ ] Colorblind-safe default palette — table stakes accessibility
- [ ] Local leaderboard (top-5 in localStorage) — retention loop
- [ ] Screen shake on death — single highest-ROI juice feature
- [ ] Squash & stretch on flap — cheap, massive feel delta
- [ ] Particle burst on death — polish signal
- [ ] Score pop animation — immediate feedback on point
- [ ] Cel-shaded / toon materials — aesthetic differentiation
- [ ] Smooth difficulty ramp — keeps players past run 3

### Add Post-Launch (v1.x — once core loop is validated)

- [ ] "New best!" celebration animation — nice but doesn't block launch
- [ ] Share score button — low-code, adds social reach
- [ ] Settings panel (full: SFX vol, music vol, motion, palette) — can ship with toggle-only first
- [ ] Haptic feedback (Android) — enhancement, not core
- [ ] Post-processing bloom + vignette — desktop enhancement, mobile may skip
- [ ] Parallax background layers — visual depth enhancement
- [ ] Animated idle bird on title screen — polish signal

### Future Consideration (v2+)

- [ ] Dynamic difficulty adjustment (DDA) — requires telemetry to tune; basic ramp sufficient for v1
- [ ] Additional game modes (time-attack, daily seed) — out of scope per PROJECT.md
- [ ] Global leaderboard — requires backend; revisit on traction
- [ ] Character/skin selection — art scope; separate project
- [ ] Multiplayer — separate project

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Core flap input | HIGH | LOW | P1 |
| Live score HUD | HIGH | LOW | P1 |
| Game-over screen + restart | HIGH | LOW | P1 |
| Personal best (localStorage) | HIGH | LOW | P1 |
| Sound on/off toggle | HIGH | LOW | P1 |
| Background music + SFX | HIGH | MEDIUM | P1 |
| Responsive layout | HIGH | MEDIUM | P1 |
| 60fps mobile perf | HIGH | HIGH | P1 |
| PWA (manifest + SW) | HIGH | MEDIUM | P1 |
| Prefers-reduced-motion | MEDIUM | LOW | P1 |
| Colorblind-safe palette | MEDIUM | LOW | P1 |
| Local leaderboard | HIGH | LOW | P1 |
| Screen shake on death | HIGH | LOW | P1 |
| Squash & stretch flap | HIGH | LOW | P1 |
| Particle burst death | MEDIUM | LOW | P1 |
| Score pop animation | MEDIUM | LOW | P1 |
| Cel-shaded materials | HIGH | MEDIUM | P1 |
| Difficulty ramp | HIGH | MEDIUM | P1 |
| "New best!" celebration | MEDIUM | LOW | P2 |
| Share score button | LOW | LOW | P2 |
| Settings panel (full) | MEDIUM | SMALL | P2 |
| Haptic feedback (Android) | LOW | LOW | P2 |
| Post-processing (desktop) | MEDIUM | MEDIUM | P2 |
| Parallax background layers | MEDIUM | MEDIUM | P2 |
| Animated idle title | LOW | LOW | P2 |
| DDA (full) | MEDIUM | MEDIUM | P3 |

---

## Accessibility Table Stakes (2026)

Accessibility is not a checkbox — these three are now expected in any shipped web game:

| Feature | Standard | Implementation | Complexity |
|---------|----------|---------------|------------|
| **Prefers-reduced-motion** | CSS media query + settings override | Disable screen shake, parallax; reduce squash/stretch to scale-only | SMALL |
| **Colorblind-safe palette** | WCAG 2.1 contrast + shape/luminance differentiation | Pipes and background must differ by luminance, not just hue; offer deuteranopia/protanopia toggle | SMALL |
| **Keyboard accessibility** | All inputs accessible via keyboard | Spacebar = flap; P = pause; R = restart on game-over; Enter = confirm | SMALL |
| **Large touch targets** | WCAG 2.5.5 (44×44px minimum) | All HUD buttons ≥ 48px; settings panel items ≥ 48px tap area | SMALL |
| **No audio autoplay** | Web Audio autoplay policy | AudioContext started on first user gesture; music starts on "tap to start" | SMALL |

**Key pitfall:** Keyboard remapping is NOT table stakes for a single-button casual game (it's table stakes for complex action games). Spacebar-to-flap is already the universal convention — hardcoded is fine.

---

## Competitor Feature Analysis

| Feature | Flappy Bird (original) | Crossy Road | Our Approach |
|---------|----------------------|-------------|--------------|
| Score display | Top-center, white number | Top-center, large font | Same convention; animated pulse on point |
| Game-over screen | Score + medal + best score + share + ok | Score + character unlock prompt + play again | Score + local leaderboard rank + "new best!" + restart + share |
| Medal system | Bronze/silver/gold/platinum at 10/20/30/40 | None | Skip medals v1 — local leaderboard is cleaner; revisit as v1.x |
| Audio | Synthesized (simple oscillator) | Polished SFX, no bg music | Recorded SFX + ambient music loop |
| Settings | None | Character shop (cosmetics) | Settings panel: sound/music/motion/palette |
| Tutorial | "Get ready" screen | None | "Tap to flap" text on title screen |
| Death feedback | Flash + game over text | Flat sprite flip | Screen shake + particle burst + squash/stretch |
| Difficulty | Fixed throughout | Fixed throughout | Gradual ramp (gap width + speed) |
| PWA | No | No (native app only) | Yes — key differentiator |
| Keyboard support | No | No (mobile-first) | Yes (spacebar + P + R) |
| Accessibility | None | None | Reduced-motion + colorblind palette + keyboard |

---

## Sources

- Flappy Bird medal/UX design: [Flappy Bird Wikipedia](https://en.wikipedia.org/wiki/Flappy_Bird), [Medal system breakdown](https://writerparty.com/party/flappy-bird-how-to-get-the-bronze-silver-gold-and-platinum-medals/)
- Game juice / polish principles: [Making a Game Feel Juicy — itch.io blog](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects), [Blood Moon Interactive — Juice in Game Design](https://www.bloodmooninteractive.com/articles/juice.html), [Camera Shake — Medium](https://gt3000.medium.com/juice-it-adding-camera-shake-to-your-game-e63e1a16f0a6)
- Game UX table stakes: [Game-Ace Complete Game UX Guide 2025](https://game-ace.com/blog/the-complete-game-ux-guide/), [UX Planet Game Design Best Practices](https://uxplanet.org/game-design-ux-best-practices-guide-4a3078c32099)
- PWA for games: [Web Game Dev — PWA guide](https://www.webgamedev.com/publishing/pwa), [MDN PWA installable guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [web.dev PWA installation prompt](https://web.dev/learn/pwa/installation-prompt/)
- Accessibility in games 2025: [Can I Play That — colorblind modes](https://caniplaythat.com/2025/09/10/peak-accessibility-updates-continue-with-new-colorblind-mode/), [Accessibly — video game accessibility](https://accessiblyapp.com/blog/video-game-accessibility/), [GameSpace — accessibility in modern game design](https://gamespace.com/all-articles/news/how-new-accessibility-features-are-changing-modern-game-design/)
- Haptics: [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API), [Prototyp — PWA audio playback](https://blog.prototyp.digital/what-we-learned-about-pwas-and-audio-playback/)
- Dynamic difficulty: [MDPI — DDA Methods](https://www.mdpi.com/2813-2084/3/2/12), [Hyper-casual DDA research](https://www.researchgate.net/publication/352145656_Hyper-Casual_Endless_Game_Based_Dynamic_Difficulty_Adjustment_System_For_Players_Replay_Ability)
- Three.js game references: [PolyTrack on itch.io](https://kodub.itch.io/polytrack), [Three.js games on itch.io](https://itch.io/games/made-with-threejs)
- Game UI reference database: [Game UI Database — Failure & Game Over](https://www.gameuidatabase.com/index.php?scrn=51&set=1&plat=1)

---

*Feature research for: Flappy 3D (polished Three.js PWA)*
*Researched: 2026-04-28*
