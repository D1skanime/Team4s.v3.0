// Run inside the existing frontend container; no additional runtime required.
// node /.planning/phases/151-erfolgsbadge-karussell-konsolidierung/checks/check-native-touch.cjs
const { createRequire } = require('node:module')
const { writeFileSync, mkdirSync } = require('node:fs')
const { chromium } = createRequire('/app/package.json')('playwright')
const assert = require('node:assert/strict')

async function swipe(cdp, page, from, to) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  for (let step = 1; step <= 10; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x + (to.x - from.x) * step / 10, y: from.y + (to.y - from.y) * step / 10 }],
    })
    await page.waitForTimeout(18)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(350)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const outDir = '/tmp/team4s-phase151-native-touch'
  mkdirSync(outDir, { recursive: true })
  const rows = []
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion })
      const page = await context.newPage()
      await page.goto('http://127.0.0.1:3000/dev/ui-system/achievements', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-achievement-gallery][data-gallery-ready="true"]')
      const track = page.locator('[data-stress-count="100"] [role="region"]')
      await track.scrollIntoViewIfNeeded()
      await page.evaluate(() => {
        window.phase151TouchEvents = []
        for (const type of ['touchstart', 'touchmove', 'pointerdown', 'pointermove', 'pointercancel']) {
          document.addEventListener(type, event => window.phase151TouchEvents.push({ type, trusted: event.isTrusted, pointerType: event.pointerType }), { passive: true })
        }
      })
      const cdp = await context.newCDPSession(page)
      const state = () => track.evaluate(node => ({
        active: [...node.querySelector('[data-focal-carousel-items]').children].filter(el => el.hasAttribute('data-focal-carousel-item')).findIndex(el => el.getAttribute('aria-current') === 'true'),
        left: node.scrollLeft,
        navigation: node.getAttribute('data-navigation-state'),
        pageY: window.scrollY,
      }))
      const before = await state()
      const box = await track.boundingBox()
      assert(box)
      const y = Math.max(110, Math.min(700, box.y + box.height / 2))
      await swipe(cdp, page, { x: box.x + box.width * .85, y }, { x: box.x + box.width * .15, y })
      const horizontal = await state()
      assert(horizontal.active > before.active, 'native horizontal touch must advance the active card')
      assert.equal(horizontal.navigation, 'settled')
      await page.screenshot({ path: `${outDir}/${reducedMotion}-horizontal.png`, animations: 'disabled' })
      await swipe(cdp, page, { x: box.x + box.width / 2, y }, { x: box.x + box.width / 2, y: Math.max(80, y - 180) })
      const vertical = await state()
      assert(vertical.pageY > horizontal.pageY + 20, 'native vertical touch must scroll the document')
      assert.equal(vertical.active, horizontal.active, 'vertical pan must preserve active card')
      await track.scrollIntoViewIfNeeded()
      await track.focus()
      await page.keyboard.press('Home')
      await page.waitForTimeout(350)
      const cancelBox = await track.boundingBox()
      const cancelY = Math.max(110, Math.min(700, cancelBox.y + cancelBox.height / 2))
      const touch = { x: cancelBox.x + cancelBox.width * .7, y: cancelY }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: touch.x - 45 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
      await page.waitForTimeout(350)
      const cancelled = await state()
      const clickPoint = await track.locator('[data-focal-carousel-item]').nth(1).evaluate(el => {
        const item = el.getBoundingClientRect()
        const region = el.closest('[role="region"]').getBoundingClientRect()
        return { x: Math.min(region.right - 2, item.left + 12), y: (Math.max(region.top, item.top) + Math.min(region.bottom, item.bottom)) / 2 }
      })
      await page.mouse.click(clickPoint.x, clickPoint.y)
      await page.waitForTimeout(350)
      const afterCancelClick = await state()
      assert.equal(cancelled.active, 0)
      assert.equal(afterCancelClick.active, 1, 'first genuine click after native cancellation must activate neighbor')
      const emphasis = await track.locator('[data-focal-carousel-item]').evaluateAll(items => items.slice(0, 3).map(el => ({
        active: el.getAttribute('aria-current') === 'true',
        opacity: Number(getComputedStyle(el).opacity),
        transition: getComputedStyle(el).transitionDuration,
      })))
      assert(emphasis.filter(item => !item.active).every(item => item.opacity < emphasis.find(active => active.active).opacity))
      if (reducedMotion === 'reduce') assert(emphasis.every(item => item.transition === '0s'))
      const events = await page.evaluate(() => window.phase151TouchEvents)
      assert(events.some(event => event.type === 'touchstart' && event.trusted))
      assert(events.some(event => event.type === 'pointerdown' && event.pointerType === 'touch' && event.trusted))
      rows.push({ reducedMotion, before, horizontal, vertical, cancelled, afterCancelClick, emphasis, trustedTouchEvents: events.filter(event => event.trusted).length, events })
      await context.close()
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    const page = await context.newPage()
    await page.mouse.move(720, 450)
    await page.goto('http://127.0.0.1:3000/dev/ui-system/achievements', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-gallery-ready="true"]')
    const probe = page.locator('[data-container-probe]')
    await probe.scrollIntoViewIfNeeded()
    const autoSizes = await probe.locator('[data-achievement-slot] img').evaluateAll(async images => {
      await Promise.all(images.map(image => image.decode()))
      return images.map(image => ({
        sizes: image.sizes, loading: image.loading, width: image.getBoundingClientRect().width,
        naturalWidth: image.naturalWidth, candidate: Number(new URL(image.currentSrc).searchParams.get('w')),
        required: Math.ceil(image.getBoundingClientRect().width * devicePixelRatio),
        candidates: image.srcset.split(',').map(candidate => Number(candidate.trim().match(/ (\d+)w$/)?.[1])).filter(Boolean),
      }))
    })
    assert(autoSizes.length > 0)
    for (const image of autoSizes) {
      assert.equal(image.loading, 'lazy')
      assert(image.sizes.startsWith('auto,'))
      assert(Math.abs(image.naturalWidth - image.width) <= 1, 'native density-corrected width must follow the actual container image box')
      // Browsers may reuse an already cached larger candidate rather than fetch another URL.
      assert(image.candidate >= image.required, 'selected candidate must preserve DPR sharpness')
      image.minimumAdequateCandidate = image.candidates.find(width => width >= image.required)
    }
    await context.close()
    writeFileSync(`${outDir}/result.json`, JSON.stringify({ chromium: browser.version(), rows, autoSizes }, null, 2))
    console.log(JSON.stringify({ pass: true, rows: rows.map(({ events, ...row }) => row) }, null, 2))
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
