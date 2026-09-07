import { readFileSync } from 'node:fs'

function assertion(condition, message) {
  if (!condition) throw new Error(message)
}

export async function activeIndex(track) {
  return track.locator('[data-focal-carousel-item]').evaluateAll((items) =>
    items.findIndex((item) => item.getAttribute('aria-current') === 'true'))
}

export async function carouselState(track) {
  return track.evaluate((node) => {
    const itemsRoot = Array.from(node.children).find((child) => child.hasAttribute('data-focal-carousel-items'))
    const items = itemsRoot
      ? Array.from(itemsRoot.children).filter((child) => child.hasAttribute('data-focal-carousel-item'))
      : []
    const logical = items.findIndex((item) => item.getAttribute('aria-current') === 'true')
    const trackRect = node.getBoundingClientRect()
    const center = trackRect.left + trackRect.width / 2
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth)
    let physical = node.scrollLeft <= 1 ? 0 : node.scrollLeft >= maxScroll - 1 ? items.length - 1 : -1
    let distance = Number.POSITIVE_INFINITY
    if (physical < 0) items.forEach((item, index) => {
      const box = item.getBoundingClientRect()
      const candidate = Math.abs(box.left + box.width / 2 - center)
      if (candidate < distance) { distance = candidate; physical = index }
    })
    return { logical, physical, scrollLeft: node.scrollLeft, maxScroll, navigationState: node.dataset.navigationState }
  })
}

export async function waitSettled(track) {
  const started = Date.now()
  await track.waitFor({ state: 'visible' })
  await track.evaluate((node) => new Promise((resolve, reject) => {
    const startedAt = performance.now()
    const check = () => {
      if (node.dataset.navigationState === 'settled') resolve()
      else if (performance.now() - startedAt > 1500) reject(new Error(`navigation remained ${node.dataset.navigationState}`))
      else requestAnimationFrame(check)
    }
    check()
  }))
  return Date.now() - started
}

export async function chooseCarousel(page) {
  for (const selector of ['[data-stress-count="100"]', '[data-stress-count="200"]', '[data-chain-case="preview"]']) {
    const root = page.locator(selector)
    if (await root.count() && await root.locator('[data-focal-carousel-item]').count() >= 5) return { root, selector }
  }
  throw new Error('no >=5-item carousel under [data-chain-case="preview"] or stress fixtures')
}

async function visibleInactivePoint(track, direction = 'next') {
  return track.evaluate((node, requestedDirection) => {
    const itemsRoot = Array.from(node.children).find((child) => child.hasAttribute('data-focal-carousel-items'))
    const items = itemsRoot
      ? Array.from(itemsRoot.children).filter((child) => child.hasAttribute('data-focal-carousel-item'))
      : []
    const active = items.findIndex((item) => item.getAttribute('aria-current') === 'true')
    const trackRect = node.getBoundingClientRect()
    const ordered = items.map((item, index) => ({ item, index })).filter(({ index }) =>
      requestedDirection === 'next' ? index > active : index < active)
    if (requestedDirection === 'previous') ordered.reverse()
    for (const { item, index } of ordered) {
      const box = item.getBoundingClientRect()
      const left = Math.max(box.left, trackRect.left) + 2
      const right = Math.min(box.right, trackRect.right) - 2
      const top = Math.max(box.top, trackRect.top) + 2
      const bottom = Math.min(box.bottom, trackRect.bottom) - 2
      if (right > left && bottom > top) return { index, x: (left + right) / 2, y: (top + bottom) / 2 }
    }
    throw new Error(`no visible inactive ${requestedDirection} neighbor at active=${active}`)
  }, direction)
}

async function resetHome(page, track) {
  await track.focus()
  await page.keyboard.press('Home')
  await waitSettled(track)
}

function assertAgreement(state) {
  assertion(state.logical === state.physical, `logical/physical mismatch: ${JSON.stringify(state)}`)
}

export async function collectInteractions(page, findings, requestCounter) {
  const output = {}
  const chosen = await chooseCarousel(page)
  const track = chosen.root.locator('[data-focal-carousel-items]').first().locator('..')
  const items = track.locator('[data-focal-carousel-item]')
  await track.scrollIntoViewIfNeeded()
  await resetHome(page, track)
  output.adjacent = await findings.probe('input-adjacent-native-click', chosen.selector, async () => {
    const point = await visibleInactivePoint(track)
    await page.mouse.click(point.x, point.y)
    const moving = await track.getAttribute('data-navigation-state')
    const settleMs = await waitSettled(track)
    const state = await carouselState(track)
    assertion(state.logical === point.index, `clicked=${point.index} state=${JSON.stringify(state)}`)
    assertion(moving === 'moving', `expected native click to enter moving state, got ${moving}`)
    assertAgreement(state)
    return { point, movingImmediately: moving, settleMs, ...state }
  })
  output.nonAdjacentKeyboard = await findings.probe('input-nonadjacent-keyboard', chosen.selector, async () => {
    await track.focus(); await page.keyboard.press('End'); await waitSettled(track)
    const end = await carouselState(track)
    await page.keyboard.press('Home'); await waitSettled(track)
    const home = await carouselState(track)
    assertion(end.logical === await items.count() - 1 && home.logical === 0, `end=${JSON.stringify(end)} home=${JSON.stringify(home)}`)
    assertAgreement(end); assertAgreement(home)
    return { end, home }
  })
  output.rapid = await findings.probe('input-rapid', chosen.selector, async () => {
    await resetHome(page, track)
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
    const settleMs = await waitSettled(track); const state = await carouselState(track)
    assertion(state.logical === 3, `state=${JSON.stringify(state)}`); assertAgreement(state)
    return { ...state, settleMs }
  })
  output.interrupted = await findings.probe('input-interrupted-real-wheel', chosen.selector, async () => {
    await resetHome(page, track)
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40)
    const moving = await track.getAttribute('data-navigation-state')
    const box = await track.boundingBox(); assertion(box, 'track has no bounding box')
    const before = (await carouselState(track)).scrollLeft
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(300, 0)
    const settleMs = await waitSettled(track); const state = await carouselState(track)
    assertion(moving === 'moving', `input did not interrupt an active animation: ${moving}`)
    assertion(Math.abs(state.scrollLeft - before) >= 1, `real wheel did not change scrollLeft: before=${before} after=${state.scrollLeft}`)
    assertAgreement(state)
    return { movingBeforeWheel: moving, before, settleMs, ...state }
  })
  output.pointerDrag = await findings.probe('input-pointer-drag', chosen.selector, async () => {
    await resetHome(page, track)
    const box = await track.boundingBox(); assertion(box, 'track has no bounding box')
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2)
    await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 8 }); await page.mouse.up()
    await waitSettled(track); const state = await carouselState(track)
    assertion(state.logical > 0, `state=${JSON.stringify(state)}`); assertAgreement(state)
    return state
  })
  output.wheels = await findings.probe('input-wheel-axis-real', chosen.selector, async () => {
    await resetHome(page, track)
    let box = await track.boundingBox(); assertion(box, 'track has no bounding box for horizontal wheel')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    const horizontalBefore = await carouselState(track); const pageBeforeHorizontal = await page.evaluate(() => scrollY)
    await page.mouse.wheel(300, 0); await waitSettled(track)
    const horizontalAfter = await carouselState(track); const pageAfterHorizontal = await page.evaluate(() => scrollY)
    assertion(horizontalAfter.scrollLeft > horizontalBefore.scrollLeft, JSON.stringify({ horizontalBefore, horizontalAfter }))
    assertion(Math.abs(pageAfterHorizontal - pageBeforeHorizontal) < 1, `horizontal wheel scrolled page: ${pageBeforeHorizontal}->${pageAfterHorizontal}`)
    assertAgreement(horizontalAfter)
    await resetHome(page, track); await track.scrollIntoViewIfNeeded(); box = await track.boundingBox()
    assertion(box, 'track has no bounding box for vertical wheel')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    const verticalBefore = await carouselState(track); const pageBeforeVertical = await page.evaluate(() => scrollY)
    await page.mouse.wheel(0, 300); await page.waitForTimeout(150)
    const verticalAfter = await carouselState(track); const pageAfterVertical = await page.evaluate(() => scrollY)
    assertion(Math.abs(verticalAfter.scrollLeft - verticalBefore.scrollLeft) < 1, JSON.stringify({ verticalBefore, verticalAfter }))
    assertion(pageAfterVertical > pageBeforeVertical, `vertical wheel did not scroll page: ${pageBeforeVertical}->${pageAfterVertical}`)
    assertAgreement(verticalAfter)
    return { horizontal: { before: horizontalBefore, after: horizontalAfter, pageBeforeHorizontal, pageAfterHorizontal }, vertical: { before: verticalBefore, after: verticalAfter, pageBeforeVertical, pageAfterVertical } }
  })
  output.keyboard = await findings.probe('input-keyboard', chosen.selector, async () => {
    await track.focus(); await page.keyboard.press('End'); await waitSettled(track); const end = await activeIndex(track)
    await page.keyboard.press('ArrowLeft'); await waitSettled(track); const left = await activeIndex(track)
    await page.keyboard.press('Home'); await waitSettled(track); const home = await activeIndex(track)
    assertion(end === await items.count() - 1 && left === end - 1 && home === 0, `end=${end} left=${left} home=${home}`)
    return { end, left, home }
  })
  output.focusAndInert = await findings.probe('focus-inert-offscreen-tabs', chosen.selector, async () => {
    await track.focus()
    const focus = await track.evaluate((node) => { const style = getComputedStyle(node); return { active: node === document.activeElement, focusVisible: node.matches(':focus-visible'), outline: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow } })
    const inert = await chosen.root.locator('[data-focal-carousel-item][inert] a[href], [data-focal-carousel-item][inert] button, [data-focal-carousel-item][inert] input, [data-focal-carousel-item][inert] select, [data-focal-carousel-item][inert] textarea, [data-focal-carousel-item][inert] [tabindex]').evaluateAll((nodes) => nodes.map((node) => { node.focus(); return { tag: node.tagName, label: node.getAttribute('aria-label') || node.textContent?.trim(), receivedFocus: document.activeElement === node } }))
    assertion(focus.active && focus.focusVisible && (focus.outline !== 'none' || focus.boxShadow !== 'none'), JSON.stringify(focus))
    assertion(inert.every((row) => !row.receivedFocus), JSON.stringify(inert.filter((row) => row.receivedFocus)))
    return { focus, inertCandidates: inert.length, inertFocusLeaks: inert.filter((row) => row.receivedFocus) }
  })
  output.expandCollapse = await findings.probe('input-expand-collapse', chosen.selector, async () => {
    const expand = chosen.root.locator('button[aria-expanded="false"]').first(); assertion(await expand.count() === 1, 'missing expand button')
    await expand.click(); const collapse = chosen.root.locator('button[aria-expanded="true"]').first(); await collapse.waitFor({ state: 'visible' })
    assertion(await collapse.evaluate((node) => node === document.activeElement), 'collapse button did not receive focus')
    await collapse.click(); assertion(await expand.evaluate((node) => node === document.activeElement), 'expand button did not regain focus')
    return { expandedFocus: true, restoredFocus: true }
  })
  output.fetchXhrDuringInputs = requestCounter.value
  return output
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180)
}

export async function captureAllCrops(page, outDir, findings, missingFilenames = []) {
  const groups = [
    { selector: '[data-source-case]', attr: 'data-source-case', folder: 'sources' },
    { selector: '[data-composition-case]', attr: 'data-composition-case', folder: 'compositions' },
  ]
  const result = { sources: [], compositions: [] }
  for (const group of groups) {
    const locator = page.locator(group.selector)
    for (let index = 0; index < await locator.count(); index += 1) {
      const item = locator.nth(index)
      const key = await item.getAttribute(group.attr) || `missing-${index}`
      const relativePath = `crops/${group.folder}/${String(index + 1).padStart(3, '0')}-${safeName(key)}.png`
      const evidence = `${group.selector}[${group.attr}="${key}"]`
      await item.scrollIntoViewIfNeeded()
      let imageSource = await item.locator('img').first().getAttribute('src') || ''
      try { imageSource = decodeURIComponent(imageSource) } catch { /* retain the DOM source */ }
      if (missingFilenames.some((filename) => imageSource.includes(filename))) {
        findings.fail('individual-crop-image-load', evidence, `required source is absent: ${imageSource}`)
      } else await findings.probe('individual-crop-image-load', evidence, async () => {
        const images = item.locator('img')
        for (let imageIndex = 0; imageIndex < await images.count(); imageIndex += 1) {
          const image = images.nth(imageIndex)
          await image.scrollIntoViewIfNeeded()
          await image.waitFor({ state: 'visible', timeout: 30_000 })
          await image.evaluate((img) => img.decode())
        }
      })
      await findings.probe('individual-crop', evidence, async () => {
        await item.screenshot({ path: `${outDir}/${relativePath}`, animations: 'disabled', timeout: 30_000 })
        result[group.folder].push({ key, screenshot: relativePath })
      })
    }
  }
  return result
}

export async function captureSectionMatrix(page, outDir, label, findings) {
  const sections = [
    ['role', '[data-composition-case][data-case-kind="role"]'],
    ['non-role', '[data-composition-case][data-case-kind="non-role"]'],
    ['states', '[data-state-case="active"]'],
    ['sources', '[data-source-case]'],
    ['stress', '[data-stress-count="200"]'],
  ]
  const paths = []
  for (const [name, selector] of sections) await findings.probe('matrix-screenshot', selector, async () => {
    const item = page.locator(selector).first()
    await item.scrollIntoViewIfNeeded(); await page.waitForTimeout(60)
    const path = `screenshots/${label}-${name}.png`
    await page.screenshot({ path: `${outDir}/${path}`, animations: 'disabled' }); paths.push(path)
  })
  return paths
}

export async function captureProfileMatrix(page, profileURL, outDir, label, findings) {
  const paths = []
  await page.mouse.move((page.viewportSize()?.width ?? 1440) / 2, 100)
  const opened = await findings.probe('profile-members-type-route', profileURL, async () => {
    if (page.url() !== profileURL) {
      const response = await page.goto(profileURL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      if (!response?.ok()) throw new Error(`GET ${profileURL} returned ${response?.status() ?? 'no response'}`)
    }
    await page.waitForSelector('[data-testid="member-profile-hero-panel"]', { timeout: 90_000 })
  })
  if (opened === null) return paths
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Drawer schließen', exact: true }).waitFor({ state: 'hidden' })
  for (const [name, selector] of [['profile-hero', '[data-testid="member-profile-hero-panel"]'], ['profile-badges', '[data-badge-group]']]) await findings.probe('profile-matrix-screenshot', selector, async () => {
    const target = page.locator(selector).first()
    await target.scrollIntoViewIfNeeded(); await page.waitForTimeout(100)
    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
    if (overflow.scrollWidth > overflow.clientWidth + 1) throw new Error(`horizontal overflow ${JSON.stringify(overflow)}`)
    const path = `screenshots/${label}-${name}.png`
    await page.screenshot({ path: `${outDir}/${path}`, animations: 'disabled' }); paths.push(path)
  })
  return paths
}

export async function makeContactSheets(browser, outDir, crops, findings) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  const outputs = []
  try {
    for (const [kind, rows] of Object.entries(crops)) {
      const columns = kind === 'compositions' ? 3 : 4
      const batchSize = kind === 'compositions' ? 9 : 16
      const viewportHeight = kind === 'compositions' ? 520 : 280
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const batch = rows.slice(offset, offset + batchSize)
        const cards = batch.map((row) => {
          const data = readFileSync(`${outDir}/${row.screenshot}`).toString('base64')
          return `<figure><div><img src="data:image/png;base64,${data}"></div><figcaption>${row.key.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</figcaption></figure>`
        }).join('')
        await page.setContent(`<style>html{background:#171b26;color:#fff;font:15px system-ui}body{margin:20px}main{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:14px}figure{margin:0;background:#fff1;border:1px solid #fff3;border-radius:12px;padding:10px;min-width:0}figure div{width:100%;height:${viewportHeight}px;min-width:0;min-height:0;display:grid;place-items:center;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 50%/20px 20px;border-radius:8px}img{display:block;width:100%;height:100%;min-width:0;min-height:0;object-fit:contain}figcaption{padding-top:8px;overflow-wrap:anywhere}</style><main>${cards}</main>`)
        await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0))
        const containment = await page.locator('figure').evaluateAll((figures) => figures.map((figure, index) => {
          const host = figure.querySelector('div'); const img = figure.querySelector('img')
          const hostRect = host.getBoundingClientRect(); const imageRect = img.getBoundingClientRect(); const style = getComputedStyle(img)
          const scale = Math.min(imageRect.width / img.naturalWidth, imageRect.height / img.naturalHeight)
          const renderedWidth = img.naturalWidth * scale; const renderedHeight = img.naturalHeight * scale
          const rendered = { left: imageRect.left + (imageRect.width - renderedWidth) / 2, top: imageRect.top + (imageRect.height - renderedHeight) / 2, width: renderedWidth, height: renderedHeight }
          const contained = rendered.left >= hostRect.left - 0.5 && rendered.left + rendered.width <= hostRect.right + 0.5
            && rendered.top >= hostRect.top - 0.5 && rendered.top + rendered.height <= hostRect.bottom + 0.5
          return { index, contained, objectFit: style.objectFit, objectPosition: style.objectPosition, rendered, image: { width: imageRect.width, height: imageRect.height }, host: { width: hostRect.width, height: hostRect.height }, natural: { width: img.naturalWidth, height: img.naturalHeight } }
        }))
        assertion(containment.every((row) => row.contained && row.objectFit === 'contain' && row.natural.width > 0 && row.natural.height > 0), JSON.stringify(containment.filter((row) => !row.contained || row.objectFit !== 'contain' || !row.natural.width || !row.natural.height)))
        const path = `contact-sheets/${kind}-${String(offset / batchSize + 1).padStart(2, '0')}.png`
        await findings.probe('contact-sheet', path, () => page.screenshot({ path: `${outDir}/${path}`, fullPage: true, animations: 'disabled' }))
        outputs.push({ path, columns, viewportHeight, containment })
      }
    }
  } finally { await page.close() }
  return outputs
}
