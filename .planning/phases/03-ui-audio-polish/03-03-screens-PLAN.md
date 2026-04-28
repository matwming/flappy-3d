---
phase: 03-ui-audio-polish
plan: 03
type: execute
wave: 3
depends_on:
  - "03-02"
files_modified:
  - src/ui/screens/TitleScreen.tsx
  - src/ui/screens/HUD.tsx
  - src/ui/screens/PauseScreen.tsx
  - src/ui/screens/GameOverScreen.tsx
  - src/ui/screens/SettingsModal.tsx
  - src/ui/components/Button.tsx
  - src/ui/components/Toggle.tsx
  - src/ui/components/LeaderboardList.tsx
  - src/ui/components/NewBestBadge.tsx
  - src/ui/UIBridge.tsx
  - src/ui/styles.css
  - src/main.ts
autonomous: true
requirements:
  - HUD-02
  - HUD-03
  - HUD-04
  - HUD-05
  - HUD-06
  - HUD-07

must_haves:
  truths:
    - "Title, HUD, Pause, GameOver screens render based on actor state with <150ms CSS transitions (HUD-07)"
    - "TitleScreen shows top-3 leaderboard + tap-to-start CTA + settings button (HUD-02)"
    - "HUD shows score readable at 375px viewport with aria-live polite (HUD-03)"
    - "PauseScreen shows on actor.value==='paused'; Resume + Back-to-Title buttons (HUD-04)"
    - "GameOverScreen shows final score, PB with 'New best!' badge, restart CTA (HUD-05); replaces scheduleAutoRestart"
    - "SettingsModal toggles sound/music/reduce-motion/palette; persists via StorageManager.setSettings (HUD-06)"
---

<objective>
Build the 5 screens (Title, HUD, Pause, GameOver, Settings modal) and shared components (Button, Toggle, LeaderboardList, NewBestBadge) as Preact components mounted via UIBridge. Replace the Phase 2 scheduleAutoRestart auto-loop with a manual restart on tap. After this plan, the game has a full menu/HUD layer.
</objective>

<execution_context>
@/Users/ming/projects/flappy-3d/.planning/phases/03-ui-audio-polish/03-CONTEXT.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: Shared components (Button, Toggle, LeaderboardList, NewBestBadge)</name>
  <read_first>
    - 03-CONTEXT.md §D-16 through D-26 (screens + animations)
    - src/ui/styles.css (from 03-02 — has base button styles already)
  </read_first>
  <files>src/ui/components/Button.tsx, src/ui/components/Toggle.tsx, src/ui/components/LeaderboardList.tsx, src/ui/components/NewBestBadge.tsx</files>
  <action>
A) `Button.tsx` — wrapper that ensures min 44×44, defaults to type="button":
```tsx
import { h, JSX } from 'preact'
type Props = JSX.HTMLAttributes<HTMLButtonElement> & { children: any }
export function Button({ children, ...rest }: Props) {
  return h('button', { type: 'button', ...rest }, children)
}
```

B) `Toggle.tsx` — labeled switch with aria-pressed:
```tsx
import { h } from 'preact'
type Props = { label: string; checked: boolean; onChange: (v: boolean) => void }
export function Toggle({ label, checked, onChange }: Props) {
  return h(
    'button',
    {
      type: 'button',
      role: 'switch',
      'aria-pressed': String(checked),
      className: 'toggle' + (checked ? ' on' : ''),
      onClick: () => onChange(!checked),
    },
    h('span', { className: 'toggle-label' }, label),
    h('span', { className: 'toggle-track' }, h('span', { className: 'toggle-thumb' })),
  )
}
```
Add CSS rules to `styles.css`:
```css
.toggle { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:12px; }
.toggle-track { width:44px; height:24px; border-radius:12px; background:#cbd5e1; position:relative; transition:background 200ms }
.toggle.on .toggle-track { background:#22c55e }
.toggle-thumb { width:18px; height:18px; border-radius:9px; background:white; position:absolute; top:3px; left:3px; transition:left 200ms; box-shadow:0 1px 3px rgba(0,0,0,0.2) }
.toggle.on .toggle-thumb { left:23px }
```

C) `LeaderboardList.tsx` — top-N list, formats score + relative date:
```tsx
import { h } from 'preact'
import type { LeaderboardEntry } from '../../storage/StorageManager'
type Props = { entries: LeaderboardEntry[]; max?: number }
export function LeaderboardList({ entries, max = 5 }: Props) {
  if (entries.length === 0) return h('p', { className: 'leaderboard-empty' }, 'No scores yet — fly!')
  return h(
    'ol',
    { className: 'leaderboard' },
    entries.slice(0, max).map((e, i) =>
      h('li', { key: e.ts, className: 'leaderboard-item' },
        h('span', { className: 'rank' }, '#' + (i + 1)),
        h('span', { className: 'score' }, e.score),
      ),
    ),
  )
}
```

D) `NewBestBadge.tsx` — golden flash celebration (D-26):
```tsx
import { h } from 'preact'
export function NewBestBadge() {
  return h('div', { className: 'new-best-badge', role: 'status' }, '✨ New Best! ✨')
}
```
Add CSS:
```css
.new-best-badge {
  display:inline-block;
  padding:8px 20px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color:#451a03;
  border-radius:999px;
  font-weight:700;
  animation: goldFlash 1500ms ease-in-out infinite;
  box-shadow: 0 0 24px rgba(251, 191, 36, 0.6);
}
@keyframes goldFlash {
  0%, 100% { transform: scale(1); box-shadow: 0 0 16px rgba(251, 191, 36, 0.5); }
  50% { transform: scale(1.05); box-shadow: 0 0 32px rgba(251, 191, 36, 0.9); }
}
```
  </action>
  <acceptance_criteria>
    - All 4 components export named functions with Preact h() calls
    - Toggle has role="switch" + aria-pressed
    - LeaderboardList handles empty array gracefully
    - styles.css extended with toggle + leaderboard + badge styles
    - tsc clean
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Build all 5 screens</name>
  <read_first>
    - 03-CONTEXT.md §D-15 through D-21 (screen specs)
    - src/ui/components/* (just created)
  </read_first>
  <files>src/ui/screens/TitleScreen.tsx, src/ui/screens/HUD.tsx, src/ui/screens/PauseScreen.tsx, src/ui/screens/GameOverScreen.tsx, src/ui/screens/SettingsModal.tsx</files>
  <action>
For each screen, accept props for actor + audio + storage + state-derived data. Each screen returns `<div className="screen [active/inactive]">` per D-21.

**TitleScreen.tsx** (D-16):
- "FLAPPY 3D" big heading
- Top-3 leaderboard list
- "Tap anywhere to start" CTA pulsing animation
- Settings cog button (top-right)
- Click anywhere → actor.send({type:'START'})
- onClick on settings cog → setOpen(true) for SettingsModal

**HUD.tsx** (D-17):
- Score top-center, font-size: clamp(40px, 8vw, 96px), color: white with text-shadow
- aria-live="polite" on score element (HUD-03 + early A11Y-05)
- Pause button top-right (44×44)
- Apply `.score-pop` class for 280ms when score increments (CSS @keyframes — D-25)

**PauseScreen.tsx** (D-18):
- Semi-transparent dark backdrop (rgba(0,0,0,0.5))
- "Paused" heading
- "Resume" + "Back to Title" buttons
- ESC key → Resume (use useEffect + keydown listener)

**GameOverScreen.tsx** (D-19):
- "Game Over" heading
- Final score (huge)
- Personal best (smaller) with `<NewBestBadge />` if score > priorBest
- Top-5 leaderboard list
- "Tap to restart" CTA (any tap → actor.send({type:'RESTART'}))
- "Back to Title" button

**SettingsModal.tsx** (D-20):
- `<dialog>` element with .open attribute managed via useEffect
- 4 toggles: Sound, Music, Reduce Motion (3-way: Auto/On/Off), Palette (Default/Colorblind)
- X close button
- ESC closes modal (native dialog behavior)
- Each toggle calls storage.setSettings({...}) on change
- Reduce Motion settings change calls refreshReducedMotion(storage)

NOTE: Each screen reads context.score, context.bestScore from actor snapshot via props. Components are pure — they don't subscribe directly; the parent App component subscribes once and passes derived state down.
  </action>
  <acceptance_criteria>
    - All 5 screens exported as named functions
    - HUD score has `aria-live="polite"`
    - Pause + GameOver screens have ESC keydown listener
    - Settings modal uses `<dialog>` with toggles wired to storage.setSettings
    - GameOverScreen shows NewBestBadge conditionally
    - tsc clean
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Update UIBridge App + remove scheduleAutoRestart</name>
  <read_first>
    - src/ui/UIBridge.tsx (stub from 03-02)
    - All 5 screens just created
    - src/main.ts (current — has scheduleAutoRestart from Phase 2)
    - src/machine/gameMachine.ts (verify scheduleAutoRestart export — will be deprecated)
  </read_first>
  <files>src/ui/UIBridge.tsx, src/main.ts, src/machine/gameMachine.ts</files>
  <action>
A) Replace UIBridge stub App component with full screen routing:

```tsx
function App(props: { actor: GameActor; audio: AudioManager; storage: StorageManager }) {
  const [snap, setSnap] = useState<Snap>(props.actor.getSnapshot())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leaderboard, setLeaderboard] = useState(() => props.storage.getLeaderboard())
  const [priorBest, setPriorBest] = useState(() => props.storage.getBestScore())

  useEffect(() => {
    const sub = props.actor.subscribe((s) => {
      // When entering gameOver, push to leaderboard + capture priorBest BEFORE update
      if (s.value === 'gameOver' && (snap.value !== 'gameOver')) {
        const pb = props.storage.getBestScore()
        setPriorBest(pb)
        props.storage.pushLeaderboard(s.context.score)
        setLeaderboard(props.storage.getLeaderboard())
      }
      setSnap(s)
    })
    return () => sub.unsubscribe()
  }, [])

  const value = snap.value as string

  return h(
    'div',
    null,
    h(TitleScreen, { active: value === 'title', actor: props.actor, leaderboard, onSettings: () => setSettingsOpen(true) }),
    h(HUD, { active: value === 'playing' || value === 'dying', actor: props.actor, score: snap.context.score, onPause: () => props.actor.send({ type: 'PAUSE' }) }),
    h(PauseScreen, { active: value === 'paused', actor: props.actor }),
    h(GameOverScreen, { active: value === 'gameOver', actor: props.actor, score: snap.context.score, priorBest, leaderboard }),
    settingsOpen && h(SettingsModal, { storage: props.storage, audio: props.audio, onClose: () => setSettingsOpen(false) }),
  )
}
```

B) Update `src/main.ts`:
- Import UIBridge (already done in 03-02)
- REMOVE the `scheduleAutoRestart(actor)` call (D-19 — GameOverScreen handles restart now)
- Optional: keep scheduleAutoRestart export in gameMachine.ts for now (deprecated but not deleted) — or delete if unused.

C) Mark `scheduleAutoRestart` in `src/machine/gameMachine.ts` as deprecated or remove if it's no longer imported anywhere. Run `grep -rn "scheduleAutoRestart" src/` to confirm.

D) tsc clean + npm run build.

E) Browser verify (manual, after task complete):
- Open localhost:5173
- See Title screen with leaderboard
- Tap → playing
- See HUD with score
- Hit pipe → game over screen with restart CTA
- Tap restart → playing again (no auto-loop)
- Open settings → toggles work and persist (refresh page to verify)
  </action>
  <acceptance_criteria>
    - UIBridge.tsx renders 5 screens conditionally based on snap.value
    - main.ts no longer calls scheduleAutoRestart
    - GameOverScreen tap → actor.send({type:'RESTART'}) → playing
    - tsc clean; npm run build green
  </acceptance_criteria>
</task>

</tasks>

<success_criteria>
- HUD-02 ✓ — TitleScreen with leaderboard + tap-start
- HUD-03 ✓ — In-game HUD with aria-live score
- HUD-04 ✓ — Pause screen on actor pause; Resume/Back-to-Title
- HUD-05 ✓ — GameOver screen with score + PB + NewBest + restart
- HUD-06 ✓ — Settings modal with 4 toggles persisted
- HUD-07 ✓ — Screen transitions <150ms via CSS opacity transition
</success_criteria>

<output>
`.planning/phases/03-ui-audio-polish/03-03-SUMMARY.md`. Atomic commit: `feat(03-03): all 5 screens (Preact) + restart-via-tap`.
</output>
