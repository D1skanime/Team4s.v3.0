#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
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
  await page.waitForTimeout(1800)
  const beforeScroll = await snapshotDOM(page)
  for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += Math.max(240, Math.floor(viewport.height * 0.7))) {
    await page.evaluate((nextY) => scrollTo(0, nextY), y)
    await page.waitForTimeout(120)
  }
  await page.waitForTimeout(400)
  const stripInput = await exerciseStrips(page)
  const fallback = state === 'background-present' && viewport.label === '1440x900' ? await exerciseFallback(page) : null
  const afterScroll = await snapshotDOM(page)
  const perf = await page.evaluate(() => window.__phase120Evidence)
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

const args = parseArgs(process.argv.slice(2))
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
