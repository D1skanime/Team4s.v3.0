import assert from 'node:assert/strict'
import { writeFile, readdir, readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { FIXTURE_ORIGIN, NEXT_ORIGIN, fixtureResponse, mediaCases, phase159State, startReadOnlyBrowserProxy } from './fixtures/anime-detail-fixture-server.mjs'

export async function runPhase159Checks({ browser, createPage, ready, check, results, output, delay, ua }) {
  const title = 'Ein anderer Anzeigename'
  const nextButton = page => page.getByRole('button', { name: 'Nächster Anime', exact: true })
  const prevButton = page => page.getByRole('button', { name: 'Vorheriger Anime', exact: true })
  const waitSeries = (page, id) => page.getByRole('heading', { name: 'Serie ' + id, exact: true }).waitFor()
  const grouped = state => state.requests.filter(request => request.path.endsWith('/episodes'))
  async function assertSelection(page, group, variant) {
    await page.getByRole('button', { name: group, exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: group, exact: true }).getAttribute('aria-pressed'), 'true')
    await page.locator('article').getByRole('link', { name: group, exact: true }).waitFor()
    await page.getByText(variant, { exact: true }).waitFor()
  }
  await check('159-storage-native-two-tabs-reload-clear-invalid-removed', async () => {
    const { context, page, state } = await createPage()
    const errors = []
    context.on('weberror', error => errors.push(error.error().message))
    try {
      await ready(page)
      const second = await context.newPage()
      await ready(second)
      for (const tab of [page, second]) await tab.locator('button[aria-controls^="episode-versions-"]').first().click()
      const before = state.requests.length
      await page.getByRole('button', { name: 'Zweite Gruppe', exact: true }).click()
      await assertSelection(page, 'Zweite Gruppe', 'Zweite Fassung')
      await assertSelection(second, 'Zweite Gruppe', 'Zweite Fassung')
      const selectionRequests = state.requests.length - before
      assert.equal(selectionRequests, 0, 'group selection reuses already loaded state')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('button[aria-controls^="episode-versions-"]').first().click()
      await assertSelection(page, 'Zweite Gruppe', 'Zweite Fassung')
      await page.evaluate(() => localStorage.setItem('anime:999:fansub-filter', '{"activeFansubGroupId":7}'))
      await assertSelection(second, 'Zweite Gruppe', 'Zweite Fassung')
      await page.evaluate(() => localStorage.clear())
      await assertSelection(second, 'Erste Gruppe', 'Primäre Fassung')
      for (const value of ['{"activeFansubGroupId":-1}', '{"activeFansubGroupId":999}', 'null', 'invalid']) {
        await page.evaluate(value => localStorage.setItem('anime:1:fansub-filter', value), value)
        await assertSelection(second, 'Erste Gruppe', 'Primäre Fassung')
      }
      await page.evaluate(() => localStorage.removeItem('anime:1:fansub-filter'))
      await assertSelection(second, 'Erste Gruppe', 'Primäre Fassung')
      phase159State.removedGroup = true
      await page.evaluate(() => localStorage.setItem('anime:1:fansub-filter', '{"activeFansubGroupId":9}'))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('button[aria-controls^="episode-versions-"]').first().click()
      await assertSelection(page, 'Erste Gruppe', 'Primäre Fassung')
      assert.equal(await page.getByRole('button', { name: 'Zweite Gruppe', exact: true }).count(), 0)
      assert.deepEqual(errors, [])
      return { nativeTabs: 2, hydrationErrors: errors, groupRequestsDuringSelection: selectionRequests }
    } finally { phase159State.removedGroup = false; await context.close() }
  })
  for (const mode of ['read', 'write']) await check('159-storage-blocked-' + mode, async () => {
    const { context, page } = await createPage()
    await context.addInitScript(mode => {
      const method = mode === 'read' ? 'getItem' : 'setItem'
      const original = Storage.prototype[method]
      Storage.prototype[method] = function(key, ...args) {
        if (key.startsWith('anime:')) throw new DOMException('Fixture storage denied', 'SecurityError')
        return original.call(this, key, ...args)
      }
    }, mode)
    try {
      await ready(page)
      await page.locator('button[aria-controls^="episode-versions-"]').first().click()
      await page.getByRole('button', { name: 'Zweite Gruppe', exact: true }).click()
      await assertSelection(page, 'Zweite Gruppe', 'Zweite Fassung')
    } finally { await context.close() }
  })
  await check('159-public-125-variants-neutral-same-number-retry-counts', async () => {
    const { context, page, state } = await createPage()
    let failOnce = true
    state.respond = async (route, url) => {
      if (url.pathname.endsWith('/episodes') && url.searchParams.has('cursor') && failOnce) {
        failOnce = false
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"message":"Fixture retry"}}' })
        return true
      }
    }
    try {
      await ready(page, 10)
      await page.locator('button[aria-controls^="episode-versions-"]').first().click()
      await page.getByText('+125 Versionen', { exact: true }).waitFor()
      const initial = grouped(state).length
      await page.getByRole('button', { name: 'Zweite Gruppe', exact: true }).click()
      await page.getByText('Im geladenen Ausschnitt ist noch keine Version dieser Gruppe vorhanden.', { exact: true }).waitFor()
      assert.equal(grouped(state).length, initial)
      const load = page.getByRole('button', { name: 'Weitere Episoden und Versionen laden', exact: true })
      await load.click()
      await page.getByText('Weitere Episoden konnten nicht geladen werden.', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click()
      await page.getByText('Weitere Episoden konnten nicht geladen werden.', { exact: true }).waitFor({ state: 'hidden' })
      for (let n = 0; n < 4; n++) { await load.click(); await expectIdle(page) }
      assert.equal(await load.count(), 0)
      await page.getByText('Zweite Fassung', { exact: true }).waitFor()
      assert.equal(await page.locator('button[aria-controls^="episode-versions-"]').count(), 2)
      assert.equal(await page.getByRole('button', { name: /Andere neutrale Episode/ }).getAttribute('aria-expanded'), 'false')
      await page.getByRole('button', { name: 'Erste Gruppe', exact: true }).click()
      assert.equal(await page.getByRole('link', { name: 'Version abspielen', exact: true }).count(), 124)
      assert.equal(await page.getByRole('link', { name: 'Version abspielen', exact: true }).first().getAttribute('href'), '/api/releases/10/stream?variant_id=100')
      await page.screenshot({ path: output + '/inventory-125.png', fullPage: true })
      return { variants: 125, neutralSameNumber: true, cursorRequestsIncludingRetry: grouped(state).length, groupRequests: 0, firstPlay: '/api/releases/10/stream?variant_id=100' }
    } finally { await context.close() }
  })
  await check('159-neutral-only-and-invalid-foreign-cursor-http', async () => {
    const { context, page } = await createPage()
    try {
      await ready(page, 11)
      await page.getByRole('button', { name: /Neutrale Folge/ }).waitFor()
      const first = fixtureResponse('/api/v1/anime/10/episodes', new URLSearchParams('limit=24'))
      const foreign = first.body.data.pagination.next_cursor
      const responses = []
      for (const query of ['cursor=invalid', 'cursor=' + encodeURIComponent(foreign), 'limit=101']) {
        const response = await fetch(FIXTURE_ORIGIN + '/api/v1/anime/11/episodes?projection=public&' + query)
        assert.equal(response.status, 400); responses.push(response.status)
      }
      return { fixtureStatuses: responses, actualBackendValidation: 'fresh isolated PG/handler gate' }
    } finally { await context.close() }
  })
  await check('159-grid-three-pages-first-slow-click-hover-focus-touch-retry', async () => {
    const { context, page, state } = await createPage({ width: 1440, contextOptions: { hasTouch: true } })
    let slow = true, fail = false, listRequests = 0
    state.respond = async (route, url) => {
      if (url.pathname !== '/api/v1/anime') return
      listRequests++
      if (slow) { slow = false; await delay(700) }
      if (fail) { fail = false; await delay(350); await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{}}' }); return true }
    }
    const query = page => 'page=' + page + '&per_page=2&q=grid&letter=S&content_type=anime&status=done'
    try {
      await page.goto(NEXT_ORIGIN + '/anime/21?grid_query=' + encodeURIComponent(query(1)))
      await waitSeries(page, 21)
      assert.equal(listRequests, 0)
      await nextButton(page).hover()
      await nextButton(page).click()
      await waitSeries(page, 22)
      assert.equal(listRequests, 2, 'slow hover, focus and click share one two-page neighbor load')
      assert.equal(new URLSearchParams(new URL(page.url()).searchParams.get('grid_query')).get('page'), '2')
      await nextButton(page).focus()
      await page.getByText('Serie 23', { exact: true }).waitFor()
      await nextButton(page).click()
      await waitSeries(page, 23)
      await nextButton(page).dispatchEvent('touchstart')
      await nextButton(page).click()
      await waitSeries(page, 24)
      assert.equal(new URLSearchParams(new URL(page.url()).searchParams.get('grid_query')).get('page'), '3')
      await prevButton(page).click()
      await waitSeries(page, 23)
      assert.equal(new URLSearchParams(new URL(page.url()).searchParams.get('grid_query')).get('page'), '2')
      assert.equal(new URLSearchParams(new URL(page.url()).searchParams.get('grid_query')).get('q'), 'grid')
      await page.mouse.move(700, 400)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitSeries(page, 23)
      fail = true
      await nextButton(page).click()
      await expectIdle(page, 'Nächster Anime')
      assert(page.url().includes('/anime/23?'))
      await nextButton(page).click()
      await waitSeries(page, 24)
      return { listRequests, initialRequests: 0, firstSlowClick: true, pages: [1,2,3,2,3] }
    } finally { await context.close() }
  })
  await check('159-abort-old-grid-and-public-context', async () => {
    const { context, page, state } = await createPage()
    let delayed = 0
    state.respond = async (route, url) => {
      if (url.pathname === '/api/v1/anime' || (url.pathname.endsWith('/episodes') && url.searchParams.has('cursor'))) {
        delayed++; await delay(900)
        try { await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{}}' }) } catch { /* navigation aborted this route */ }
        return true
      }
    }
    try {
      await page.goto(NEXT_ORIGIN + '/anime/21?grid_query=page%3D1%26per_page%3D2')
      await waitSeries(page, 21)
      await nextButton(page).click()
      await ready(page, 10)
      await page.getByRole('button', { name: 'Weitere Episoden und Versionen laden', exact: true }).click()
      await ready(page, 11)
      await delay(1100)
      assert(new URL(page.url()).pathname === '/anime/11')
      assert.equal(await page.getByText('Weitere Episoden konnten nicht geladen werden.', { exact: true }).count(), 0)
      return { delayedRequests: delayed, oldErrorIgnored: true }
    } finally { await context.close() }
  })
  await check('159-manifest-SPA-TTL-focus-sharing-retry', async () => {
    const { context, page, state } = await createPage()
    try {
      await page.clock.install()
      await ready(page, 80)
      const logo = page.getByRole('img', { name: title + ' Logo', exact: true })
      await logo.waitFor()
      const count = () => state.requests.filter(request => request.path === '/api/v1/anime/80/backdrops').length
      assert.equal(count(), 1)
      phase159State.manifestVersion = 2
      await page.clock.fastForward(61_000)
      assert.equal(count(), 1)
      await page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')) })
      await page.waitForFunction(() => document.querySelector('img[alt$=" Logo"]')?.getAttribute('src')?.includes('logo-2'))
      assert.equal(count(), 2)
      phase159State.manifestFailure = true
      await page.clock.fastForward(61_000)
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await logo.waitFor({ state: 'hidden' })
      phase159State.manifestFailure = false
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await logo.waitFor()
      assert.equal(count(), 4)
      return { consumers: ['logo','banner','rotator'], initialRequests: 1, focusBurstRequests: 1, retryRequests: 1, sameSPA: true }
    } finally { phase159State.manifestFailure = false; phase159State.manifestVersion = 1; await context.close() }
  })
  await check('159-manifest-retention-more-than20-SPA-acquires', async () => {
    const { context, page, state } = await createPage({ width: 1440 })
    await context.addInitScript(() => { const fixed = Date.now(); Date.now = () => fixed })
    try {
      await page.goto(NEXT_ORIGIN + '/anime/20?grid_query=' + encodeURIComponent('page=1&per_page=25&q=retention'))
      await waitSeries(page, 20)
      for (let id = 21; id <= 44; id++) { const manifest = page.waitForResponse(response => response.url().endsWith('/anime/' + id + '/backdrops')); await nextButton(page).click(); await waitSeries(page, id); await manifest }
      for (let id = 43; id >= 20; id--) { await prevButton(page).click(); await waitSeries(page, id) }
      await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Serie 20')
      const loads = state.requests.filter(request => request.path.endsWith('/backdrops'))
      assert.equal(loads.filter(request => request.path === '/api/v1/anime/20/backdrops').length, 2)
      return { sequentialAnimeIDs: 25, spaNavigations: 48, TTLClockFrozen: true, manifests: loads, oldestReacquired: 2 }
    } finally { await context.close() }
  })
  await runMedia({ browser, check, results, output, ua })
}
async function expectIdle(page, name = 'Weitere Episoden und Versionen laden') {
  await page.waitForFunction(name => {
    const button = [...document.querySelectorAll('button')].find(element => (element.getAttribute('aria-label') || element.textContent?.trim()) === name)
    return !button || !button.disabled
  }, name)
}
async function runMedia({ browser, check, results, output, ua }) {
  const proxy = await startReadOnlyBrowserProxy()
  // Cache measurements use no Playwright routing. An explicit GET-only proxy
  // admits only this run's two loopback origins and rejects CONNECT/writes.
  const mediaBrowser = await browser.browserType().launch({ headless: true, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:3160', '--proxy-bypass-list=<-loopback>'] })
  results.media = []
  try {
    await check('159-production-media-original-display-animations-headers', async () => {
      const names = (await readdir('public/covers')).filter(name => name.startsWith('cover_'))
      const existing = names[0]
      const cases = [
        ['/covers/' + existing, '/covers/display/' + existing + '?display_width=512'],
        ['/media/anime/phase159/static.png', '/media/anime/phase159/static.png?display_width=512'],
        ['/api/v1/media/files/static.png', '/api/v1/media/files/static.png?display_width=512'],
        ...['gif','webp','png'].map(ext => ['/api/v1/media/files/animated.' + ext, '/api/v1/media/files/animated.' + ext + '?display_width=512']),
        ['/api/v1/media/files/static.avif', '/api/v1/media/files/static.avif?display_width=512'],
      ]
      const measurements = []
      for (const [original, display] of cases) {
        const rawResponse = await fetch(NEXT_ORIGIN + original)
        assert.equal(rawResponse.status, 200)
        const raw = Buffer.from(await rawResponse.arrayBuffer())
        const response = await fetch(NEXT_ORIGIN + display, { headers: { Range: 'bytes=0-10', 'If-None-Match': 'original' } })
        assert.equal(response.status, 200, display)
        assert.equal(response.headers.get('content-type'), 'image/webp')
        assert.equal(response.headers.get('content-range'), null)
        const bytes = Buffer.from(await response.arrayBuffer())
        const metadata = await sharp(bytes, { animated: true }).metadata()
        assert(metadata.width <= 512); assert((metadata.pages || 1) === 1); assert(bytes.length <= 4*1024*1024)
        if (original.includes('animated')) {
          const pixel = await sharp(bytes).ensureAlpha().raw().toBuffer()
          assert(pixel[4] > pixel[6], 'red first frame retained')
        }
        const head = await fetch(NEXT_ORIGIN + display, { method: 'HEAD' })
        assert.equal(head.status, 200); assert.equal((await head.arrayBuffer()).byteLength, 0)
        measurements.push({ original, display, originalBytes: raw.length, bytes: bytes.length, mime: response.headers.get('content-type'), cache: response.headers.get('cache-control'), width: metadata.width, height: metadata.height, pages: metadata.pages || 1 })
      }
      const originalPlaceholder = await readFile('public/covers/placeholder.jpg')
      assert.equal(originalPlaceholder.length, 352)
      assert.equal((await fetch(NEXT_ORIGIN + '/covers/display/placeholder.jpg?display_width=512')).status, 415)
      assert.equal((await fetch(NEXT_ORIGIN + '/covers/display/placeholder.png?display_width=512')).status, 200)
      await writeFile(output + '/media-http.json', JSON.stringify(measurements,null,2))
      return measurements
    })
    for (const width of [390,1440]) for (const dpr of [1,2]) for (const media of mediaCases) await check('159-media-' + media.name + '-' + width + '-dpr' + dpr, async () => {
      const context = await mediaBrowser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr, userAgent: ua, serviceWorkers: 'block' })
      const page = await context.newPage(), cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')
      const network = new Map(), memoryCache = new Set()
      cdp.on('Network.responseReceived', event => network.set(event.requestId, { url: event.response.url, status: event.response.status, mime: event.response.mimeType, diskCache: !!event.response.fromDiskCache, serviceWorker: !!event.response.fromServiceWorker, memoryCache: memoryCache.has(event.requestId), headers: event.response.headers, requestId: event.requestId }))
      cdp.on('Network.requestServedFromCache', event => { memoryCache.add(event.requestId); const record = network.get(event.requestId); if (record) record.memoryCache = true })
      cdp.on('Network.loadingFinished', event => { const record = network.get(event.requestId); if (record) record.transferBytes = event.encodedDataLength })
      try {
        const observations = []
        for (const temperature of ['cold','warm']) {
          network.clear(); memoryCache.clear()
          await page.goto(NEXT_ORIGIN + '/anime/' + media.id, { waitUntil: 'domcontentloaded' })
          // Unselected app-shell RSC prefetches can stay pending in a selective build.
          // Wait for the actual four cover consumers and completed image instead.
          await page.waitForFunction(() => document.querySelector('img[class*="page_poster__"]')?.complete && document.querySelector('[class*="AnimeBackdropRotator_image__"]'))
          const urls = await page.evaluate(async () => {
            const poster = document.querySelector('img[class*="page_poster__"]')
            const reflection = document.querySelector('[class*="page_posterWrapper__"]')
            const hero = document.querySelector('[class*="page_bannerImage__"]')
            const rotator = document.querySelector('[class*="AnimeBackdropRotator_image__"]')
            const fromCSS = value => value.match(/url\(["']?(.*?)["']?\)/)?.[1]
            const sources = [poster?.currentSrc, fromCSS(getComputedStyle(reflection).getPropertyValue('--poster-image')), fromCSS(getComputedStyle(hero).backgroundImage), fromCSS(getComputedStyle(rotator).backgroundImage)]
            return { sources: sources.map(source => source ? new URL(source, location.href).href : null), naturalWidth: poster?.naturalWidth, naturalHeight: poster?.naturalHeight, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth }
          })
          assert(urls.scrollWidth <= width)
          assert(urls.sources.every(Boolean), JSON.stringify(urls))
          assert.equal(new Set(urls.sources).size, 1)
          const record = [...network.values()].find(record => record.url === urls.sources[0])
          assert(record, 'actual network/cache record exists for ' + urls.sources[0])
          const failed = media.name.includes('404') || media.name.includes('500')
          if (failed) {
            assert.equal(record.status, media.name.includes('500') ? 500 : 404)
            assert.equal(urls.naturalWidth, 0)
          } else {
            assert.equal(record.status, 200)
            assert(urls.naturalWidth > 0 && urls.naturalWidth <= 512)
            assert.match(record.mime, /^image\//)
            const body = await cdp.send('Network.getResponseBody', { requestId: record.requestId })
            const bytes = Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8')
            const decoded = await sharp(bytes, { animated: true }).metadata()
            assert(decoded.width <= 512); assert((decoded.pages || 1) === 1)
            record.bodyBytes = bytes.length; record.decoded = { width: decoded.width, height: decoded.height, pages: decoded.pages || 1 }
          }
          // There may be API originals inside the isolated server transform. The browser
          // must only request the finished cover source, never a raw original retry.
          const imageRequests = [...network.values()].filter(record => record.mime.startsWith('image/') && /\/(covers|media|api\/v1\/media)\//.test(new URL(record.url).pathname))
          assert(imageRequests.every(record => record.url === urls.sources[0]), JSON.stringify(imageRequests))
          const sourceRequests = [...network.values()].filter(response => response.url === urls.sources[0])
          const bodyTransfers = sourceRequests.filter(response => response.transferBytes > 0 && !response.diskCache && !response.memoryCache && !response.serviceWorker)
          const imageBodyTransfers = bodyTransfers.filter(response => response.status === 200 && response.mime.startsWith('image/'))
          assert(imageBodyTransfers.length <= 1, 'identical cover URL must have at most one image body transfer: ' + JSON.stringify(sourceRequests))
          if (failed) assert.equal(imageBodyTransfers.length, 0, 'failed sources never transfer a fallback image')
          observations.push({ temperature, ...urls, response: record, sourceRequests, bodyTransferCount: bodyTransfers.length, imageBodyTransferCount: imageBodyTransfers.length, errorResponseCount: sourceRequests.filter(response => response.status >= 400).length, totalTransferBytes: bodyTransfers.reduce((sum, response) => sum + response.transferBytes, 0) })
        }
        const warm = observations[1].response
        const cacheControl = Object.entries(warm.headers).find(([name]) => name.toLowerCase() === 'cache-control')?.[1] || ''
        const cacheable = warm.status === 200 && /max-age=/.test(cacheControl) && !/no-store/.test(cacheControl)
        if (cacheable) assert(warm.diskCache || warm.memoryCache || warm.transferBytes === 0, 'warm public display must use browser cache')
        if (/no-store/.test(cacheControl)) assert(!warm.diskCache && !warm.memoryCache, 'private/no-store must not reuse browser cache')
        const row = { media: media.name, viewport: width, dpr, cacheable, observations }
        results.media.push(row)
        if (width === 390 && dpr === 1) await page.screenshot({ path: output + '/media-' + media.name + '.png' })
        return row
      } finally { await context.close() }
    })
    results.mediaProxy = proxy.requests
    results.mediaProxyBlocked = proxy.requests.filter(request => request.blocked)
  } finally { await mediaBrowser.close(); await proxy.close() }
}
