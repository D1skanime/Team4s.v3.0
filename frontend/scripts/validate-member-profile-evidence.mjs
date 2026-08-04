#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const REQUIRED_H2 = ['Profil und Mitgliedschaft', 'Aktuelle Projekte', 'Rollenfortschritt', 'Fortschritt', 'Punkte-Meilensteine', 'Beiträge', 'Mitgliedschaft', 'Besondere Auszeichnungen', 'Beiträge']
const REQUIRED_OPTIMIZED_WIDTHS = [128, 160, 512, 640]

function fail(message) {
  throw new Error(`phase120 evidence validator: ${message}`)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function parseArgs(argv) {
  const parsed = {}
  const flags = new Set(['require-js-off', 'require-zero-cls', 'require-source-original-absent'])
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    assert(key?.startsWith('--'), `unexpected argument ${key}`)
    const name = key.slice(2)
    assert(!(name in parsed), `duplicate option ${key}`)
    if (flags.has(name)) parsed[name] = true
    else {
      const value = argv[index + 1]
      assert(value && !value.startsWith('--'), `${key} requires a value`)
      parsed[name] = value
      index += 1
    }
  }
  return parsed
}

function dimensionsEqual(left, right) {
  return Math.abs(left.width - right.width) < 0.5 && Math.abs(left.height - right.height) < 0.5
}

function classifyImages(images) {
  const background = images.find((image) => image.alt === '')
  const avatar = images.find((image) => /Avatar$/.test(image.alt))
  const deep = images.filter((image) => image.deep && image.alt !== '')
  return { background, avatar, deep }
}

function validateActivation(entries, label) {
  const grouped = new Map()
  for (const entry of entries) {
    const list = grouped.get(entry.identity) ?? []
    list.push(entry.value)
    grouped.set(entry.identity, list)
  }
  if (grouped.size === 0) return
  for (const [identity, values] of grouped) {
    const transitions = values.slice(1).filter((value, index) => values[index] === 'false' && value === 'true').length
    assert(transitions === 1 || (values.length === 1 && values[0] === 'true'), `${label}/${identity} must activate exactly once, got ${values.join('>')}`)
    assert(!values.some((value, index) => index > 0 && values[index - 1] === 'true' && value === 'false'), `${label}/${identity} reverted activation`)
  }
}

function validateNetwork(item, label) {
  const all = [...item.network.cold, ...item.network.warm]
  assert(item.network.profile === 'slow-4g' && item.network.cpuThrottle === 4, `${label} throttle settings drifted`)
  const imageResponses = all.filter((event) => event.type === 'Image' || event.mimeType?.startsWith('image/'))
  assert(imageResponses.length > 0, `${label} has no image waterfall`)
  const webp = imageResponses.filter((event) => event.mimeType === 'image/webp')
  assert(webp.length > 0, `${label} has no WebP response`)
  const widths = new Set(imageResponses.map((event) => {
    try { return Number(new URL(event.url).searchParams.get('w')) || null } catch { return null }
  }).filter(Boolean))
  const warmCache = item.network.warm.some((event) => event.fromDiskCache || event.fromPrefetchCache || String(event.cacheHeader).toUpperCase() === 'HIT' || Number(event.age) >= 0)
  assert(warmCache, `${label} lacks warm cache evidence`)
  return widths
}

const args = parseArgs(process.argv.slice(2))
for (const required of ['input', 'collector', 'git-head', 'viewports', 'require-states']) assert(args[required], `--${required} is required`)
assert(args['require-js-off'] && args['require-zero-cls'] && args['require-source-original-absent'], 'all fail-closed requirement flags are mandatory')
const envHead = String(process.env.PHASE120_GIT_HEAD ?? '').trim()
assert(/^[0-9a-f]{40}$/.test(envHead), 'PHASE120_GIT_HEAD must be a full commit')
assert(args['git-head'] === envHead, 'CLI and environment git HEAD differ')
const artifact = JSON.parse(readFileSync(args.input, 'utf8'))
assert(artifact.gitHead === envHead, 'artifact and expected git HEAD differ')
assert(artifact.schemaVersion === 1 && artifact.runId && artifact.startedAt && artifact.completedAt, 'artifact identity/timestamps are incomplete')
assert(artifact.playwrightVersion === '1.55.0' && artifact.chromiumVersion, 'Playwright/Chromium identity is incomplete')
assert(artifact.collectorSha256 === sha256(readFileSync(args.collector)), 'collector digest mismatch')
const recordedDigest = artifact.evidenceDigest
delete artifact.evidenceDigest
assert(recordedDigest === sha256(JSON.stringify(artifact)), 'evidence digest mismatch')
artifact.evidenceDigest = recordedDigest

const viewports = args.viewports.split(',')
const states = args['require-states'].split(',')
assert(JSON.stringify(artifact.settings.viewports) === JSON.stringify(viewports), 'viewport settings differ')
assert(artifact.settings.network === 'slow-4g' && artifact.settings.cpuThrottle === 4, 'recorded throttle settings differ')
assert(artifact.cases.length === viewports.length * states.length, 'case matrix is incomplete')

const optimizedWidths = new Set()
for (const state of states) {
  for (const viewport of viewports) {
    const item = artifact.cases.find((entry) => entry.state === state && entry.viewport === viewport)
    const label = `${state}/${viewport}`
    assert(item, `${label} is missing`)
    assert(item.slug, `${label} slug is missing`)
    assert(!item.sourceOriginalLeak, `${label} leaked source_original_url`)
    assert(item.beforeScroll.pageOverflow <= 0 && item.beforeScroll.bodyOverflow <= 0, `${label} has global horizontal overflow`)
    assert(item.afterScroll.pageOverflow <= 0 && item.afterScroll.bodyOverflow <= 0, `${label} has global horizontal overflow after scroll`)
    assert(item.beforeScroll.h1.length === 1 && item.beforeScroll.h1[0], `${label} must have one named H1`)
    const visibleH2 = item.beforeScroll.h2.map((heading) => heading.text)
    if (state === 'background-present') {
      assert(REQUIRED_H2.every((heading) => visibleH2.includes(heading)), `${label} lacks Hero B/Rhythm C H2 composition`)
    }
    assert(visibleH2.includes('Profil und Mitgliedschaft'), `${label} lacks the profile composition`)
    assert(item.beforeScroll.h2.every((heading) => heading.wineLine || heading.text === 'Aktuelle Projekte'), `${label} lacks an H2 wine line`)
    assert(item.beforeScroll.h3.includes('Fansub-Geschichte') && item.beforeScroll.h3.includes('Gruppenzugehörigkeit'), `${label} lacks the profile pair`)
    if (visibleH2.includes('Beiträge')) assert(item.beforeScroll.h3.includes('Letzte Beiträge') && item.beforeScroll.h3.includes('Frühere Mitwirkungen'), `${label} lacks the contribution pair`)
    const { background, avatar, deep } = classifyImages(item.beforeScroll.images)
    if (state === 'background-present') assert(background, `${label} lacks the real hero background`)
    else assert(!background, `${label} unexpectedly has a hero background`)
    assert(avatar?.loading === 'eager', `${label} avatar is not eager`)
    if (background) assert(background.loading === 'eager' && background.fetchPriority === 'high', `${label} hero background lacks priority`)
    assert(deep.every((image) => image.loading === 'lazy'), `${label} has eager deep images`)
    assert(item.performance.observerInstallCount.layoutShift === 1 && item.performance.observerInstallCount.lcp === 1, `${label} observer install count differs from one`)
    assert(item.performance.cls === 0 && item.performance.layoutShifts.length === 0, `${label} has nonzero Phase-120 CLS ${item.performance.cls}`)
    assert(item.performance.lcp.length > 0, `${label} lacks LCP evidence`)
    validateActivation(item.performance.activation, label)
    for (const width of validateNetwork(item, label)) optimizedWidths.add(width)
    for (const strip of item.beforeScroll.strips) {
      assert(strip.overflowX === 'auto' && strip.scrollbarWidth !== 'none', `${label}/${strip.label} lacks visible local scroll affordance`)
      assert(strip.touchAction.includes('pan-x'), `${label}/${strip.label} lacks touch pan-x`)
    }
    for (const input of item.stripInput) {
      if (input.afterMouse > input.initial) assert(input.mousePrevented, `${label}/${input.label} mouse wheel escaped the strip`)
      assert(input.afterTrackpad >= input.afterMouse, `${label}/${input.label} trackpad input did not move locally`)
    }
    assert(item.screenshot.sha256 && item.screenshot.bytes > 1000, `${label} screenshot trace is missing`)
  }
}

for (const required of REQUIRED_OPTIMIZED_WIDTHS) assert(optimizedWidths.has(required), `evidence matrix lacks optimized width ${required}`)

const fallback = artifact.cases.map((item) => item.fallback).filter(Boolean)
assert(fallback.length === 1, `forced fallback evidence count must be one, got ${fallback.length}`)
const fallbackItem = fallback[0]
assert(fallbackItem.fallbackCount === 1 && fallbackItem.afterFirst.src === fallbackItem.afterSecond.src, 'fallback must switch exactly once')
assert(!fallbackItem.afterFirst.src.includes('source_original_url'), 'fallback used source_original_url')
assert(dimensionsEqual(fallbackItem.before.rect, fallbackItem.afterFirst.rect) && dimensionsEqual(fallbackItem.afterFirst.rect, fallbackItem.afterSecond.rect), 'fallback geometry drifted')

assert(artifact.jsOff.length === states.length, 'JS-off state matrix is incomplete')
for (const state of states) {
  const item = artifact.jsOff.find((entry) => entry.state === state)
  assert(item, `JS-off ${state} is missing`)
  const body = item.serialization.bodyText
  assert(item.serialization.h1.length === 1, `JS-off ${state} lacks H1`)
  if (state === 'background-present') {
    assert(body.includes('Aktuell') && (body.includes('Noch ') || body.includes('Höchste Stufe erreicht')), `JS-off ${state} lacks rank/current/next/rest copy`)
  }
  assert(!item.serialization.html.includes('source_original_url'), `JS-off ${state} leaked source_original_url`)
  assert(item.serialization.pageOverflow <= 0, `JS-off ${state} has page overflow`)
}

console.log(JSON.stringify({ ok: true, gitHead: artifact.gitHead, evidenceDigest: recordedDigest, cases: artifact.cases.length }))
