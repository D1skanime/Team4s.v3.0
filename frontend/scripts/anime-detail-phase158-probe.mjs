import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { chromium } from 'playwright'
import { startFixtureServer, fixtureResponse, FIXTURE_ORIGIN, NEXT_ORIGIN, title, prettyPath } from './fixtures/anime-detail-fixture-server.mjs'

const phase = process.env.PHASE159_FIXTURES === '1' ? 159 : 158
const output = process.env.PHASE158_OUTPUT || '/tmp/team4s-phase' + phase + '-evidence'
await mkdir(output, { recursive: true })
assert.equal(process.cwd(), '/tmp/team4s-phase' + phase + '-production')
assert.equal(process.env.PHASE158_FIXTURES || process.env.PHASE159_FIXTURES, '1')
assert.equal(process.env.API_INTERNAL_URL, FIXTURE_ORIGIN)
// Reset only this guarded disposable build's fetch cache so every request count is cold.
await rm('.next/cache/fetch-cache', { recursive: true, force: true })
const fixture = await startFixtureServer()
const results = { measuredAt: new Date().toISOString(), mode: 'isolated-production', checks: [], geometry: [], requests: [], blockedExternal: [], fixtures: { next: NEXT_ORIGIN, api: FIXTURE_ORIGIN } }
let browser
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3158'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'production' } })
results.resources = { probePID: process.pid, nextPID: next.pid, cwd: process.cwd(), listeners: { next: NEXT_ORIGIN, fixture: FIXTURE_ORIGIN }, recordedAt: new Date().toISOString() }
await writeFile(output + '/probe-resources.json', JSON.stringify(results.resources, null, 2))
let serverLog = ''
next.stdout.on('data', data => { serverLog += data })
next.stderr.on('data', data => { serverLog += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function check(name, body) {
  if (process.env.PHASE158_FILTER && !name.includes(process.env.PHASE158_FILTER)) { results.checks.push({ name, status: 'NOT_RUN' }); return }
  try { const detail = await body(); results.checks.push({ name, status: 'PASS', detail }); console.log('PASS', name) }
  catch (error) { results.checks.push({ name, status: 'FAIL', error: String(error.stack || error) }); console.log('FAIL', name, String(error.message)) }
}
const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const token = (id = 101, expired = false) => ['eyJhbGciOiJub25lIn0', Buffer.from(JSON.stringify({ sub: 'fixture-' + id, exp: Math.floor(Date.now()/1000) + (expired ? -120 : 3600) })).toString('base64url'), 'isolated'].join('.')
const authData = (id = 101) => ({ token_type: 'Bearer', access_token: token(id), refresh_token: 'fixture-refresh', access_token_expires_at: Math.floor(Date.now()/1000)+3600, access_token_expires_in: 3600, refresh_token_expires_at: Math.floor(Date.now()/1000)+7200, refresh_token_expires_in: 7200, app_user_id: id, user_id: id, display_name: 'Fixture ' + id, session_id: 'fixture-session-' + id })
// Test boundary only: fake credentials are inserted exclusively into new loopback-only contexts.
function installSession({ access, refresh, id, expired = false }) {
  for (const [name, value] of Object.entries({ team4s_access_token: access || '', team4s_refresh_token: refresh || '', team4s_display_name: access || refresh ? 'Fixture ' + id : '' })) {
    document.cookie = name + '=' + encodeURIComponent(value) + '; Path=/; SameSite=Lax' + (value ? '' : '; Max-Age=0')
  }
  if (access || refresh) localStorage.setItem('team4s.auth.session_meta', JSON.stringify({ app_user_id: id, user_id: id, display_name: 'Fixture ' + id, session_id: 'fixture-session-' + id }))
  else localStorage.removeItem('team4s.auth.session_meta')
  if (access || refresh) localStorage.setItem('team4s.auth.private_session_meta', JSON.stringify({ access_token_expires_at: Math.floor(Date.now()/1000) + (expired ? -120 : 3600), refresh_token_expires_at: Math.floor(Date.now()/1000) + 7200 }))
  else localStorage.removeItem('team4s.auth.private_session_meta')
  window.dispatchEvent(new CustomEvent('team4s:auth-session-changed'))
}
async function createPage({ width = 390, session = 'none', watch = 404, contribution = 200, action = 500, comment = 500, refreshStatus = 200, contextOptions = {}, init } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width >= 768 ? 1024 : 844 }, userAgent: ua, serviceWorkers: 'block', ...contextOptions })
  const state = { watch, contribution, action, comment, refreshStatus, requests: [], refreshes: 0, writes: 0, delayContribution: false }
  if (init) await context.addInitScript(init)
  if (session !== 'none') await context.addInitScript(installSession, { access: session === 'refresh' ? '' : token(101, session === 'expired'), refresh: session === 'access' ? '' : 'fixture-refresh', id: 101, expired: session === 'expired' })
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method(), path = url.pathname
    if (url.origin !== NEXT_ORIGIN && url.origin !== FIXTURE_ORIGIN) { results.blockedExternal.push({ origin: url.origin, method }); await route.abort(); return }
    // No API request or non-GET browser request can reach the real Next proxy/backend.
    if (path.startsWith('/api/')) {
      state.requests.push({ path, method })
      const send = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      if (path === '/api/v1/auth/refresh' || path === '/api/auth/keycloak/token') {
        state.refreshes++
        if (state.refreshStatus !== 200) return send(state.refreshStatus, { error: { message: 'Fixture refresh denied' } })
        const data = authData()
        return send(200, path.includes('keycloak') ? { access_token: data.access_token, id_token: 'fixture-id-token', refresh_token: data.refresh_token, expires_in: 3600, refresh_expires_in: 7200 } : { data })
      }
      if (path === '/api/v1/me') return send(200, { data: { app_user_id: 101, legacy_user_id: 101, display_name: 'Fixture 101', status: 'active', session_id: 'fixture-session-101', global_roles: [], is_platform_admin: false } })
      if (path.includes('/watchlist')) {
        if (method !== 'GET') { state.writes++; return send(state.action, { error: { message: 'Isolierter Watchlist-Aktionsfehler' } }) }
        if (state.watch === 'network') return route.abort('failed')
        return send(state.watch, state.watch === 200 ? { data: { anime_id: 1, user_id: 101, status: 'planned' } } : { error: { message: 'Fixture status failed' } })
      }
      if (path.endsWith('/comments') && method !== 'GET') {
        state.writes++
        if (state.comment === 'network') return route.abort('failed')
        return send(state.comment, { error: { message: 'Isolierter Kommentarfehler' } })
      }
      if (path.endsWith('/contributions')) {
        if (state.delayContribution) await delay(1000)
        if (state.contribution === 'network') return route.abort('failed')
        if (state.contribution !== 200) return send(state.contribution, { error: { message: 'Fixture contribution failed' } })
      }
      if (method !== 'GET') { results.requests.push({ forbiddenWrite: method, path }); return route.abort() }
      if (state.respond) { const handled = await state.respond(route, url); if (handled) return }
      const result = fixtureResponse(path, url.searchParams)
      if (result.network) return route.abort()
      return send(result.status || 200, result.body)
    }
    if (method !== 'GET' || url.origin !== NEXT_ORIGIN) return route.abort()
    return route.continue()
  })
  const page = await context.newPage()
  await page.mouse.move(width / 2, 300)
  context.on('close', () => results.requests.push({ scope: 'browser-context', session, requests: state.requests, refreshes: state.refreshes, writesAbsorbed: state.writes }))
  page.setDefaultTimeout(12000)
  return { context, page, state }
}
async function ready(page, id = 1) {
  await page.goto(NEXT_ORIGIN + '/anime/' + id, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: title, exact: true }).waitFor()
}
try {
  for (let n = 0; n < 100 && !serverLog.includes('Ready'); n++) { if (next.exitCode !== null) throw new Error(serverLog); await delay(100) }
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  await check('fixture-rejects-nonGET', async () => { assert.equal((await fetch(FIXTURE_ORIGIN + '/api/v1/anime/1', { method: 'POST' })).status, 405) })
  // Cold request before browser navigation: Page plus Metadata must issue exactly one anime GET.
  await check('production-valid-metadata-and-request-count', async () => {
    const start = fixture.requests.length
    const response = await fetch(NEXT_ORIGIN + '/anime/1?grid_query=page%3D7', { headers: { 'User-Agent': ua } })
    const html = await response.text(), requests = fixture.requests.slice(start)
    assert.equal(response.status, 200)
    assert(html.includes('<title>' + title + ' | Team4s</title>'))
    assert.match(html, /rel="canonical" href="[^"]*\/anime\/1"/)
    assert(!html.includes('name="robots" content="noindex"'))
    assert.equal(requests.filter(r => r.path === '/api/v1/anime/1').length, 1)
    assert.equal(requests.filter(r => r.path.includes('watchlist')).length, 0)
    await writeFile(output + '/valid.html', html)
    results.requests.push({ scope: 'cold SSR Page+Metadata', requests })
    return { status: response.status, animeGets: 1, watchlistGets: 0, requests }
  })
  for (const id of ['1abc', '1.5', '0', '-1', '9007199254740992', '999999999']) await check('production404-' + id, async () => {
    const start = fixture.requests.length, response = await fetch(NEXT_ORIGIN + '/anime/' + id, { headers: { 'User-Agent': ua } }), html = await response.text()
    assert.equal(response.status, 404)
    assert.match(html, /name="robots" content="noindex"/)
    assert(!html.includes('<title>' + title + ' | Team4s</title>'))
    assert(!html.includes('rel="canonical"'))
    assert.equal(fixture.requests.slice(start).filter(r => r.path === '/api/v1/anime/1').length, 0)
    return { status: response.status, noindex: true, canonical: null }
  })
  for (const id of [500, 501]) await check('production-technical-error-' + id, async () => {
    const response = await fetch(NEXT_ORIGIN + '/anime/' + id, { headers: { 'User-Agent': ua } }), html = await response.text()
    assert.equal(response.status, 500)
    assert.match(html, /name="robots" content="noindex"/)
    assert(!html.includes('<title>' + title + ' | Team4s</title>'))
    assert(!html.includes('rel="canonical"'))
    return { status: response.status, noAnimeMetadata: true, robots: html.match(/name="robots" content="([^"]+)"/)?.[1] || null }
  })
  for (const width of [360, 390, 767, 768, 1440]) await check('geometry-colors-focus-slider-' + width, async () => {
    const { context, page } = await createPage({ width })
    try {
      await ready(page)
      const toggle = page.locator('button[aria-controls^="episode-versions-"]').first()
      for (const open of [false, true]) {
        if (open) await toggle.click()
        assert.equal(await toggle.getAttribute('aria-expanded'), String(open))
        const focusLink = page.getByRole('link', { name: 'Zum Gruppenbereich' })
        await focusLink.focus()
        await page.keyboard.press('Tab')
        await page.keyboard.press('Shift+Tab')
        const geometry = await page.evaluate(() => {
          const header = document.querySelector('button[aria-controls^="episode-versions-"]'), card = header.closest('li'), contribution = document.querySelector('section[aria-label="Mitwirkende Gruppen"] h2'), main = document.querySelector('main')
          const colors = e => ({ color: getComputedStyle(e).color, background: getComputedStyle(e).backgroundColor })
          const control = document.querySelector('a[aria-label="Zum Gruppenbereich"]'), bounds = control.getBoundingClientRect(), focus = getComputedStyle(control), ancestors = []
          const ring = parseFloat(focus.outlineWidth) + parseFloat(focus.outlineOffset)
          for (let e = control.parentElement; e; e = e.parentElement) { const css = getComputedStyle(e), rect = e.getBoundingClientRect(); if (['hidden','clip'].includes(css.overflowX) && (bounds.left - ring < rect.left || bounds.right + ring > rect.right)) ancestors.push(e.className || e.tagName) }
          window.scrollTo(200, window.scrollY)
          return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, rootScrollX: scrollX, header: colors(header), card: colors(card), contribution: colors(contribution), main: colors(main), focus: { control: 'Gruppenbereich', active: document.activeElement === control, outlineOffset: focus.outlineOffset, outlineStyle: focus.outlineStyle, outlineWidth: focus.outlineWidth, boxShadow: focus.boxShadow, left: bounds.left, right: bounds.right, clippedAncestors: ancestors } }
        })
        assert(geometry.scrollWidth <= width)
        assert.equal(geometry.rootScrollX, 0)
        assert.equal(geometry.header.color, 'rgb(28, 28, 30)')
        assert.equal(geometry.card.background, 'rgb(255, 255, 255)')
        assert.equal(geometry.contribution.color, 'rgb(255, 255, 255)')
        assert.equal(geometry.main.background, 'rgb(15, 15, 18)')
        assert(geometry.focus.active)
        assert(geometry.focus.outlineStyle !== 'none' || geometry.focus.boxShadow !== 'none')
        assert(geometry.focus.left >= 0 && geometry.focus.right <= width)
        assert.deepEqual(geometry.focus.clippedAncestors, [])
        results.geometry.push({ width, open, ...geometry })
        await focusLink.screenshot({ path: output + '/focus-' + width + '-' + (open ? 'open' : 'closed') + '.png' })
        await page.screenshot({ path: output + '/viewport-' + width + '-' + (open ? 'open' : 'closed') + '.png', fullPage: true })
      }
      const slider = page.locator('[class*="AnimeRelations_slider__"]')
      const before = await slider.evaluate(el => el.scrollLeft)
      await page.getByRole('button', { name: 'Related nach rechts scrollen' }).click()
      await page.waitForFunction(() => document.querySelector('[class*="AnimeRelations_slider__"]').scrollLeft > 0)
      const after = await slider.evaluate(el => el.scrollLeft)
      assert(after > before)
      return { sliderBefore: before, sliderAfter: after }
    } finally { await context.close() }
  })
  await check('anonymous-initial-and-lazy-request-budget', async () => {
    const { context, page, state } = await createPage({ width: 1440 })
    try {
      const start = fixture.requests.length
      await ready(page, 3)
      await page.getByText('Noch keine Mitwirkenden eingetragen.', { exact: true }).waitFor()
      const initialSSR = fixture.requests.slice(start)
      const initialClient = [...state.requests]
      assert.equal(initialSSR.filter(r => r.path === '/api/v1/anime/3').length, 1)
      assert.equal(initialClient.filter(r => r.path.endsWith('/backdrops')).length, 1)
      assert.equal(initialClient.filter(r => r.path.endsWith('/contributions')).length, 1)
      assert.equal(initialSSR.concat(initialClient).filter(r => r.path.includes('watchlist')).length, 0)
      const before = state.requests.length
      await page.locator('button[aria-controls^="episode-versions-"]').first().click()
      await page.getByRole('button', { name: 'Zweite Gruppe', exact: true }).click()
      await delay(500)
      assert.equal(state.requests.length, before)
      results.requests.push({ scope: 'fresh anonymous anime3', ssr: initialSSR, client: initialClient, lazyRequests: state.requests.slice(before) })
      return { ssr: initialSSR, client: initialClient, lazyRequests: 0 }
    } finally { await context.close() }
  })
  await check('empty-series', async () => {
    const { context, page } = await createPage()
    try { await ready(page, 2); await page.getByText('Keine Episoden-Versionen vorhanden.').waitFor(); assert.equal(await page.locator('button[aria-controls^="episode-versions-"]').count(), 0) }
    finally { await context.close() }
  })
  await check('authoritative-visible-primary-secondary-pretty-and-numeric', async () => {
    const { context, page } = await createPage({ width: 1440 })
    try {
      await ready(page)
      const link = page.getByRole('link', { name: 'Zum Gruppenbereich' })
      assert.equal(await link.getAttribute('href'), prettyPath)
      await page.getByRole('button', { name: 'Zweite Gruppe', exact: true }).click()
      assert.equal(await link.getAttribute('href'), prettyPath.replace('primary', 'secondary'))
      await page.getByRole('button', { name: 'Erste Gruppe', exact: true }).click()
      await link.click()
      await page.waitForURL(NEXT_ORIGIN + prettyPath)
      await page.getByText('Diese Projektgeschichte stammt aus isolierten Fixtures.').first().waitFor()
      const numeric = await page.goto(NEXT_ORIGIN + '/anime/1/group/7', { waitUntil: 'domcontentloaded' })
      assert.equal(numeric.status(), 200)
      await page.getByText('Diese Projektgeschichte stammt aus isolierten Fixtures.').first().waitFor()
      assert((await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith(prettyPath))
      return { visibleLink: prettyPath, numericHTTP: numeric.status(), numericCanonical: await page.locator('link[rel="canonical"]').getAttribute('href'), prettySelfCanonical: 'Existing pretty page has no metadata export; numeric canonical verified.' }
    } finally { await context.close() }
  })
  for (const session of ['none', 'access', 'refresh', 'expired']) await check('session-' + session, async () => {
    const { context, page, state } = await createPage({ session, watch: 200 })
    try {
      await ready(page)
      if (session === 'none') { assert.equal(await page.getByRole('button', { name: 'Anmeldung erforderlich', exact: true }).count(), 2); assert.equal(state.requests.filter(r => r.path.includes('watchlist')).length, 0) }
      else {
        await page.getByRole('button', { name: 'In Watchlist', exact: true }).waitFor()
        assert(await page.getByRole('button', { name: 'Kommentar absenden' }).isEnabled())
        await page.getByLabel('Kommentar', { exact: true }).fill('Isolierter Kommentar')
        await page.getByRole('button', { name: 'Kommentar absenden' }).click()
        await page.getByText('Isolierter Kommentarfehler', { exact: true }).waitFor()
        assert.equal(state.refreshes, session === 'access' ? 0 : 1)
      }
      return { refreshes: state.refreshes, writesAbsorbed: state.writes, requests: state.requests }
    } finally { await context.close() }
  })
  await check('expired-refresh-denied', async () => {
    const { context, page, state } = await createPage({ session: 'refresh', refreshStatus: 401 })
    try {
      const denied = page.waitForResponse(response => response.url().endsWith('/api/auth/keycloak/token') || response.url().endsWith('/api/v1/auth/refresh'))
      await ready(page)
      assert.equal((await denied).status(), 401)
      await page.waitForFunction(() => !document.cookie.includes('team4s_refresh_token='))
      await page.getByRole('button', { name: 'Anmeldung erforderlich', exact: true }).first().waitFor()
      assert.equal(state.writes, 0); assert.equal(state.refreshes, 1)
    }
    finally { await context.close() }
  })
  await check('session-login-account-change-logout-after-mount', async () => {
    const { context, page, state } = await createPage()
    try {
      await ready(page)
      await page.evaluate(installSession, { access: token(), refresh: '', id: 101 })
      await page.getByRole('button', { name: 'Zur Watchlist', exact: true }).waitFor()
      state.watch = 200
      await page.evaluate(installSession, { access: token(202), refresh: '', id: 202 })
      await page.getByRole('button', { name: 'In Watchlist', exact: true }).waitFor()
      await page.evaluate(installSession, { access: '', refresh: '', id: 202 })
      await page.getByRole('button', { name: 'Anmeldung erforderlich', exact: true }).first().waitFor()
      assert.equal(state.writes, 0)
      return { requests: state.requests }
    } finally { await context.close() }
  })
  for (const status of [401, 500, 'network']) await check('watchlist-unknown-retry-custom-action-' + status, async () => {
    const { context, page, state } = await createPage({ session: 'access', watch: status })
    try {
      await ready(page)
      const unknown = page.getByRole('button', { name: 'Watchliststatus unbekannt' })
      await unknown.waitFor()
      assert(await unknown.isDisabled())
      assert.equal(state.writes, 0)
      state.watch = 200
      await page.getByRole('button', { name: 'Erneut prüfen' }).click()
      await page.getByRole('button', { name: 'In Watchlist', exact: true }).click()
      await page.getByText('Isolierter Watchlist-Aktionsfehler', { exact: true }).waitFor()
      assert.equal(state.writes, 1)
      return { blockedUnknownWrites: 0, absorbedDelete: 1, customErrorVisible: true }
    } finally { await context.close() }
  })
  for (const status of [401, 500, 'network']) await check('contributions-loading-error-retry-empty-' + status, async () => {
    const { context, page, state } = await createPage({ contribution: status })
    state.delayContribution = true
    try {
      await page.goto(NEXT_ORIGIN + '/anime/1', { waitUntil: 'domcontentloaded' })
      await page.getByText('Mitwirkende Gruppen werden geladen…', { exact: true }).waitFor()
      await page.getByText('Mitwirkende Gruppen konnten nicht geladen werden.', { exact: true }).waitFor()
      assert.equal(await page.getByText('Noch keine Mitwirkenden eingetragen.', { exact: true }).count(), 0)
      state.contribution = 200
      await page.getByRole('button', { name: 'Erneut versuchen' }).click()
      await page.getByText('Noch keine Mitwirkenden eingetragen.', { exact: true }).waitFor()
      return { loading: true, error: true, retryEmpty: true }
    } finally { await context.close() }
  })
  for (const status of [401, 500, 'network']) await check('comment-error-' + status, async () => {
    const { context, page, state } = await createPage({ session: 'access', comment: status })
    try {
      await ready(page)
      await page.getByRole('button', { name: 'Zur Watchlist', exact: true }).waitFor()
      await page.getByLabel('Kommentar', { exact: true }).fill('Isolierter Kommentar')
      await page.getByRole('button', { name: 'Kommentar absenden' }).click()
      await page.getByRole('region', { name: 'Kommentar schreiben' }).getByRole('alert').waitFor()
      assert(state.writes >= 1)
      assert.equal(await page.getByText('Kommentar gespeichert.', { exact: true }).count(), 0)
    } finally { await context.close() }
  })
  if (phase === 159) {
    const { runPhase159Checks } = await import('./anime-detail-phase159-probe.mjs')
    await runPhase159Checks({ browser, createPage, ready, check, results, fixture, output, delay, ua })
  }
} finally {
  if (browser) await browser.close()
  next.kill('SIGTERM')
  await Promise.race([new Promise(resolve => next.once('exit', resolve)), delay(5000)])
  if (next.exitCode === null) next.kill('SIGKILL')
  await fixture.close()
  results.ssrRequests = fixture.requests
  results.passed = results.checks.length > 0 && results.checks.every(check => check.status === 'PASS')
  await writeFile(output + '/fixture-results.json', JSON.stringify(results, null, 2))
  await writeFile(output + '/fixture-next.log', serverLog)
  console.log(JSON.stringify({ passed: results.passed, checks: results.checks.length, failed: results.checks.filter(c => c.status === 'FAIL').map(c => c.name) }))
}
if (!results.passed) process.exitCode = 1
