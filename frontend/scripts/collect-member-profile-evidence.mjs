#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium } from 'playwright'

const EXPECTED_VIEWPORTS = ['390x844', '768x1024', '1440x900']
const NETWORK = { latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 }

function fail(message) {
  throw new Error(`phase120 collector: ${message}`)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    assert(key?.startsWith('--') && value && !value.startsWith('--'), `${key ?? '<missing>'} requires a value`)
    assert(!(key.slice(2) in parsed), `duplicate option ${key}`)
    parsed[key.slice(2)] = value
  }
  return parsed
}

function parseViewports(raw) {
  const values = String(raw ?? '').split(',')
  assert(JSON.stringify(values) === JSON.stringify(EXPECTED_VIEWPORTS), `--viewports must be ${EXPECTED_VIEWPORTS.join(',')}`)
  return values.map((label) => {
    const [width, height] = label.split('x').map(Number)
    return { label, width, height }
  })
}

async function installPerformanceObservers(page) {
  await page.addInitScript(() => {
    window.__phase120Evidence = {
      activation: [],
      cls: 0,
      layoutShifts: [],
      lcp: [],
      observerInstallCount: { layoutShift: 0, lcp: 0 },
    }

    const evidence = window.__phase120Evidence
    const seenActivation = new WeakMap()
    let nextActivationId = 1
    const recordActivation = (element) => {
      if (!(element instanceof HTMLElement) || !element.hasAttribute('data-interaction-enabled')) return
      let identity = seenActivation.get(element)
      if (!identity) {
        identity = `${element.getAttribute('aria-label') || 'carousel'}#${nextActivationId++}`
        seenActivation.set(element, identity)
      }
      const value = element.getAttribute('data-interaction-enabled')
      const previous = evidence.activation.at(-1)
      if (!previous || previous.identity !== identity || previous.value !== value) {
        evidence.activation.push({ identity, value, at: performance.now() })
      }
    }
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') recordActivation(mutation.target)
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue
          recordActivation(node)
          node.querySelectorAll('[data-interaction-enabled]').forEach(recordActivation)
        }
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-interaction-enabled'] })

    if ('PerformanceObserver' in window) {
      try {
        evidence.observerInstallCount.layoutShift += 1
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue
            evidence.cls += entry.value
            evidence.layoutShifts.push({
              value: entry.value,
              sources: (entry.sources || []).map((source) => ({
                node: source.node instanceof Element ? source.node.tagName : null,
                previousRect: source.previousRect,
                currentRect: source.currentRect,
              })),
            })
          }
        }).observe({ type: 'layout-shift', buffered: true })
      } catch {}
      try {
        evidence.observerInstallCount.lcp += 1
        new PerformanceObserver((list) => {
          evidence.lcp.push(...list.getEntries().map((entry) => ({
            startTime: entry.startTime,
            size: entry.size,
            url: entry.url || null,
            element: entry.element?.tagName || null,
          })))
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      } catch {}
    }
  })
}

async function configureCDP(page, events) {
  const session = await page.context().newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: NETWORK.latency,
    downloadThroughput: NETWORK.downloadThroughput,
    uploadThroughput: NETWORK.uploadThroughput,
    connectionType: 'cellular3g',
  })
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  session.on('Network.responseReceived', ({ response, type }) => {
    events.push({
      url: response.url,
      type,
      status: response.status,
      mimeType: response.mimeType,
      fromDiskCache: Boolean(response.fromDiskCache),
      fromPrefetchCache: Boolean(response.fromPrefetchCache),
      cacheHeader: response.headers['x-nextjs-cache'] || response.headers['X-Nextjs-Cache'] || null,
      age: response.headers.age || response.headers.Age || null,
    })
  })
  return session
}

async function snapshotDOM(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect()
      return { x: value.x, y: value.y, width: value.width, height: value.height }
    }
    const images = Array.from(document.images).map((image) => {
      const url = new URL(image.currentSrc || image.src, location.href)
      return {
        alt: image.alt,
        src: image.getAttribute('src'),
        currentSrc: image.currentSrc,
        loading: image.loading || image.getAttribute('loading'),
        fetchPriority: image.fetchPriority || image.getAttribute('fetchpriority'),
        sizes: image.sizes || image.getAttribute('sizes'),
        width: image.width,
        height: image.height,
        rect: rect(image),
        optimizedWidth: url.pathname === '/_next/image' ? Number(url.searchParams.get('w')) || null : null,
        deep: image.getBoundingClientRect().top > innerHeight,
      }
    })
    const strips = Array.from(document.querySelectorAll('[data-badge-stage-strip]')).map((element) => {
      const style = getComputedStyle(element)
      return {
        label: element.getAttribute('aria-label'),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflowX: style.overflowX,
        scrollbarWidth: style.scrollbarWidth,
        touchAction: style.touchAction,
      }
    })
    const h2 = Array.from(document.querySelectorAll('h2')).filter((heading) => heading.offsetParent !== null).map((heading) => ({
      text: heading.textContent?.trim() || '',
      wineLine: Boolean(heading.closest('[class*="sectionHeaderUnderline"]')),
    }))
    const controls = Array.from(document.querySelectorAll('button,a,[role="button"]')).filter((element) => element.getClientRects().length > 0).map((element) => ({
      label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 80) || '',
      rect: rect(element),
    }))
    return {
      title: document.title,
      bodyText: document.body.innerText,
      html: document.documentElement.outerHTML,
      h1: Array.from(document.querySelectorAll('h1')).map((heading) => heading.textContent?.trim() || ''),
      h2,
      h3: Array.from(document.querySelectorAll('h3')).map((heading) => heading.textContent?.trim() || ''),
      images,
      strips,
      controls,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      heroRect: document.querySelector('[data-testid="member-profile-hero-panel"]') ? rect(document.querySelector('[data-testid="member-profile-hero-panel"]')) : null,
    }
  })
}

async function exerciseStrips(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('[data-badge-stage-strip]')).map((element) => {
    const strip = element
    const initial = strip.scrollLeft
    strip.scrollLeft = Math.min(20, strip.scrollWidth - strip.clientWidth)
    const mouse = new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true })
    strip.dispatchEvent(mouse)
    const afterMouse = strip.scrollLeft
    const trackpad = new WheelEvent('wheel', { deltaX: 40, bubbles: true, cancelable: true })
    strip.dispatchEvent(trackpad)
    return {
      label: strip.getAttribute('aria-label'),
      initial,
      afterMouse,
      afterTrackpad: strip.scrollLeft,
      mousePrevented: mouse.defaultPrevented,
      trackpadPrevented: trackpad.defaultPrevented,
    }
  }))
}

async function exerciseFallback(page) {
  const image = page.locator('[data-testid="member-profile-hero-panel"] img').first()
  if (await image.count() === 0) return null
  const before = await image.evaluate((node) => ({ src: node.currentSrc || node.src, rect: node.getBoundingClientRect().toJSON() }))
  await image.dispatchEvent('error')
  await page.waitForTimeout(50)
  const afterFirst = await image.evaluate((node) => ({ src: node.currentSrc || node.src, rect: node.getBoundingClientRect().toJSON() }))
  await image.dispatchEvent('error')
  await page.waitForTimeout(50)
  const afterSecond = await image.evaluate((node) => ({ src: node.currentSrc || node.src, rect: node.getBoundingClientRect().toJSON() }))
  return { forcedErrors: 2, fallbackCount: before.src === afterFirst.src ? 0 : 1, before, afterFirst, afterSecond }
}

async function collectViewport(browser, baseURL, state, slug, viewport, token) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
  if (token) {
    await context.addCookies([{
      name: 'team4s_access_token',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      sameSite: 'Lax',
    }])
  }
  const coldEvents = []
  const page = await context.newPage()
  await installPerformanceObservers(page)
  const coldSession = await configureCDP(page, coldEvents)
  const textBodies = []
  const responseReads = []
  page.on('response', (response) => {
    const contentType = response.headers()['content-type'] || ''
    if (/text|json|javascript/.test(contentType)) {
      responseReads.push(response.text().then((body) => textBodies.push(body)).catch(() => {}))
    }
  })
  const url = `${baseURL}/members/${encodeURIComponent(slug)}`
  const navigation = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  assert(navigation?.ok(), `${state}/${viewport.label} navigation returned ${navigation?.status()}`)
  await page.waitForSelector('h1', { timeout: 30_000 })
  await page.waitForLoadState('networkidle', { timeout: 90_000 })
  await page.waitForTimeout(1800)
  const beforeScroll = await snapshotDOM(page)
  for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += Math.max(240, Math.floor(viewport.height * 0.7))) {
    await page.evaluate((nextY) => scrollTo(0, nextY), y)
    await page.waitForTimeout(120)
  }
  const activationTargets = page.locator('[data-interaction-enabled]')
  for (let index = 0; index < await activationTargets.count(); index += 1) {
    await activationTargets.nth(index).scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
  }
  await page.waitForTimeout(400)
  const stripInput = await exerciseStrips(page)
  const fallback = state === 'background-present' && viewport.label === '1440x900' ? await exerciseFallback(page) : null
  const afterScroll = await snapshotDOM(page)
  const activationFinal = await activationTargets.evaluateAll((elements) => elements.map((element, index) => ({
    identity: `${element.getAttribute('aria-label') || 'carousel'}#${index + 1}`,
    value: element.getAttribute('data-interaction-enabled'),
  })))
  const perf = await page.evaluate((finalEntries) => {
    const evidence = window.__phase120Evidence
    for (const entry of finalEntries) {
      const previous = evidence.activation.findLast((candidate) => candidate.identity === entry.identity)
      if (!previous || previous.value !== entry.value) {
        evidence.activation.push({ ...entry, at: performance.now(), source: 'terminal-dom-sample' })
      }
    }
    return evidence
  }, activationFinal)
  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled', timeout: 90_000 })
  await Promise.allSettled(responseReads)
  await coldSession.detach()

  const warmEvents = []
  const warmPage = await context.newPage()
  const warmSession = await configureCDP(warmPage, warmEvents)
  await warmPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await warmPage.waitForTimeout(800)
  await warmSession.detach()
  await context.close()

  return {
    state,
    slug,
    authenticated: Boolean(token),
    viewport: viewport.label,
    network: { profile: 'slow-4g', cpuThrottle: 4, cold: coldEvents, warm: warmEvents },
    beforeScroll,
    afterScroll,
    performance: perf,
    stripInput,
    fallback,
    screenshot: { sha256: sha256(screenshot), bytes: screenshot.length },
    sourceOriginalLeak: [beforeScroll.html, afterScroll.html, ...textBodies, ...coldEvents.map((event) => event.url), ...warmEvents.map((event) => event.url)].some((value) => String(value).includes('source_original_url')),
  }
}

async function collectJSOff(browser, baseURL, state, slug, token) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  if (token) {
    await context.addCookies([{
      name: 'team4s_access_token',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      sameSite: 'Lax',
    }])
  }
  const page = await context.newPage()
  const response = await page.goto(`${baseURL}/members/${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  assert(response?.ok(), `JS-off ${state} navigation returned ${response?.status()}`)
  const serialization = await snapshotDOM(page)
  await context.close()
  return { state, slug, serialization }
}

// ===========================================================================
// Phase-120 visual/interaction collector (original mode, unchanged behaviour).
// Runs when no --mode (or --mode phase120) is passed.
// ===========================================================================
async function runPhase120(args) {
  const gitHead = String(process.env.PHASE120_GIT_HEAD ?? '').trim()
  assert(/^[0-9a-f]{40}$/.test(gitHead), 'PHASE120_GIT_HEAD must be a full 40-character commit')
  assert(args['base-url'] === 'http://127.0.0.1:3000', '--base-url must be exactly http://127.0.0.1:3000')
  assert(args['network'] === 'slow-4g', '--network must be slow-4g')
  assert(args['cpu-throttle'] === '4', '--cpu-throttle must be 4')
  assert(args['background-slug'] && args['no-background-slug'], 'both real profile slugs are required')
  assert(args.output, '--output is required')
  const viewports = parseViewports(args.viewports)
  const noBackgroundToken = String(process.env.PHASE120_NO_BACKGROUND_TOKEN ?? '').trim()
  const collectorSource = readFileSync(new URL(import.meta.url))
  const browser = await chromium.launch({ headless: true })
  const startedAt = new Date().toISOString()
  const cases = []
  const states = [
    ['background-present', args['background-slug']],
    ['background-absent', args['no-background-slug']],
  ]
  try {
    for (const [state, slug] of states) {
      const token = state === 'background-absent' ? noBackgroundToken : ''
      for (const viewport of viewports) cases.push(await collectViewport(browser, args['base-url'], state, slug, viewport, token))
    }
    const jsOff = []
    for (const [state, slug] of states) {
      jsOff.push(await collectJSOff(browser, args['base-url'], state, slug, state === 'background-absent' ? noBackgroundToken : ''))
    }
    const artifact = {
      schemaVersion: 1,
      runId: randomUUID(),
      startedAt,
      completedAt: new Date().toISOString(),
      gitHead,
      argv: process.argv.slice(2),
      collectorSha256: sha256(collectorSource),
      playwrightVersion: JSON.parse(readFileSync(new URL('../node_modules/playwright/package.json', import.meta.url), 'utf8')).version,
      chromiumVersion: browser.version(),
      settings: { viewports: EXPECTED_VIEWPORTS, network: 'slow-4g', cpuThrottle: 4 },
      cases,
      jsOff,
    }
    artifact.evidenceDigest = sha256(JSON.stringify(artifact))
    writeFileSync(args.output, `${JSON.stringify(artifact, null, 2)}\n`)
    console.log(JSON.stringify({ ok: true, output: args.output, evidenceDigest: artifact.evidenceDigest }))
  } finally {
    await browser.close()
  }
}

// ===========================================================================
// Phase-131 (plan 131-02) performance baseline collector (--mode perf-baseline).
//
// Captures, per seed profile, the full metric set that anchors the Phase-131
// performance budgets (D-06): initial-profile payload bytes, project +
// contribution continuation payload bytes, request count + latency, the image
// waterfall, and Web Vitals (LCP, CLS, INP). Budgets are LOCKED LATER (131-08);
// this mode only measures + records method/environment. Values vary run to run;
// the JSON STRUCTURE is stable and reproducible.
//
// The public (anonymous) response class is measured - no auth cookie - matching
// the D-09 public cache class. Both profiles are the reused Phase-129 seed
// fixtures (sheppert, csubs-leader); this mode never creates data.
// ===========================================================================

// Absolute, baseline-independent ceilings (D-07). Recorded for downstream
// (131-08) budget locking - NOT enforced or locked here.
const PERF_ABSOLUTE_CEILINGS = {
  lcpMs: 2500,
  cls: 0.1,
  inpMs: 200,
  queryBudget: 'constant regardless of project/contribution count (no per-card reads, no N+1)',
  note: 'Absolute good-band ceilings (D-07). Payload/latency budgets are locked later in 131-08 as baseline + ~20%.',
}

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function median(values) {
  const ok = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (!ok.length) return null
  const mid = Math.floor(ok.length / 2)
  return ok.length % 2 ? ok[mid] : (ok[mid - 1] + ok[mid]) / 2
}

function summarizeLatency(samples) {
  const ok = samples.filter((value) => Number.isFinite(value))
  return {
    count: ok.length,
    minMs: ok.length ? round(Math.min(...ok)) : null,
    medianMs: round(median(ok)),
    maxMs: ok.length ? round(Math.max(...ok)) : null,
    samplesMs: ok.map((value) => round(value)),
  }
}

// Measure one JSON API endpoint N times (payload bytes + latency distribution).
async function measureApiEndpoint(label, url, sampleCount) {
  const latencies = []
  let status = null
  let bytes = null
  let contentType = null
  for (let index = 0; index < sampleCount; index += 1) {
    const startedAt = performance.now()
    let response
    try {
      response = await fetch(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      return { label, url, status: null, error: String(error?.message ?? error), latencyMs: summarizeLatency(latencies) }
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    latencies.push(performance.now() - startedAt)
    status = response.status
    bytes = buffer.length
    contentType = response.headers.get('content-type')
  }
  return { label, url, status, payloadBytes: bytes, contentType, latencyMs: summarizeLatency(latencies) }
}

// Full page-layer capture: request waterfall, image waterfall, Web Vitals.
// Never asserts on a non-200 page (e.g. a profile whose render crashes) - it
// records the status + captured console/page errors and still returns the
// waterfall + whatever vitals the rendered output produced.
async function capturePageMetrics(browser, baseURL, slug, throttle) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()

  await page.addInitScript(() => {
    window.__perf131 = { lcpMs: null, cls: 0, clsEntries: 0, inpMs: null, interactionEvents: 0 }
    const perf = window.__perf131
    if (!('PerformanceObserver' in window)) return
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) perf.lcpMs = entry.startTime
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue
          perf.cls += entry.value
          perf.clsEntries += 1
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          perf.interactionEvents += 1
          if (perf.inpMs === null || entry.duration > perf.inpMs) perf.inpMs = entry.duration
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 })
    } catch {}
  })

  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500)) })
  page.on('pageerror', (error) => pageErrors.push(String(error?.message ?? error).slice(0, 500)))

  const finished = []
  const failed = []
  page.on('requestfinished', (request) => finished.push(request))
  page.on('requestfailed', (request) => failed.push(request))

  const session = await page.context().newCDPSession(page)
  await session.send('Network.enable')
  if (throttle === 'slow-4g') {
    await session.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8,
      connectionType: 'cellular3g',
    })
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }

  const url = `${baseURL}/members/${encodeURIComponent(slug)}`
  const navStart = performance.now()
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  const status = response ? response.status() : null
  const rendered = status === 200
  try {
    await page.waitForLoadState('networkidle', { timeout: 60_000 })
  } catch {}
  await page.waitForTimeout(1500)

  // Drive a few real interactions so INP has samples to report.
  try {
    await page.mouse.move(720, 300)
    await page.mouse.click(720, 300)
    await page.keyboard.press('Tab')
    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(300)
    await page.mouse.wheel(0, -600)
    await page.waitForTimeout(600)
  } catch {}

  const webVitals = await page.evaluate(() => window.__perf131 ?? null)
  const htmlBytes = Buffer.byteLength(await page.content(), 'utf8')

  const requests = []
  for (const request of finished) {
    let resp = null
    try { resp = await request.response() } catch {}
    let sizes = null
    try { sizes = await request.sizes() } catch {}
    const timing = request.timing()
    requests.push({
      url: request.url().length > 200 ? `${request.url().slice(0, 200)}…` : request.url(),
      resourceType: request.resourceType(),
      method: request.method(),
      status: resp ? resp.status() : null,
      responseBodyBytes: sizes ? sizes.responseBodySize : null,
      responseHeaderBytes: sizes ? sizes.responseHeadersSize : null,
      timing: {
        startTimeMs: round(timing.startTime),
        responseStartMs: round(timing.responseStart),
        responseEndMs: round(timing.responseEnd),
      },
    })
  }

  await session.detach().catch(() => {})
  await context.close()

  const images = requests.filter((request) => request.resourceType === 'image')
  const totalTransferBytes = requests.reduce((sum, request) => sum + (request.responseBodyBytes ?? 0), 0)
  const imageBytes = images.reduce((sum, request) => sum + (request.responseBodyBytes ?? 0), 0)

  return {
    url,
    status,
    rendered,
    renderNote: rendered ? null : `page returned HTTP ${status}; page-derived Web Vitals reflect the error output, not the profile`,
    navToDomContentLoadedMs: round(performance.now() - navStart),
    requestCount: requests.length,
    failedRequestCount: failed.length,
    totalTransferBytes,
    htmlBytes,
    consoleErrors,
    pageErrors,
    webVitals: {
      lcpMs: webVitals ? round(webVitals.lcpMs) : null,
      cls: webVitals ? round(webVitals.cls, 4) : null,
      clsEntries: webVitals ? webVitals.clsEntries : null,
      inpMs: webVitals ? round(webVitals.inpMs) : null,
      interactionEvents: webVitals ? webVitals.interactionEvents : null,
      method: 'PerformanceObserver: largest-contentful-paint + layout-shift + event(durationThreshold=16); INP driven by scripted click/keydown/scroll',
    },
    imageWaterfall: {
      count: images.length,
      totalBytes: imageBytes,
      images: images.map((request) => ({
        url: request.url,
        status: request.status,
        bytes: request.responseBodyBytes,
        startTimeMs: request.timing.startTimeMs,
        responseEndMs: request.timing.responseEndMs,
      })),
    },
    requestWaterfall: requests,
  }
}

async function runPerfBaseline(args) {
  const baseURL = String(args['base-url'] ?? process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/+$/, '')
  const apiBase = String(args['api-base'] ?? process.env.PERF_API_BASE ?? 'http://127.0.0.1:18092').replace(/\/+$/, '')
  const profiles = String(args.profiles ?? process.env.PERF_PROFILES ?? 'sheppert,csubs-leader')
    .split(',').map((value) => value.trim()).filter(Boolean)
  const outputDir = String(args['output-dir'] ?? process.env.PERF_OUTPUT_DIR ?? '').replace(/\/+$/, '')
  const throttle = String(args.throttle ?? process.env.PERF_THROTTLE ?? 'none')
  const apiSampleCount = Number(args['api-samples'] ?? process.env.PERF_API_SAMPLES ?? 5)
  assert(outputDir, '--output-dir (or PERF_OUTPUT_DIR) is required')
  assert(profiles.length >= 1, 'at least one --profiles slug is required')
  assert(throttle === 'none' || throttle === 'slow-4g', "--throttle must be 'none' or 'slow-4g'")
  assert(Number.isInteger(apiSampleCount) && apiSampleCount >= 1, '--api-samples must be a positive integer')

  const gitHead = String(process.env.PERF_GIT_HEAD ?? '').trim() || null
  const collectorSource = readFileSync(new URL(import.meta.url))
  let playwrightVersion = null
  try {
    playwrightVersion = JSON.parse(readFileSync(new URL('../node_modules/playwright/package.json', import.meta.url), 'utf8')).version
  } catch {}

  mkdirSync(outputDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const chromiumVersion = browser.version()
  const written = []
  try {
    for (const slug of profiles) {
      const startedAt = new Date().toISOString()
      const api = {
        initialProfile: await measureApiEndpoint('initial-profile', `${apiBase}/api/v1/members/${encodeURIComponent(slug)}`, apiSampleCount),
        projectsPage1: await measureApiEndpoint('projects-page-1', `${apiBase}/api/v1/members/${encodeURIComponent(slug)}/projects?limit=6&offset=0`, apiSampleCount),
        projectsPage2: await measureApiEndpoint('projects-page-2', `${apiBase}/api/v1/members/${encodeURIComponent(slug)}/projects?limit=6&offset=6`, apiSampleCount),
        contributions: await measureApiEndpoint('contributions-continuation', `${apiBase}/api/v1/members/${encodeURIComponent(slug)}/contributions?limit=20&offset=0`, apiSampleCount),
      }
      const page = await capturePageMetrics(browser, baseURL, slug, throttle)
      const artifact = {
        schemaVersion: 1,
        phase: '131',
        plan: '131-02',
        metric: 'member-profile-performance-baseline',
        requirement: 'PMPF-07',
        decision: 'D-06',
        profile: slug,
        runId: randomUUID(),
        capturedAt: startedAt,
        completedAt: new Date().toISOString(),
        budgetsLocked: false,
        absoluteCeilings: PERF_ABSOLUTE_CEILINGS,
        environment: {
          gitHead,
          node: process.version,
          playwrightVersion,
          chromiumVersion,
          baseURL,
          apiBase,
          throttle,
          apiSampleCount,
          viewport: '1440x900',
          public: true,
          collectorSha256: sha256(collectorSource),
        },
        api,
        page,
      }
      const outputPath = `${outputDir}/baseline-${slug}.json`
      mkdirSync(dirname(outputPath), { recursive: true })
      writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`)
      written.push(outputPath)
      console.log(JSON.stringify({
        ok: true,
        profile: slug,
        output: outputPath,
        pageStatus: page.status,
        rendered: page.rendered,
        initialProfileBytes: api.initialProfile.payloadBytes ?? null,
        requestCount: page.requestCount,
        images: page.imageWaterfall.count,
        lcpMs: page.webVitals.lcpMs,
        cls: page.webVitals.cls,
        inpMs: page.webVitals.inpMs,
      }))
    }
  } finally {
    await browser.close()
  }
  console.log(JSON.stringify({ ok: true, mode: 'perf-baseline', written }))
}

// ===========================================================================
// Phase-131 (plan 131-08) LOCKED performance budgets + budget-check gate.
//
// Budgets are LOCKED here (D-06 / SC4/SC5): payload = post-change bytes + ~20%;
// latency = post-change median + ~20%, floored at PERF_LATENCY_FLOOR_MS to absorb
// dev-server + host-IP measurement jitter on sub-25ms endpoints; PLUS the absolute
// baseline-independent Web-Vitals ceilings (D-07). The `budget-check` mode
// re-measures BOTH seed profiles live, writes post-change-<slug>.json, and FAILS
// (non-zero exit) if any profile exceeds a locked budget.
//
// Dev-mode caveat (D-06/D-08): the frontend runs Turbopack dev, so page transfer
// totals are inflated by un-minified chunks and are NOT gated here. The authoritative
// gates are the API-layer payload/latency budgets, the absolute Web-Vitals ceilings,
// and the constant-query-count ceiling (Go test). Production-build transfer figures
// are deferred to the bundled Phase-134 UAT.
// ===========================================================================
const PERF_LATENCY_FLOOR_MS = 25

const LOCKED_BUDGETS = {
  // Absolute, baseline-independent good-band ceilings (D-07). Enforced on any RENDERED page.
  absoluteCeilings: { lcpMs: 2500, cls: 0.1, inpMs: 200 },
  // Structural ceiling (D-07 / PMPF-01, SC1): the profile-load SQL query count MUST stay
  // constant regardless of project/contribution count. NOT measurable from this harness (no
  // DB hook) - enforced by the Go repository test TestPhase131PublicProfileQueryBudgetIsConstant
  // (phase131ConstantQueryBudget = 19). Recorded here for the locked-budget record.
  queryCountCeiling: 19,
  // Per-profile API-layer payload + latency budgets. Basis captured 2026-08-15 on the live
  // dev stack (throttle=none). See evidence/BUDGETS.md for each threshold + its basis.
  profiles: {
    sheppert: {
      initialProfile: { expectStatus: 200, maxBytes: 1952, maxMedianMs: 25 },
      projectsPage1: { expectStatus: 200, maxBytes: 63, maxMedianMs: 25 },
      projectsPage2: { expectStatus: 200, maxBytes: 63, maxMedianMs: 25 },
      // /members/:slug/contributions was removed in 129-07 (commit 96ab8dfa) as a dead
      // endpoint; contributions are delivered EMBEDDED in the profile payload (covered by the
      // initialProfile budget). The standalone route now 404s - locked as such so a silent
      // re-wire trips the gate and forces a fresh budget lock.
      contributions: { expectStatus: 404 },
    },
    'csubs-leader': {
      initialProfile: { expectStatus: 200, maxBytes: 5879, maxMedianMs: 25 },
      projectsPage1: { expectStatus: 200, maxBytes: 2333, maxMedianMs: 25 },
      projectsPage2: { expectStatus: 200, maxBytes: 1340, maxMedianMs: 25 },
      contributions: { expectStatus: 404 },
    },
  },
}

// Evaluate one profile's captured api + page against its locked budget. Returns the
// structured check (per-metric pass/fail) plus a flat list of breach strings.
function evaluateBudget(slug, api, page) {
  const budget = LOCKED_BUDGETS.profiles[slug]
  const breaches = []
  const apiChecks = {}
  if (!budget) {
    breaches.push(`${slug}: no locked budget defined for this profile`)
    return { profile: slug, hasBudget: false, breaches, apiChecks, pageCheck: null }
  }
  for (const [endpoint, limits] of Object.entries(budget)) {
    const measured = api[endpoint]
    const check = { endpoint }
    if (!measured) {
      check.error = 'endpoint not measured'
      breaches.push(`${slug}/${endpoint}: endpoint not measured`)
      apiChecks[endpoint] = check
      continue
    }
    check.status = measured.status
    check.expectStatus = limits.expectStatus ?? null
    if (limits.expectStatus != null && measured.status !== limits.expectStatus) {
      check.statusOk = false
      breaches.push(`${slug}/${endpoint}: status ${measured.status} != expected ${limits.expectStatus}`)
    } else {
      check.statusOk = true
    }
    if (limits.maxBytes != null) {
      check.payloadBytes = measured.payloadBytes ?? null
      check.maxBytes = limits.maxBytes
      check.payloadOk = measured.payloadBytes != null && measured.payloadBytes <= limits.maxBytes
      if (!check.payloadOk) breaches.push(`${slug}/${endpoint}: payload ${measured.payloadBytes}B > budget ${limits.maxBytes}B`)
    }
    if (limits.maxMedianMs != null) {
      const medianMs = measured.latencyMs?.medianMs ?? null
      check.medianMs = medianMs
      check.maxMedianMs = limits.maxMedianMs
      check.latencyOk = medianMs != null && medianMs <= limits.maxMedianMs
      if (!check.latencyOk) breaches.push(`${slug}/${endpoint}: median ${medianMs}ms > budget ${limits.maxMedianMs}ms`)
    }
    apiChecks[endpoint] = check
  }
  // Web-Vitals absolute ceilings - enforced ONLY on a rendered (200) page; a non-rendered
  // page's vitals reflect the error output, not the profile, so they are recorded not gated.
  const ceilings = LOCKED_BUDGETS.absoluteCeilings
  const pageCheck = { rendered: page.rendered, enforced: page.rendered === true }
  if (page.rendered === true) {
    const v = page.webVitals || {}
    pageCheck.lcpMs = v.lcpMs; pageCheck.maxLcpMs = ceilings.lcpMs
    pageCheck.lcpOk = v.lcpMs != null && v.lcpMs <= ceilings.lcpMs
    if (!pageCheck.lcpOk) breaches.push(`${slug}/page: LCP ${v.lcpMs}ms > ceiling ${ceilings.lcpMs}ms`)
    pageCheck.cls = v.cls; pageCheck.maxCls = ceilings.cls
    pageCheck.clsOk = v.cls != null && v.cls <= ceilings.cls
    if (!pageCheck.clsOk) breaches.push(`${slug}/page: CLS ${v.cls} > ceiling ${ceilings.cls}`)
    pageCheck.inpMs = v.inpMs; pageCheck.maxInpMs = ceilings.inpMs
    // INP may be null when no qualifying interaction was recorded - treat null as pass (no signal).
    pageCheck.inpOk = v.inpMs == null || v.inpMs <= ceilings.inpMs
    if (!pageCheck.inpOk) breaches.push(`${slug}/page: INP ${v.inpMs}ms > ceiling ${ceilings.inpMs}ms`)
  } else {
    breaches.push(`${slug}/page: not rendered (status ${page.status}); expected a 200 render`)
  }
  return { profile: slug, hasBudget: true, breaches, apiChecks, pageCheck }
}

// --mode budget-check: re-measure BOTH seed profiles, write post-change-<slug>.json, and
// assert every profile stays within its LOCKED budget. Exit non-zero on any breach unless
// --assert false (capture-only bootstrap). Same capture path as perf-baseline (D-08).
async function runBudgetCheck(args) {
  const baseURL = String(args['base-url'] ?? process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/+$/, '')
  const apiBase = String(args['api-base'] ?? process.env.PERF_API_BASE ?? 'http://127.0.0.1:18092').replace(/\/+$/, '')
  const profiles = String(args.profiles ?? process.env.PERF_PROFILES ?? 'sheppert,csubs-leader')
    .split(',').map((value) => value.trim()).filter(Boolean)
  const outputDir = String(args['output-dir'] ?? process.env.PERF_OUTPUT_DIR ?? '').replace(/\/+$/, '')
  const throttle = String(args.throttle ?? process.env.PERF_THROTTLE ?? 'none')
  const apiSampleCount = Number(args['api-samples'] ?? process.env.PERF_API_SAMPLES ?? 5)
  const assertBudgets = String(args.assert ?? process.env.PERF_ASSERT ?? 'true') !== 'false'
  assert(outputDir, '--output-dir (or PERF_OUTPUT_DIR) is required')
  assert(profiles.length >= 1, 'at least one --profiles slug is required')
  assert(throttle === 'none' || throttle === 'slow-4g', "--throttle must be 'none' or 'slow-4g'")
  assert(Number.isInteger(apiSampleCount) && apiSampleCount >= 1, '--api-samples must be a positive integer')

  const gitHead = String(process.env.PERF_GIT_HEAD ?? '').trim() || null
  const collectorSource = readFileSync(new URL(import.meta.url))
  let playwrightVersion = null
  try {
    playwrightVersion = JSON.parse(readFileSync(new URL('../node_modules/playwright/package.json', import.meta.url), 'utf8')).version
  } catch {}

  mkdirSync(outputDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const chromiumVersion = browser.version()
  const written = []
  const evaluations = []
  try {
    for (const slug of profiles) {
      const startedAt = new Date().toISOString()
      const api = {
        initialProfile: await measureApiEndpoint('initial-profile', `${apiBase}/api/v1/members/${encodeURIComponent(slug)}`, apiSampleCount),
        projectsPage1: await measureApiEndpoint('projects-page-1', `${apiBase}/api/v1/members/${encodeURIComponent(slug)}/projects?limit=6&offset=0`, apiSampleCount),
        projectsPage2: await measureApiEndpoint('projects-page-2', `${apiBase}/api/v1/members/${encodeURIComponent(slug)}/projects?limit=6&offset=6`, apiSampleCount),
        contributions: await measureApiEndpoint('contributions-continuation', `${apiBase}/api/v1/members/${encodeURIComponent(slug)}/contributions?limit=20&offset=0`, apiSampleCount),
      }
      const page = await capturePageMetrics(browser, baseURL, slug, throttle)
      const evaluation = evaluateBudget(slug, api, page)
      evaluations.push(evaluation)
      const artifact = {
        schemaVersion: 1,
        phase: '131',
        plan: '131-08',
        metric: 'member-profile-performance-post-change',
        requirement: 'PMPF-05, PMPF-07',
        decision: 'D-06, D-07, D-08, D-10',
        profile: slug,
        runId: randomUUID(),
        capturedAt: startedAt,
        completedAt: new Date().toISOString(),
        budgetsLocked: true,
        lockedBudget: {
          absoluteCeilings: LOCKED_BUDGETS.absoluteCeilings,
          queryCountCeiling: LOCKED_BUDGETS.queryCountCeiling,
          api: LOCKED_BUDGETS.profiles[slug] ?? null,
          basis: 'payload = post-change bytes + ~20%; latency = post-change median + ~20%, floored at 25ms; Web-Vitals = absolute D-07 good-band ceilings; query count = Go-test-enforced constant (19)',
        },
        budgetCheck: {
          pass: evaluation.breaches.length === 0,
          breaches: evaluation.breaches,
          api: evaluation.apiChecks,
          page: evaluation.pageCheck,
        },
        environment: {
          gitHead,
          node: process.version,
          playwrightVersion,
          chromiumVersion,
          baseURL,
          apiBase,
          throttle,
          apiSampleCount,
          viewport: '1440x900',
          public: true,
          collectorSha256: sha256(collectorSource),
        },
        api,
        page,
      }
      const outputPath = `${outputDir}/post-change-${slug}.json`
      mkdirSync(dirname(outputPath), { recursive: true })
      writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`)
      written.push(outputPath)
      console.log(JSON.stringify({
        ok: true,
        mode: 'budget-check',
        profile: slug,
        output: outputPath,
        pass: evaluation.breaches.length === 0,
        breaches: evaluation.breaches,
        pageStatus: page.status,
        rendered: page.rendered,
        initialProfileBytes: api.initialProfile.payloadBytes ?? null,
        lcpMs: page.webVitals.lcpMs,
        cls: page.webVitals.cls,
        inpMs: page.webVitals.inpMs,
      }))
    }
  } finally {
    await browser.close()
  }
  const allBreaches = evaluations.flatMap((evaluation) => evaluation.breaches)
  const pass = allBreaches.length === 0
  console.log(JSON.stringify({ ok: true, mode: 'budget-check', written, pass, breachCount: allBreaches.length, assert: assertBudgets }))
  if (!pass && assertBudgets) {
    console.error(`budget-check FAILED: ${allBreaches.length} locked-budget breach(es):\n  - ${allBreaches.join('\n  - ')}`)
    process.exitCode = 1
  }
}

// --------------------------------------------------------------------------
// Dispatch: default keeps the Phase-120 collector; --mode perf-baseline runs
// the Phase-131 performance baseline capture; --mode budget-check re-measures
// and enforces the LOCKED Phase-131 budgets (131-08).
// --------------------------------------------------------------------------
const dispatchArgs = parseArgs(process.argv.slice(2))
const mode = dispatchArgs.mode ?? 'phase120'
if (mode === 'perf-baseline') {
  await runPerfBaseline(dispatchArgs)
} else if (mode === 'budget-check') {
  await runBudgetCheck(dispatchArgs)
} else if (mode === 'phase120') {
  await runPhase120(dispatchArgs)
} else {
  fail(`unknown --mode ${mode}`)
}
