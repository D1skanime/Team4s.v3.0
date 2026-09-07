#!/usr/bin/env node

import { writeFileSync } from 'node:fs'

import { chromium } from 'playwright'

import {
  captureAllCrops, captureProfileMatrix, captureSectionMatrix, chooseCarousel,
  collectInteractions, makeContactSheets, waitSettled,
} from './phase151-badge-evidence-browser-private.mjs'
import {
  Findings, VIEWPORTS, buildArtworkInventory, measureGallery, openGallery, parseArgs, prepareOutput,
  settleCompositionImages, validateMeasurement, writeSignoff,
} from './phase151-badge-evidence-private.mjs'

const GALLERY_SELECTOR = '[data-achievement-gallery][data-gallery-ready="true"]'
const HANDOFF_PATH = '/tmp/team4s-151-collector-handoff.md'
const ZOOM_METHOD = 'Post-hydration CSS zoom on documentElement at 2 and 4. This exercises layout/reflow without claiming native browser-chrome zoom; effective CSS widths are recorded.'

function assertion(condition, message) {
  if (!condition) throw new Error(message)
}

function attachDiagnostics(page, label, findings, browserErrors) {
  page.on('pageerror', (error) => {
    const row = { label, type: 'pageerror', message: error.message }
    browserErrors.push(row)
    findings.fail('browser-page-error', label, error.message)
  })
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const row = { label, type: 'console-error', message: message.text() }
    browserErrors.push(row)
    findings.fail('browser-console-error', label, message.text())
  })
  page.on('requestfailed', (request) => {
    const row = { label, type: 'request-failed', url: request.url(), detail: request.failure()?.errorText }
    browserErrors.push(row)
    findings.fail('browser-request-failed', request.url(), row.detail || 'unknown failure')
  })
  page.on('response', (response) => {
    if (response.status() < 400) return
    const row = { label, type: 'http-error', status: response.status(), url: response.url() }
    browserErrors.push(row)
    findings.fail('browser-http-error', response.url(), `HTTP ${response.status()}`)
  })
}

async function loadAt(page, galleryURL) {
  await openGallery(page, galleryURL)
  assertion(await page.locator(GALLERY_SELECTOR).count() === 1, `expected exactly one ${GALLERY_SELECTOR}`)
}

async function collectMatrix(browser, galleryURL, outDir, inventory, findings, browserErrors) {
  const matrix = []
  for (const motion of ['normal', 'reduced']) {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference',
    })
    const page = await context.newPage()
    const profilePage = await context.newPage()
    attachDiagnostics(page, `matrix-${motion}`, findings, browserErrors)
    attachDiagnostics(profilePage, `profile-matrix-${motion}`, findings, browserErrors)
    const opened = await findings.probe('gallery-route', `${galleryURL} (${motion})`, () => loadAt(page, galleryURL))
    if (opened !== null) {
      for (const [width, height] of VIEWPORTS) {
        const label = `${motion}-${width}x${height}`
        await page.setViewportSize({ width, height })
        await page.locator(GALLERY_SELECTOR).evaluate((root) => root.scrollIntoView({ block: 'start' }))
        await findings.probe('composition-lazy-settle', label, () => settleCompositionImages(page, inventory.missingAdditive))
        await page.waitForTimeout(100)
        const measurement = await findings.probe('gallery-measurement', label, () => measureGallery(page))
        validateMeasurement(measurement, findings, label, inventory.entries.map((row) => row.filename))
        const screenshots = await captureSectionMatrix(page, outDir, label, findings)
        await profilePage.setViewportSize({ width, height })
        const profileScreenshots = await captureProfileMatrix(profilePage, `${new URL(galleryURL).origin}/members/type`, outDir, label, findings)
        matrix.push({ motion, width, height, measurement, screenshots, profileScreenshots })
      }
    }
    await context.close()
  }
  return matrix
}

async function measureProbe(page, selector) {
  return page.locator(selector).evaluate((root) => {
    const box = (element) => {
      const value = element?.getBoundingClientRect()
      return value ? { width: value.width, height: value.height, x: value.x, y: value.y } : null
    }
    return {
      wrapper: box(root),
      hero: box(root.querySelector('[data-achievement-size="hero"]')),
      stages: Array.from(root.querySelectorAll('[data-achievement-size="stage"]'), box),
      card: box(root.querySelector('[data-role-card-container]')),
      visibleRoleCards: Array.from(root.querySelectorAll('[data-role-card-container]')).filter((item) => {
        const style = getComputedStyle(item)
        const rect = item.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      }).length,
    }
  })
}

async function collectContainerAndState(page, findings) {
  const boundaries = []
  for (const width of [561, 562, 657, 658]) await findings.probe('container-boundary', `[data-container-probe] width=${width}`, async () => {
    await page.locator('[data-container-probe]').evaluate((node, value) => { node.style.width = `${value}px` }, width)
    await page.waitForTimeout(60)
    const row = { width, ...await measureProbe(page, '[data-container-probe]') }
    const expectedHero = width < 562 ? 192 : width < 658 ? 216 : 240
    const expectedStage = width < 562 ? 64 : 80
    assertion(Math.abs(row.wrapper.width - width) <= 1, `wrapper=${row.wrapper.width}, expected=${width}`)
    assertion(Math.abs(row.hero.width - expectedHero) <= 1 && Math.abs(row.hero.height - expectedHero) <= 1, `hero=${JSON.stringify(row.hero)}, expected=${expectedHero}`)
    assertion(row.stages.length > 0 && row.stages.every((stage) => Math.abs(stage.width - expectedStage) <= 1 && Math.abs(stage.height - expectedStage) <= 1), `stages=${JSON.stringify(row.stages)}, expected=${expectedStage}`)
    boundaries.push(row)
  })
  await page.locator('[data-container-probe]').evaluate((node) => { node.style.width = '320px' })
  const embed = await findings.probe('narrow-embed-wide-viewport', '[data-container-probe] width=320 in 1440 viewport', async () => {
    const row = await measureProbe(page, '[data-container-probe]')
    assertion(Math.abs(row.hero.width - 192) <= 1 && row.stages.every((stage) => Math.abs(stage.width - 64) <= 1), JSON.stringify(row))
    return row
  })
  const states = await findings.probe('active-inactive-equality', '[data-state-case="active|inactive"]', async () => {
    const active = await measureProbe(page, '[data-state-case="active"]')
    const inactive = await measureProbe(page, '[data-state-case="inactive"]')
    assertion(active.visibleRoleCards === 1 && inactive.visibleRoleCards === 1, `hidden/duplicate cards active=${active.visibleRoleCards} inactive=${inactive.visibleRoleCards}`)
    assertion(Math.abs(active.hero.height - inactive.hero.height) <= 1, `hero heights active=${active.hero.height} inactive=${inactive.hero.height}`)
    assertion(Math.abs(active.card.height - inactive.card.height) <= 1, `card heights active=${active.card.height} inactive=${inactive.card.height}`)
    return { active, inactive }
  })
  return { boundaries, embed, states }
}

async function collectZoom(page, findings) {
  const rows = []
  for (const scale of [2, 4]) await findings.probe('zoom-reflow', `documentElement CSS zoom=${scale}`, async () => {
    await page.evaluate((value) => { document.documentElement.style.zoom = String(value); window.scrollTo(0, 0) }, scale)
    await page.waitForTimeout(100)
    const row = await page.evaluate((value) => ({
      scale: value,
      method: 'documentElement.style.zoom after hydration',
      viewportCssPixels: { width: innerWidth, height: innerHeight },
      effectiveLayoutWidth: innerWidth / value,
      document: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
      gallery: (() => { const rect = document.querySelector('[data-achievement-gallery]').getBoundingClientRect(); return { width: rect.width, right: rect.right } })(),
    }), scale)
    assertion(row.document.scrollWidth <= row.document.clientWidth + 1, JSON.stringify(row))
    rows.push(row)
  })
  await page.evaluate(() => { document.documentElement.style.zoom = ''; window.scrollTo(0, 0) })
  return { method: ZOOM_METHOD, rows }
}

async function collectMotion(browser, galleryURL, findings, browserErrors) {
  const rows = []
  for (const reduced of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
    const page = await context.newPage(); attachDiagnostics(page, `motion-${reduced ? 'reduced' : 'normal'}`, findings, browserErrors)
    await loadAt(page, galleryURL)
    const { root, selector } = await chooseCarousel(page)
    const track = root.locator('[data-focal-carousel-items]').first().locator('..')
    await track.scrollIntoViewIfNeeded(); await track.focus(); await page.keyboard.press('Home'); await waitSettled(track)
    await page.keyboard.press('ArrowRight')
    const immediate = await track.getAttribute('data-navigation-state')
    const animationClassImmediately = await track.evaluate((node) => Array.from(node.classList).some((name) => name.includes('programmaticScrolling')))
    if (reduced) await track.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const animationClassAfterTwoFrames = await track.evaluate((node) => Array.from(node.classList).some((name) => name.includes('programmaticScrolling')))
    const settleMs = await waitSettled(track)
    if (reduced) assertion(!animationClassImmediately && !animationClassAfterTwoFrames && settleMs < 250, `reduced animation=${animationClassImmediately}/${animationClassAfterTwoFrames} settleMs=${settleMs}`)
    else assertion(settleMs <= 1500, `normal settleMs=${settleMs}`)
    rows.push({ reduced, selector, immediate, animationClassImmediately, animationClassAfterTwoFrames, settleMs })
    await context.close()
  }
  return rows
}

async function collectStress(page, findings, requestCounter) {
  const rows = []
  for (const count of [100, 200]) await findings.probe('stress-full-mount-render-request', `[data-stress-count="${count}"]`, async () => {
    const root = page.locator(`[data-stress-count="${count}"]`)
    const mounted = await root.locator('[data-stress-item]').count()
    const renderValue = async () => root.evaluate((node) => Number(node.dataset.renderCount || node.querySelector('[data-render-count]')?.dataset.renderCount || node.querySelector('[data-render-count]')?.textContent))
    const beforeRender = await renderValue(); const beforeRequests = requestCounter.value
    const track = root.locator('[data-focal-carousel-items]').first().locator('..')
    const started = Date.now(); await track.focus(); await page.keyboard.press('End'); const settleMs = await waitSettled(track); await page.keyboard.press('Home'); await waitSettled(track)
    const elapsedMs = Date.now() - started; const afterRender = await renderValue(); const requestGrowth = requestCounter.value - beforeRequests
    assertion(mounted === count, `mounted=${mounted}`)
    assertion(Number.isFinite(beforeRender) && beforeRender >= count, `renderCount=${beforeRender}`)
    assertion(afterRender - beforeRender <= 8, `render growth=${afterRender - beforeRender}`)
    assertion(requestGrowth === 0, `fetch/XHR growth=${requestGrowth}`)
    assertion(settleMs <= 1500 && elapsedMs <= 3200, `settleMs=${settleMs} elapsedMs=${elapsedMs}`)
    rows.push({ count, mounted, beforeRender, afterRender, renderGrowth: afterRender - beforeRender, requestGrowth, settleMs, elapsedMs })
  })
  return rows
}

async function collectHighDpi(browser, galleryURL, inventory, findings, browserErrors) {
  const rows = []
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 2 })
    const page = await context.newPage(); attachDiagnostics(page, `hidpi-${width}`, findings, browserErrors)
    await loadAt(page, galleryURL)
    await findings.probe('composition-lazy-settle', `hidpi-${width}`, () => settleCompositionImages(page, inventory.missingAdditive))
    const measurement = await measureGallery(page)
    validateMeasurement(measurement, findings, `hidpi-${width}@2x`, inventory.entries.map((row) => row.filename))
    rows.push({ width, dpr: 2, measurement })
    await context.close()
  }
  return rows
}

function writeHandoff({ outDir, inventory, matrix, crops, contacts, findings, ready }) {
  const command = 'docker compose exec -T team4sv30-frontend node scripts/capture-phase151-badge-evidence.mjs --base-url http://127.0.0.1:3000 --out-dir /tmp/team4s-phase151-evidence'
  const lines = [
    '# Phase 151 Task 05-02 collector handoff', '',
    `Status: ${ready ? 'READY TO RERUN; current run passed' : 'READY TO RERUN; current run has real gaps'}`,
    `Command: \`${command}\``, '',
    `Inventory: ${inventory?.totals?.sources ?? 0} sources (${inventory?.totals?.originals ?? 0} original + ${inventory?.totals?.additive ?? 0} additive).`,
    `Matrix: ${matrix.length}/16 normal+reduced viewport rows.`,
    `Crops: ${crops.sources.length} sources + ${crops.compositions.length} compositions. Contact sheets: ${contacts.length}.`,
    `Failures: ${findings.failures.length}.`, '',
    '## Failures / selector evidence', '',
    ...(findings.failures.length ? findings.failures.map((row) => `- **${row.gate}** — \`${row.evidence}\`: ${row.detail}`) : ['- None.']), '',
    '## Method boundaries', '',
    `- Zoom: ${ZOOM_METHOD}`,
    '- Sharp was used read-only through metadata/stats/raw decode; no artwork pixels were transformed or written.',
    '- Contact sheets use full-size contain image boxes; Chromium bounds/style evidence is recorded in browser-matrix.json.',
    '- Every requested output path resolves to a fresh run directory; prior evidence is never reused or deleted.',
    '- Git/index operations were intentionally not run by this bounded worker; exact baseline hashes and additive filenames are enforced in artwork-inventory.json.',
    '- Manual visual verdict columns remain blank for coordinator review.', '',
    `Artifacts: \`${outDir}\``, '',
  ]
  writeFileSync(HANDOFF_PATH, lines.join('\n'))
  writeFileSync(`${outDir}/collector-handoff.md`, lines.join('\n'))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseURL = String(args['base-url'] ?? 'http://127.0.0.1:3000').replace(/\/+$/, '')
  const requestedOutDir = String(args['out-dir'] ?? '/tmp/team4s-phase151-evidence').replace(/\/+$/, '')
  const outDir = prepareOutput(requestedOutDir)
  const artworkDir = String(args['artwork-dir'] ?? '/app/public/member-achievement-badges')
  const baselinePath = String(args['baseline'] ?? '/.planning/phases/151-erfolgsbadge-karussell-konsolidierung/checks/original-artwork.json')
  const galleryURL = `${baseURL}/dev/ui-system/achievements`
  const findings = new Findings(); const browserErrors = []
  let inventory = null; let matrix = []; let crops = { sources: [], compositions: [] }; let contacts = []
  const browserEvidence = { generatedAt: new Date().toISOString(), galleryURL, expectedMatrixRows: 16, zoomMethod: ZOOM_METHOD }
  inventory = await findings.probe('artwork-inventory', artworkDir, () => buildArtworkInventory({ artworkDir, baselinePath, findings }))
  let browser = null
  try {
    browser = await chromium.launch({ headless: true })
    matrix = await collectMatrix(browser, galleryURL, outDir, inventory, findings, browserErrors)
    browserEvidence.matrix = matrix
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage(); attachDiagnostics(page, 'functional', findings, browserErrors)
    const requestCounter = { value: 0 }; page.on('request', (request) => { if (['fetch', 'xhr'].includes(request.resourceType())) requestCounter.value += 1 })
    const opened = await findings.probe('gallery-route-functional', galleryURL, () => loadAt(page, galleryURL))
    if (opened !== null) {
      const initialFetchXhr = requestCounter.value
      await settleCompositionImages(page, inventory.missingAdditive)
      browserEvidence.containerAndState = await collectContainerAndState(page, findings)
      browserEvidence.zoom = await collectZoom(page, findings)
      browserEvidence.interactions = await collectInteractions(page, findings, requestCounter)
      browserEvidence.stress = await collectStress(page, findings, requestCounter)
      browserEvidence.fetchXhr = { afterLoad: initialFetchXhr, afterAllNavigation: requestCounter.value, navigationGrowth: requestCounter.value - initialFetchXhr }
      if (browserEvidence.fetchXhr.navigationGrowth !== 0) findings.fail('fetch-xhr-navigation-growth', GALLERY_SELECTOR, `growth=${browserEvidence.fetchXhr.navigationGrowth}`)
      await loadAt(page, galleryURL)
      crops = await captureAllCrops(page, outDir, findings, inventory.missingAdditive)
      writeSignoff(outDir, crops, inventory.missingAdditive)
      contacts = await makeContactSheets(browser, outDir, crops, findings)
      browserEvidence.contactSheets = contacts
    }
    await context.close()
    browserEvidence.motion = await findings.probe('normal-reduced-motion', galleryURL, () => collectMotion(browser, galleryURL, findings, browserErrors))
    browserEvidence.highDpi = await findings.probe('responsive-candidate-dpr', galleryURL, () => collectHighDpi(browser, galleryURL, inventory, findings, browserErrors))
  } catch (error) {
    findings.fail('collector-browser-fatal', galleryURL, error instanceof Error ? error.stack || error.message : String(error))
  } finally {
    await browser?.close()
  }
  browserEvidence.browserErrors = browserErrors
  browserEvidence.failures = findings.failures
  browserEvidence.artifactCounts = { matrixRows: matrix.length, sourceCrops: crops.sources.length, compositionCrops: crops.compositions.length, contactSheets: contacts.length }
  if (matrix.length !== 16) findings.fail('matrix-completeness', 'browser-matrix.json', `expected 16, found ${matrix.length}`)
  if (crops.sources.length !== 113) findings.fail('source-crop-completeness', 'crops/sources', `expected 113, found ${crops.sources.length}`)
  if (crops.compositions.length !== 84) findings.fail('composition-crop-completeness', 'crops/compositions', `expected 84, found ${crops.compositions.length}`)
  browserEvidence.failures = findings.failures
  writeFileSync(`${outDir}/artwork-inventory.json`, `${JSON.stringify(inventory, null, 2)}\n`)
  writeFileSync(`${outDir}/browser-matrix.json`, `${JSON.stringify(browserEvidence, null, 2)}\n`)
  writeFileSync(`${outDir}/gap-manifest.json`, `${JSON.stringify({ pass: findings.failures.length === 0, failures: findings.failures }, null, 2)}\n`)
  writeHandoff({ outDir, inventory, matrix, crops, contacts, findings, ready: findings.failures.length === 0 })
  console.log(JSON.stringify({ pass: findings.failures.length === 0, outDir, handoff: HANDOFF_PATH, inventory: inventory?.totals, matrixRows: matrix.length, sourceCrops: crops.sources.length, compositionCrops: crops.compositions.length, contactSheets: contacts.length, failures: findings.failures.length }))
  if (findings.failures.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
