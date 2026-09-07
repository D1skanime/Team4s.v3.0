import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import sharp from 'sharp'

export const VIEWPORTS = [
  [320, 568], [390, 844], [520, 900], [768, 1024],
  [1024, 768], [1440, 900], [1920, 1080], [2560, 1440],
]
export const EXPECTED_NEW = [
  'rank-frame-karaoke_fx-bronze.png',
  'rank-frame-karaoke_fx-gold.png',
  'rank-frame-karaoke_fx-platinum.png',
  'rank-frame-karaoke_fx-silver.png',
  'role-karaoke_fx-motif.png',
  'role_entry_karaoke_fx.png',
]

export function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || !value || value.startsWith('--')) {
      throw new Error(`${key ?? '<missing argument>'} requires a value`)
    }
    result[key.slice(2)] = value
  }
  return result
}

export function prepareOutput(outDir) {
  let uniqueDir = outDir
  if (existsSync(uniqueDir)) {
    const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
    uniqueDir = `${outDir}-${stamp}`
    for (let suffix = 2; existsSync(uniqueDir); suffix += 1) uniqueDir = `${outDir}-${stamp}-${suffix}`
  }
  for (const path of [
    uniqueDir, `${uniqueDir}/crops/sources`, `${uniqueDir}/crops/compositions`,
    `${uniqueDir}/contact-sheets`, `${uniqueDir}/screenshots`,
  ]) mkdirSync(path, { recursive: true })
  return uniqueDir
}

export class Findings {
  failures = []
  notes = []
  seen = new Set()

  fail(gate, evidence, detail) {
    const finding = { gate, evidence, detail }
    const key = JSON.stringify(finding)
    if (this.seen.has(key)) return
    this.seen.add(key)
    this.failures.push(finding)
  }

  async probe(gate, evidence, callback) {
    try {
      return await callback()
    } catch (error) {
      this.fail(gate, evidence, error instanceof Error ? error.message : String(error))
      return null
    }
  }
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export async function buildArtworkInventory({ artworkDir, baselinePath, findings }) {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const baselineByName = new Map(baseline.map((row) => [basename(row.path), row]))
  const names = readdirSync(artworkDir).filter((name) => name.endsWith('.png')).sort()
  const entries = []
  for (const filename of names) {
    const path = join(artworkDir, filename)
    const metadata = await sharp(path).metadata()
    const original = baselineByName.get(filename)
    const bytes = statSync(path).size
    const hash = sha256(path)
    let additiveAlpha = null
    if (EXPECTED_NEW.includes(filename)) {
      const stats = await sharp(path).stats()
      const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true })
      const alphaIndex = metadata.hasAlpha ? info.channels - 1 : -1
      const alphaAt = (x, y) => alphaIndex >= 0 ? data[(y * info.width + x) * info.channels + alphaIndex] : null
      const corners = [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]
        .map(([x, y]) => alphaAt(x, y))
      let centerMin = null; let centerMax = null
      if (filename.startsWith('rank-frame-') && alphaIndex >= 0) {
        centerMin = 255; centerMax = 0
        for (let y = Math.floor(info.height * 0.45); y < Math.ceil(info.height * 0.55); y += 1) {
          for (let x = Math.floor(info.width * 0.45); x < Math.ceil(info.width * 0.55); x += 1) {
            const alpha = alphaAt(x, y)
            centerMin = Math.min(centerMin, alpha); centerMax = Math.max(centerMax, alpha)
          }
        }
      }
      const alphaStats = alphaIndex >= 0 ? stats.channels[alphaIndex] : null
      additiveAlpha = {
        dimensionsExact: info.width === 1254 && info.height === 1254,
        hasAlpha: Boolean(metadata.hasAlpha) && alphaIndex >= 0,
        alphaMin: alphaStats?.min ?? null,
        alphaMax: alphaStats?.max ?? null,
        cornerAlpha: corners,
        frameCenterTenPercent: filename.startsWith('rank-frame-') ? { min: centerMin, max: centerMax } : null,
        method: 'sharp metadata/stats/raw decode; read-only, no resize or pixel write',
      }
      if (!additiveAlpha.dimensionsExact) findings.fail('karaoke-dimensions-1254', filename, `${info.width}x${info.height}`)
      if (!additiveAlpha.hasAlpha || additiveAlpha.alphaMin !== 0 || additiveAlpha.alphaMax !== 255) findings.fail('karaoke-genuine-alpha', filename, JSON.stringify(additiveAlpha))
      if (corners.some((alpha) => alpha === null || alpha > 1)) findings.fail('karaoke-transparent-corners', filename, `alpha=${JSON.stringify(corners)} (required <=1)`)
      if (additiveAlpha.frameCenterTenPercent && centerMax !== 0) findings.fail('karaoke-frame-center-open', filename, JSON.stringify(additiveAlpha.frameCenterTenPercent))
    }
    const row = {
      filename,
      bytes,
      sha256: hash,
      dimensions: [metadata.width ?? 0, metadata.height ?? 0],
      alphaReport: {
        hasAlpha: Boolean(metadata.hasAlpha),
        channels: metadata.channels ?? null,
        space: metadata.space ?? null,
        depth: metadata.depth ?? null,
        premultiplied: metadata.premultiplied ?? null,
        method: 'sharp.metadata() only; no artwork pixels were transformed',
      },
      classification: original ? 'original' : 'additive',
      baselineMatch: original ? {
        sha256: original.sha256 === hash,
        bytes: original.bytes === bytes,
        dimensions: JSON.stringify(original.dimensions) === JSON.stringify([metadata.width, metadata.height]),
      } : null,
      additiveAlpha,
    }
    entries.push(row)
  }
  const originals = entries.filter((row) => row.classification === 'original')
  const additive = entries.filter((row) => row.classification === 'additive')
  const missingOriginals = [...baselineByName.keys()].filter((name) => !names.includes(name))
  const changedOriginals = originals.filter((row) => !Object.values(row.baselineMatch).every(Boolean))
  const additiveNames = additive.map((row) => row.filename)
  const missingNew = EXPECTED_NEW.filter((name) => !additiveNames.includes(name))
  const unexpectedNew = additiveNames.filter((name) => !EXPECTED_NEW.includes(name))
  if (baseline.length !== 107) findings.fail('original-count', baselinePath, `expected 107 baseline rows, found ${baseline.length}`)
  if (names.length !== 113) findings.fail('source-count', artworkDir, `expected 113 PNGs, found ${names.length}`)
  if (missingOriginals.length) findings.fail('original-presence', artworkDir, `missing: ${missingOriginals.join(', ')}`)
  if (changedOriginals.length) findings.fail('original-byte-preservation', artworkDir, `changed: ${changedOriginals.map((row) => row.filename).join(', ')}`)
  if (missingNew.length || unexpectedNew.length) findings.fail(
    'six-additive-karaoke-files', artworkDir,
    `missing=[${missingNew.join(', ')}] unexpected=[${unexpectedNew.join(', ')}]`,
  )
  return {
    generatedAt: new Date().toISOString(),
    totals: { sources: names.length, originals: originals.length, additive: additive.length },
    expectedSources: [...new Set([...names, ...EXPECTED_NEW])].sort(),
    expectedAdditive: EXPECTED_NEW,
    missingOriginals,
    changedOriginals: changedOriginals.map((row) => row.filename),
    missingAdditive: missingNew,
    unexpectedAdditive: unexpectedNew,
    gitDiffNameGate: {
      status: 'not-run-by-explicit-worker-boundary',
      note: 'Collector container mounts frontend only; coordinator owns Git/index/review. Baseline hashes and exact additive-name set are enforced here.',
    },
    entries,
  }
}

export async function openGallery(page, url) {
  await page.mouse.move((page.viewportSize()?.width ?? 1440) / 2, 100)
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  if (!response?.ok()) throw new Error(`GET ${url} returned ${response?.status() ?? 'no response'}`)
  await page.waitForSelector('[data-achievement-gallery][data-gallery-ready="true"]', { timeout: 90_000 })
  await page.keyboard.press('Escape')
  await page.locator('[data-achievement-gallery]').evaluate(async (root) => {
    const step = Math.max(400, window.innerHeight * 0.75)
    for (let y = 0; y < root.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(250)
}

export async function settleCompositionImages(page, missingFilenames = []) {
  return page.locator('[data-composition-case]').evaluateAll(async (nodes, missing) => {
    for (const node of nodes) {
      node.scrollIntoView({ block: 'center' })
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const nestedScrollPositions = Array.from(node.querySelectorAll('*'))
        .filter((element) => element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight)
        .map((element) => ({ element, left: element.scrollLeft, top: element.scrollTop }))
      const pending = Array.from(node.querySelectorAll('img')).filter((img) => {
        let source = img.currentSrc || img.src
        try { source = decodeURIComponent(source) } catch { /* retain the browser-provided URL */ }
        return img.naturalWidth <= 0 && !missing.some((filename) => source.includes(filename))
      })
      for (const img of pending) {
        img.scrollIntoView({ block: 'center', inline: 'center' })
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        await Promise.race([
          img.decode().catch(() => undefined),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ])
      }
      for (const position of nestedScrollPositions) {
        position.element.scrollLeft = position.left
        position.element.scrollTop = position.top
      }
    }
    window.scrollTo(0, 0)
    return Array.from(document.querySelectorAll('[data-composition-case] img')).filter((img) => {
      let source = img.currentSrc || img.src
      try { source = decodeURIComponent(source) } catch { /* retain the browser-provided URL */ }
      return img.naturalWidth <= 0 && !missing.some((filename) => source.includes(filename))
    }).map((img) => img.currentSrc || img.src)
  }, missingFilenames)
}

export async function measureGallery(page) {
  return page.evaluate(() => {
    const q = (selector, root = document) => Array.from(root.querySelectorAll(selector))
    const rect = (element) => {
      const value = element.getBoundingClientRect()
      return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom }
    }
    const visible = (element) => {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
    }
    const candidateWidth = (src) => src ? Number(new URL(src, location.href).searchParams.get('w')) || null : null
    const namedContainer = (element) => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        if (getComputedStyle(node).containerName.split(/\s+/).includes('achievement-card')) return node
      }
      return null
    }
    const ancestorClip = (element, stop) => {
      const box = element.getBoundingClientRect()
      const clips = []
      for (let node = element.parentElement; node && node !== stop; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (!/(hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) continue
        const outer = node.getBoundingClientRect()
        if (box.left < outer.left - 1 || box.right > outer.right + 1 || box.top < outer.top - 1 || box.bottom > outer.bottom + 1) {
          clips.push({ tag: node.tagName, className: node.className, rect: rect(node) })
        }
      }
      return clips
    }
    const compositions = q('[data-composition-case]').map((wrapper) => ({
      key: wrapper.dataset.compositionCase,
      kind: wrapper.dataset.caseKind,
      title: wrapper.querySelector('h3')?.textContent?.trim() || null,
      rect: rect(wrapper),
      heroCount: q('[data-achievement-size="hero"]', wrapper).length,
      stageCount: q('[data-achievement-size="stage"]', wrapper).length,
      roleCardCount: q('[data-role-card-container]', wrapper).length,
    }))
    const slots = q('[data-achievement-slot]').map((slot, slotIndex) => {
      const slotRect = rect(slot)
      const queryContainer = namedContainer(slot)
      const markerLane = slot.dataset.achievementSize === 'stage' ? slot.closest('ol') : null
      const markerLaneRect = markerLane?.getBoundingClientRect()
      const fullyVisibleInMarkerLane = markerLaneRect
        ? slotRect.left >= markerLaneRect.left - 1 && slotRect.right <= markerLaneRect.right + 1
          && slotRect.top >= markerLaneRect.top - 1 && slotRect.bottom <= markerLaneRect.bottom + 1
        : true
      const images = q('img', slot).map((img, imageIndex) => {
        const imageRect = rect(img)
        const style = getComputedStyle(img)
        return {
          imageIndex, meaningfulArt: img.dataset.achievementArt ?? null, alt: img.alt,
          src: img.getAttribute('src'), currentSrc: img.currentSrc,
          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
          complete: img.complete, rect: imageRect, objectFit: style.objectFit,
          candidateWidth: candidateWidth(img.currentSrc || img.src),
          withinEightPxContentBox: imageRect.x >= slotRect.x + 7.5 && imageRect.right <= slotRect.right - 7.5
            && imageRect.y >= slotRect.y + 7.5 && imageRect.bottom <= slotRect.bottom - 7.5,
        }
      })
      const wrapper = slot.closest('[data-composition-case]')
      return {
        slotIndex, badgeCode: slot.dataset.badgeCode ?? null, size: slot.dataset.achievementSize,
        compositionKey: wrapper?.dataset.compositionCase ?? null,
        scope: slot.closest('[data-stress-count]') ? 'stress-fixture' : slot.closest('[data-artwork-reference]') ? 'independent-reference' : 'production',
        queryContainer: queryContainer ? { width: queryContainer.getBoundingClientRect().width, name: getComputedStyle(queryContainer).containerName } : null,
        locked: slot.hasAttribute('data-locked-stage-art'), rect: slotRect, images,
        clippedByAncestors: slot.dataset.achievementSize === 'stage' && queryContainer && fullyVisibleInMarkerLane
          ? ancestorClip(slot, queryContainer) : [],
      }
    })
    const transparentRootSpecs = [
      ['role', '[data-role-code]'],
      ['contribution', '[data-contribution-achievement-stage]'],
      ['membership', '[data-membership-stage]'],
      ['points', '[data-points-achievement-stage]'],
      ['animeproject', '[data-anime-project-stage]'],
    ]
    const transparentRoots = transparentRootSpecs.flatMap(([kind, selector]) => q(selector)
      .filter((node) => !node.closest('[data-historical-product-panel], [data-artwork-reference], [data-actual-card="membership-with-founding"]'))
      .map((node, index) => {
        const style = getComputedStyle(node)
        return { kind, index, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, boxShadow: style.boxShadow, borderRadius: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius] }
      }))
    const sources = q('[data-source-case]').map((wrapper) => {
      const img = wrapper.querySelector('img')
      return {
        filename: wrapper.dataset.sourceCase, title: wrapper.textContent?.trim() || null,
        image: img ? { complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, currentSrc: img.currentSrc } : null,
      }
    })
    const carousels = q('[data-focal-carousel-items]').map((items) => {
      const direct = Array.from(items.children).filter((child) => child.hasAttribute('data-focal-carousel-item'))
      const active = direct.filter((child) => child.getAttribute('aria-current') === 'true')
      const inactive = direct.filter((child) => child.getAttribute('aria-current') !== 'true')
      return {
        count: direct.length, active: active.length,
        inactiveWithoutInert: inactive.filter((item) => !item.hasAttribute('inert')).length,
        declaredFocusableInsideInert: inactive.flatMap((item) => q('a[href],button,input,select,textarea,[tabindex]', item)).length,
      }
    })
    const interactiveTargets = q('[data-achievement-gallery] button, [data-achievement-gallery] a[href]')
      .filter(visible).map((element) => ({ label: element.getAttribute('aria-label') || element.textContent?.trim(), rect: rect(element) }))
    return {
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      document: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
      compositionCount: compositions.length,
      uniqueCompositionCount: new Set(compositions.map((row) => row.key)).size,
      sourceCount: sources.length,
      uniqueSourceCount: new Set(sources.map((row) => row.filename)).size,
      compositions, sources, slots, transparentRoots, carousels, interactiveTargets,
    }
  })
}

export function validateMeasurement(measurement, findings, evidence, expectedSourceNames) {
  if (!measurement) return
  if (measurement.compositionCount !== 84 || measurement.uniqueCompositionCount !== 84) findings.fail('composition-count', evidence, `count=${measurement.compositionCount} unique=${measurement.uniqueCompositionCount}`)
  if (measurement.sourceCount !== 113 || measurement.uniqueSourceCount !== 113) findings.fail('source-wrapper-count', evidence, `count=${measurement.sourceCount} unique=${measurement.uniqueSourceCount}`)
  const actualSources = measurement.sources.map((row) => row.filename).sort()
  if (JSON.stringify(actualSources) !== JSON.stringify([...expectedSourceNames].sort())) findings.fail('source-wrapper-inventory', '[data-source-case]', 'DOM filenames differ from filesystem inventory')
  if (measurement.document.scrollWidth > measurement.document.clientWidth + 1) findings.fail('document-horizontal-overflow', evidence, JSON.stringify(measurement.document))
  for (const row of measurement.compositions) {
    if (!row.key || !row.title) findings.fail('composition-title', `[data-composition-case="${row.key}"] h3`, `title=${row.title}`)
    if (row.kind === 'role' && (row.heroCount !== 1 || row.stageCount !== 5 || row.roleCardCount !== 1)) findings.fail('role-composition-structure', `[data-composition-case="${row.key}"]`, JSON.stringify(row))
    if (row.kind === 'non-role' && (row.heroCount < 1 || row.stageCount < 1)) findings.fail('non-role-composition-structure', `[data-composition-case="${row.key}"]`, JSON.stringify(row))
  }
  for (const slot of measurement.slots) {
    if (slot.scope !== 'production') continue
    const selector = `[data-achievement-slot] >> nth=${slot.slotIndex}`
    const containerWidth = slot.queryContainer?.width
    if (!Number.isFinite(containerWidth)) findings.fail('slot-query-container', selector, JSON.stringify(slot.queryContainer))
    const expected = slot.size === 'hero' ? containerWidth < 562 ? 192 : containerWidth < 658 ? 216 : 240 : containerWidth < 562 ? 64 : 80
    if (Math.abs(slot.rect.width - expected) > 1 || Math.abs(slot.rect.height - expected) > 1 || Math.abs(slot.rect.width - slot.rect.height) > 0.5) findings.fail('slot-geometry-exact', selector, `container=${containerWidth} expected=${expected} rect=${JSON.stringify(slot.rect)}`)
    if (slot.locked && slot.images.length) findings.fail('locked-slot-image', selector, `locked slot contains ${slot.images.length} image(s)`)
    if (!slot.locked && (!slot.badgeCode || slot.images.filter((img) => img.meaningfulArt === slot.badgeCode).length !== 1)) findings.fail('meaningful-art-marker', selector, `badge=${slot.badgeCode} meaningful=${slot.images.map((img) => img.meaningfulArt)}`)
    if (slot.clippedByAncestors.length) findings.fail('stage-ancestor-clipping', selector, JSON.stringify(slot.clippedByAncestors))
    for (const img of slot.images) {
      if (slot.compositionKey && (img.naturalWidth <= 0 || img.naturalHeight <= 0)) findings.fail('image-load', `[data-composition-case="${slot.compositionKey}"] [data-badge-code="${slot.badgeCode}"]`, `src=${img.currentSrc || img.src} natural=${img.naturalWidth}x${img.naturalHeight}`)
      if (!img.withinEightPxContentBox) findings.fail('image-outside-eight-px-content-box', selector, JSON.stringify({ slot: slot.rect, image: img.rect }))
      if (img.objectFit !== 'contain') findings.fail('image-aspect-contain', selector, `object-fit=${img.objectFit}`)
      const required = Math.ceil(Math.max(img.rect.width, img.rect.height) * measurement.viewport.dpr)
      const available = img.candidateWidth ?? Math.max(img.naturalWidth, img.naturalHeight)
      if (slot.compositionKey && available < required - 1) findings.fail('image-candidate-sharpness-input', `[data-composition-case="${slot.compositionKey}"] [data-badge-code="${slot.badgeCode}"]`, `available=${available} required=${required} currentSrc=${img.currentSrc || img.src}`)
    }
  }
  for (const kind of ['role', 'contribution', 'membership', 'points', 'animeproject']) {
    const roots = measurement.transparentRoots.filter((row) => row.kind === kind)
    if (!roots.length) findings.fail('transparent-card-root-presence', kind, 'no eligible production root found')
    for (const row of roots) if (row.backgroundColor !== 'rgba(0, 0, 0, 0)' || row.backgroundImage !== 'none' || row.boxShadow !== 'none' || row.borderRadius.some((value) => value !== '0px')) findings.fail('transparent-card-root-style', `${kind} >> nth=${row.index}`, JSON.stringify(row))
  }
  for (const [index, carousel] of measurement.carousels.entries()) if (carousel.count < 1 || carousel.active !== 1 || carousel.inactiveWithoutInert) findings.fail('carousel-inert-full-mount', `[data-focal-carousel-items] >> nth=${index}`, JSON.stringify(carousel))
  for (const target of measurement.interactiveTargets) if (target.rect.width < 43.5 || target.rect.height < 43.5) findings.fail('interactive-target-44px', target.label || evidence, JSON.stringify(target.rect))
}

export function writeSignoff(outDir, crops, missingSources = []) {
  const rows = [
    ...crops.sources.map((row) => ['source', row]),
    ...missingSources.map((key) => ['source', { key, screenshot: null }]),
    ...crops.compositions.map((row) => ['composition', row]),
  ]
  const header = [
    '# Phase 151 artwork signoff', '',
    'Automation supplies exhaustive rows and evidence links. All visual verdict cells are intentionally blank for coordinator signoff.', '',
    '| Kind | Key | Evidence | Sharpness | Centering | Padding | Crop | Aspect | Title | Height | Active/inactive | Relative weight |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ]
  const body = rows.map(([kind, row]) => `| ${kind} | \`${row.key}\` | ${row.screenshot ? `[crop](${row.screenshot})` : '**MISSING SOURCE — no crop**'} |  |  |  |  |  |  |  |  |  |`)
  writeFileSync(`${outDir}/ARTWORK-SIGNOFF.md`, `${[...header, ...body, ''].join('\n')}`)
}
