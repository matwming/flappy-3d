---
phase: 03-ui-audio-polish
plan: 05
type: execute
wave: 1
depends_on: []
files_modified:
  - src/ui/UIBridge.tsx
  - src/ui/screens/SettingsModal.tsx
  - src/ui/styles.css
autonomous: true
gap_closure: true
requirements_addressed:
  - HUD-05
  - HUD-06
  - HUD-07
  - ANIM-06

must_haves:
  truths:
    - "NewBestBadge renders gold-flashing when the player achieves a score higher than their previous best"
    - "SettingsModal Reduce Motion toggle shows OFF when OS motion is allowed and setting is 'auto'"
    - "Screen opacity transitions complete in <150ms (120ms)"
  artifacts:
    - path: "src/ui/UIBridge.tsx"
      provides: "priorBest captured from ref on START/RESTART, not from storage at gameOver"
      contains: "priorBestRef"
    - path: "src/ui/screens/SettingsModal.tsx"
      provides: "reduceMotionOn uses matchMedia for 'auto' mode"
      contains: "matchMedia"
    - path: "src/ui/styles.css"
      provides: "opacity transition declarations at 120ms"
      contains: "120ms"
  key_links:
    - from: "src/ui/UIBridge.tsx"
      to: "GameOverScreen"
      via: "priorBest prop"
      pattern: "priorBestRef\\.current"
    - from: "src/ui/screens/SettingsModal.tsx"
      to: "window.matchMedia"
      via: "reduceMotionOn computation"
      pattern: "matchMedia.*prefers-reduced-motion"
---

<objective>
Fix three UI correctness gaps identified in 03-VERIFICATION.md: (1) UIBridge priorBest race condition that causes NewBestBadge to never show, (2) SettingsModal reduce-motion toggle showing ON when OS motion is allowed, and (3) screen opacity transitions that exceed the <150ms HUD-07 requirement.

Purpose: Unblock HUD-05, HUD-06, HUD-07, and ANIM-06 — all currently "BLOCKED" in requirements coverage.
Output: UIBridge.tsx, SettingsModal.tsx, styles.css each with targeted surgical edits.
</objective>

<execution_context>
@/Users/ming/.claude/get-shit-done/workflows/execute-plan.md
@/Users/ming/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ming/projects/flappy-3d/.planning/PROJECT.md
@/Users/ming/projects/flappy-3d/.planning/ROADMAP.md
@/Users/ming/projects/flappy-3d/.planning/STATE.md
@/Users/ming/projects/flappy-3d/CLAUDE.md

<!-- Key interfaces the executor needs — extracted from codebase -->
<interfaces>
From src/ui/UIBridge.tsx (current — full file already read):

The App function component currently:
- Line 55: `const [priorBest, setPriorBest] = useState<number>(() => props.storage.getBestScore())`
- Line 62-67: On gameOver entry: `const pb = props.storage.getBestScore()` — BUG: this reads the already-updated best score
- `prevValue` is a `let` local inside `useEffect(() => { ... }, [])` — correct pattern

Target fix: Add a `useRef` that captures the pre-game best score on START/RESTART:
```typescript
const priorBestRef = useRef<number>(props.storage.getBestScore())
// In subscriber, before the gameOver block:
if ((nextValue === 'playing' || nextValue === 'title') && prevValue === 'gameOver') {
  // Capture best BEFORE this round starts (after restart resets context)
  priorBestRef.current = props.storage.getBestScore()
}
// Alternatively, capture on START/RESTART events:
// When transitioning INTO playing from title or gameOver, snapshot priorBest
// The gameMachine entry action writes best SYNCHRONOUSLY on gameOver entry,
// so we MUST capture before the round ends.
// Simplest: capture when leaving gameOver (entering title/playing).
// Even simpler: capture when entering playing from title/gameOver.
```

The actual logic to implement: In the subscriber callback, detect the transition
INTO the `playing` state from any non-playing state (title, gameOver). At that
moment, `storage.getBestScore()` returns the value from the PREVIOUS run (before
the current in-progress run could write anything). Store in `priorBestRef.current`.
On gameOver entry, use `priorBestRef.current` instead of reading storage again.

```typescript
// Add after existing useState calls:
const priorBestRef = useRef<number>(props.storage.getBestScore())

// In subscriber (replace lines 62-67):
if (nextValue === 'playing' && prevValue !== 'playing') {
  // Snapshot best before this round so gameOver comparison is correct
  priorBestRef.current = props.storage.getBestScore()
}
if (nextValue === 'gameOver' && prevValue !== 'gameOver') {
  setPriorBest(priorBestRef.current)          // use pre-round value
  props.storage.pushLeaderboard(s.context.score)
  setLeaderboard(props.storage.getLeaderboard())
}
```

Required import addition: `useRef` is already available from 'preact/hooks' — check
current imports first; if not imported, add it.

From src/ui/screens/SettingsModal.tsx (current — full file already read):
- Line 48: `const reduceMotionOn = settings.reduceMotion !== 'off'`  ← BUG
- Fix (line 48 only): 
  ```typescript
  const reduceMotionOn =
    settings.reduceMotion === 'on' ||
    (settings.reduceMotion === 'auto' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  ```
- Line 75 onChange handler is ALREADY correct: `onChange: (v) => update({ reduceMotion: v ? 'on' : 'off' })`
  Do NOT change it — writing 'on'/'off' when user explicitly toggles is the correct behaviour.

From src/ui/styles.css (current — full file already read):
- Line 19: `transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);`  — on `.screen`
- Line 89: `transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);`  — on `.hud-screen`
- Fix: change BOTH `250ms` to `120ms` (keep the cubic-bezier, only change duration)
- No other transition declarations in the file use `250ms` for opacity
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix priorBest race in UIBridge — capture on round-start not on gameOver</name>
  <files>src/ui/UIBridge.tsx</files>
  <read_first>src/ui/UIBridge.tsx — read the full file before editing; note which hooks are already imported from 'preact/hooks'</read_first>
  <action>
Surgically fix the priorBest capture race (CR-01 / Gap 1). The gameMachine's gameOver entry action calls storage.setBestScore() synchronously before xstate subscribers fire, so reading getBestScore() inside the gameOver subscriber always returns the NEW best.

Fix: Add a `useRef` that snapshots the best score at the start of each round (when transitioning INTO 'playing'), then use that ref value — not storage — on gameOver entry.

1. Add `useRef` to the import from 'preact/hooks' if not already imported.
2. After the existing `useState` declarations (around line 55), add:
   ```typescript
   const priorBestRef = useRef<number>(props.storage.getBestScore())
   ```
3. Inside the subscriber callback (in the `useEffect`), add a new block BEFORE the existing gameOver block:
   ```typescript
   // Snapshot best before round starts; gameMachine writes best synchronously on gameOver
   // so we must capture here, not in the gameOver branch
   if (nextValue === 'playing' && prevValue !== 'playing') {
     priorBestRef.current = props.storage.getBestScore()
   }
   ```
4. In the existing gameOver block, change `const pb = props.storage.getBestScore()` to use the ref:
   ```typescript
   if (nextValue === 'gameOver' && prevValue !== 'gameOver') {
     setPriorBest(priorBestRef.current)
     props.storage.pushLeaderboard(s.context.score)
     setLeaderboard(props.storage.getLeaderboard())
   }
   ```
   Remove the now-unused `const pb = ...` line.

Do NOT change any other logic in the file. Do NOT change the `useEffect` dependency array. Do NOT touch screen rendering code.
  </action>
  <verify>
    <automated>grep -n "priorBestRef" /Users/ming/projects/flappy-3d/src/ui/UIBridge.tsx</automated>
    Expect: at least 3 lines — useRef declaration, snapshot on 'playing', and usage in gameOver block.
    Additional: grep -n "getBestScore" /Users/ming/projects/flappy-3d/src/ui/UIBridge.tsx
    Expect: getBestScore() appears only in the useRef initializer and in the 'playing' snapshot block — NOT inside the gameOver block.
    Final: cd /Users/ming/projects/flappy-3d && npx tsc --noEmit
    Expect: exit 0, no errors.
  </verify>
  <acceptance_criteria>
    - `grep -n "priorBestRef" src/ui/UIBridge.tsx` returns ≥3 hits
    - `grep -n "getBestScore" src/ui/UIBridge.tsx` shows getBestScore NOT called inside `nextValue === 'gameOver'` block
    - `grep -n "nextValue === 'playing'" src/ui/UIBridge.tsx` returns a hit showing priorBestRef.current assignment
    - `tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>priorBest is captured when the round starts (on 'playing' entry), not at gameOver. The GameOverScreen will receive the pre-round best, enabling NewBestBadge to display correctly.</done>
</task>

<task type="auto">
  <name>Task 2: Fix SettingsModal reduce-motion display (CR-02) and CSS transition speed (HUD-07)</name>
  <files>src/ui/screens/SettingsModal.tsx, src/ui/styles.css</files>
  <read_first>
    src/ui/screens/SettingsModal.tsx — read line 48 to confirm current reduceMotionOn expression before editing.
    src/ui/styles.css — read lines 15-22 and 85-92 to confirm both 250ms transition declarations before editing.
  </read_first>
  <action>
Two separate one-line-each fixes.

**Fix A — SettingsModal.tsx line 48 (Gap 2 / CR-02):**
Replace:
```typescript
const reduceMotionOn = settings.reduceMotion !== 'off'
```
With:
```typescript
const reduceMotionOn =
  settings.reduceMotion === 'on' ||
  (settings.reduceMotion === 'auto' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches)
```
This makes the 'auto' case evaluate the live OS media query instead of treating it as enabled. The onChange handler on line 75 (`onChange: (v) => update({ reduceMotion: v ? 'on' : 'off' })`) is already correct — do NOT touch it.

**Fix B — styles.css lines 19 and 89 (Gap 4 / HUD-07):**
Find both occurrences of `transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)` and change only the duration from `250ms` to `120ms`. The cubic-bezier stays the same.

Line 19 (in `#ui-root .screen`):
```css
transition: opacity 120ms cubic-bezier(0.16, 1, 0.3, 1);
```

Line 89 (in `.hud-screen`):
```css
transition: opacity 120ms cubic-bezier(0.16, 1, 0.3, 1);
```

Do NOT touch any other CSS transitions in the file (button transitions at 150ms are correct and unrelated).
  </action>
  <verify>
    <automated>
      grep -n "matchMedia" /Users/ming/projects/flappy-3d/src/ui/screens/SettingsModal.tsx
      grep -n "120ms" /Users/ming/projects/flappy-3d/src/ui/styles.css
      grep -n "250ms" /Users/ming/projects/flappy-3d/src/ui/styles.css
      cd /Users/ming/projects/flappy-3d && npx tsc --noEmit
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "matchMedia" src/ui/screens/SettingsModal.tsx` returns exactly 1 hit containing `prefers-reduced-motion`
    - `grep -n "reduceMotion !==" src/ui/screens/SettingsModal.tsx` returns 0 hits (old expression removed)
    - `grep -n "120ms" src/ui/styles.css` returns ≥2 hits (both transition declarations updated)
    - `grep -n "250ms" src/ui/styles.css` returns 0 hits (no remaining opacity 250ms declarations)
    - `tsc --noEmit` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>SettingsModal reduce-motion toggle shows OFF when OS setting is off and storage is 'auto'. Both screen opacity transitions are 120ms, satisfying the HUD-07 &lt;150ms requirement.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| localStorage → SettingsModal | Settings read from storage; display logic change doesn't affect persistence path |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-05-01 | Information Disclosure | window.matchMedia in SettingsModal | accept | Media query is read-only browser API; returns boolean; no PII involved |
</threat_model>

<verification>
After both tasks complete:
1. `cd /Users/ming/projects/flappy-3d && npx tsc --noEmit` — must exit 0
2. `npm run build` — must exit 0; bundle must remain under 250KB gzip
3. `grep -n "priorBestRef" src/ui/UIBridge.tsx` — returns ≥3 hits
4. `grep -n "getBestScore" src/ui/UIBridge.tsx` — getBestScore NOT inside gameOver block
5. `grep -n "matchMedia" src/ui/screens/SettingsModal.tsx` — returns 1 hit
6. `grep -c "120ms" src/ui/styles.css` — returns ≥2
7. `grep -c "250ms" src/ui/styles.css` — returns 0 (no opacity transition at 250ms)
</verification>

<success_criteria>
- NewBestBadge will display on the first run (priorBest=0, any score>0 is a new best)
- Reduce Motion toggle shows OFF when OS motion is allowed and storage is 'auto'
- Screen transitions complete in 120ms (under the 150ms HUD-07 cap)
- TypeScript strict check and build both pass
- Requirements HUD-05, HUD-06, HUD-07, ANIM-06 move from BLOCKED to SATISFIED
</success_criteria>

<output>
After completion, create `/Users/ming/projects/flappy-3d/.planning/phases/03-ui-audio-polish/03-05-fix-ui-state-SUMMARY.md` following the summary template.
</output>
