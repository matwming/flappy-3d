import { test, expect } from '@playwright/test'

test('Phase 7 runtime — capture console errors + score popup spawn', async ({ page }) => {
  const consoleMessages: { type: string; text: string }[] = []
  const pageErrors: string[] = []

  page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }))
  page.on('pageerror', (err) => pageErrors.push(String(err)))
  page.on('requestfailed', (req) => {
    consoleMessages.push({ type: 'failed', text: `${req.failure()?.errorText} ${req.url()}` })
  })
  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      consoleMessages.push({ type: 'http' + resp.status(), text: resp.url() })
    }
  })

  await page.goto('https://matwming.github.io/flappy-3d/', { waitUntil: 'networkidle' })

  // Wait for game to be ready
  await page.waitForTimeout(1500)

  // InputManager listens for `keydown Space` (window-level) + `pointerdown isPrimary` (canvas).
  // Use Space — most reliable in Playwright.
  await page.keyboard.press('Space') // START title→playing
  await page.waitForTimeout(500)

  // Flap repeatedly + let physics + scoring run for ~10s
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Space')
    await page.waitForTimeout(300)
  }
  await page.waitForTimeout(1500)

  // Check the actor state via window? We don't have it exposed. Check via DOM.
  // After START, gameOver-screen should NOT be active and bird should be moving.
  // Try to score by manipulating something — easiest is to send keyboard Space (flap) repeatedly
  // and let the bird collide eventually, OR just observe a few seconds of normal play.

  // Watch for score-popup elements appearing in #ui-root
  const popupCount = { value: 0 }
  page.locator('.score-popup.animating').first().waitFor({ timeout: 5000 }).catch(() => {})

  // Just wait a few seconds and capture state
  await page.waitForTimeout(3000)

  // Capture DOM snapshot of #ui-root
  const uiRootHTML = await page.locator('#ui-root').innerHTML()
  const popupElements = await page.locator('.score-popup').count()
  const milestoneFlash = await page.locator('.milestone-flash').count()
  const pipeColors = await page.evaluate(() => {
    // Try to access the obstacle pool via window if exposed, else check material colors via three.js scene traversal
    return { note: 'cannot inspect three.js scene without window exposure' }
  })

  console.log('=== Console errors:', pageErrors.length)
  pageErrors.forEach((e) => console.log('  ERR:', e))
  console.log('=== Console warnings:', consoleMessages.filter((m) => m.type === 'warning').length)
  consoleMessages
    .filter((m) => m.type === 'warning' || m.type === 'error')
    .forEach((m) => console.log(`  [${m.type}] ${m.text.substring(0, 200)}`))
  console.log('=== Score popup elements in DOM:', popupElements)
  console.log('=== Milestone flash elements:', milestoneFlash)
  console.log('=== UI root HTML (first 500 chars):')
  console.log(uiRootHTML.substring(0, 500))

  // Expect no fatal errors
  expect(pageErrors.length).toBe(0)
})
