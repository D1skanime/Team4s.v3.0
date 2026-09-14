// Real Member workspace and central auth client; intercepted API fixtures only.
// Run: docker exec -i -w /app team4sv30-frontend node < .planning/quick/260914-gif-release-dates-and-media-gallery/date-browser.cjs
const { chromium } = require('/app/node_modules/playwright')
const { expect } = require('/app/node_modules/playwright/test')
const fs = require('node:fs')
const origin = 'http://192.168.235.196:3000'
const out = '/tmp/team4s-quick-260914-gif-dates'
const routePath = '/me/releases/28/workspace?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F1'
const initialVersion = { id: 28, variant_id: 128, release_version_id: 28, anime_id: 1, episode_number: 3, title: 'Zeitprüfung', release_version: 'v1', media_provider: '', media_item_id: '', production_started_on: '2013-07-17T00:00:00Z', release_date: '2013-07-25T00:00:00Z', created_at: '2026-09-14T00:00:00Z', updated_at: '2026-09-14T00:00:00Z' }
const profile = { member_id: 77, has_member_profile: true, has_project_assignments: true, app_user_id: 11, display_name: 'Datums-Test', fansub_name: 'Datums-Test', slug: 'datums-test', account_display_name: 'Datums-Test', account_status: 'active', account_global_roles: ['user'], memberships: [], historical_credits: [], recent_media: [], recent_contributions: [], capabilities: { can_view_own_profile: true, can_edit_own_profile: true }, avatar: null }
const neighbors = [
  { fansub_group_id: 1, field: 'production_started_on', direction: 'previous', release_version_id: 27, episode_number: '2', date: '2013-07-18' },
  { fansub_group_id: 1, field: 'production_started_on', direction: 'next', release_version_id: 31, episode_number: '6', date: '2013-07-19' },
]
const ownError = 'Der Bearbeitungsabschluss darf nicht vor dem Bearbeitungsbeginn liegen.'
const cases = [[390, 844, 'access'], [768, 1024, 'access'], [1440, 900, 'access'], [390, 844, 'refresh-only'], [390, 844, 'expired-access']]
;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const results = []
  let unexpectedWrites = 0
  try {
    for (const [width, height, session] of cases) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width === 390 })
      const jwt = exp => Buffer.from('{}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ exp, sub: 'fixture-date-editor' })).toString('base64url') + '.fixture'
      const access = jwt(Math.floor(Date.now() / 1000) + 3600)
      if (session === 'access') await context.addCookies([{ name: 'team4s_access_token', value: access, url: origin }])
      else {
        await context.addCookies([{ name: 'team4s_refresh_token', value: 'fixture-refresh', url: origin }])
        if (session === 'expired-access') await context.addCookies([{ name: 'team4s_access_token', value: jwt(Math.floor(Date.now() / 1000) - 120), url: origin }])
      }
      let version = { ...initialVersion }
      let nextResponse = 'success'
      let contextFailure = false
      let contextReads = 0
      let refreshes = 0
      let rejectedAccesses = 0
      const mutations = []
      const pageErrors = []
      await context.route('**/*', async route => {
        const req = route.request(), path = new URL(req.url()).pathname, method = req.method()
        if (path === '/api/auth/keycloak/token') {
          refreshes++
          return route.fulfill({ json: { access_token: access, id_token: access, refresh_token: 'fixture-refreshed', expires_in: 3600, refresh_expires_in: 7200, token_type: 'Bearer' } })
        }
        if (session === 'expired-access' && refreshes === 0 && path.startsWith('/api/v1/')) {
          rejectedAccesses++
          return route.fulfill({ status: 401, json: { error: { code: 'token_expired', message: 'Token abgelaufen' } } })
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          if (path === '/api/v1/episode-versions/28' && method === 'PATCH') {
            const body = req.postDataJSON()
            mutations.push({ method, path, body, response: nextResponse })
            if (nextResponse === 'network') return route.abort('failed')
            if (nextResponse === '400' || nextResponse === '500') return route.fulfill({ status: Number(nextResponse), json: { error: { code: 'fixture_date_failure', message: `Datumsprüfung fehlgeschlagen (Fixture ${nextResponse}).` } } })
            version = { ...version, ...body }
            return route.fulfill({ json: { data: version } })
          }
          unexpectedWrites++
          return route.abort()
        }
        if (path.includes('/api/') || path.includes('/realms/')) {
          let data
          if (path === '/api/v1/admin/episode-versions/28/editor-context') {
            contextReads++
            if (contextFailure) return route.fulfill({ status: 500, json: { error: { code: 'fixture_context_failure', message: 'Datums-Kontext konnte nicht geladen werden (Fixture).' } } })
            data = { version, anime_title: 'Buddy Complex', anime_folder_path: null, selected_groups: [{ id: 1, name: 'New-Subs', slug: 'new-subs', logo_url: null }], date_neighbors: neighbors }
          }
          else if (path === '/api/v1/admin/release-versions/28/capabilities') data = { can_view_media: false, can_upload_media: false, can_update_media: false, can_delete_media: false, can_edit_notes: false, can_manage_segments: false, can_edit_metadata: true }
          else if (path === '/api/v1/me') data = { app_user_id: 11, legacy_user_id: 11, display_name: 'Datums-Test', status: 'active', global_roles: ['user'], is_platform_admin: false, session_id: 'fixture-session' }
          else if (path === '/api/v1/me/profile') data = profile
          else if (path === '/api/v1/me/projects/1') data = { anime_id: 1, fansub_group_id: 1, release_versions: [{ release_version_id: 28, episode_number: '3', episode_title: 'Zeitprüfung' }] }
          else if (path.endsWith('/anime/1/timeline')) data = { anime_id: 1, fansub_group_id: 1, production_started_on: null, production_completed_on: null }
          else return route.fulfill({ status: 404, json: { message: 'Isolated date fixture' } })
          return route.fulfill({ json: { data } })
        }
        return route.continue()
      })
      const page = await context.newPage()
      page.on('pageerror', e => pageErrors.push(e.message))
      await page.goto(origin + routePath, { waitUntil: 'domcontentloaded', timeout: 45000 })
      const startTrigger = page.getByRole('button', { name: 'Bearbeitung begonnen am auswählen', exact: true })
      const endTrigger = page.getByRole('button', { name: 'Bearbeitung abgeschlossen am auswählen', exact: true })
      const save = page.getByRole('button', { name: 'Basisdaten speichern', exact: true })
      const hint = page.getByRole('status', { name: 'Hinweise zur Datumsreihenfolge' })
      await expect(startTrigger).toHaveText('17.07.2013')
      await expect(hint).toContainText('Beginn von Folge 2 (New-Subs) am 18.07.2013')
      await expect(hint).toContainText('Abweichungen zwischen Folgen verhindern das Speichern nicht')
      await expect(save).toBeEnabled()
      await page.screenshot({ path: `${out}/${width}-${session}-advisory.png`, fullPage: true })
      const initialContextReads = contextReads
      await save.click()
      await expect(page.getByText('Basisdaten gespeichert.', { exact: true })).toBeVisible()
      expect(mutations).toHaveLength(1)
      expect(mutations[0].body.production_started_on).toBe('2013-07-17T00:00:00.000Z')
      async function selectJulyDay(label, day) {
        const trigger = page.getByRole('button', { name: label + ' auswählen', exact: true })
        if (width === 390) await trigger.tap()
        else { await trigger.focus(); await trigger.press('Enter') }
        const calendar = page.getByRole('dialog', { name: label + ' Kalender', exact: true })
        await calendar.getByRole('button', { name: '2013', exact: true }).click()
        await calendar.getByRole('button', { name: 'Jul', exact: true }).click()
        await expect(calendar.getByRole('button', { name: String(day), exact: true })).toBeEnabled()
        const openGeometry = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }))
        expect(openGeometry.documentWidth).toBeLessThanOrEqual(width)
        await calendar.getByRole('button', { name: String(day), exact: true }).click()
        await expect(calendar).toHaveCount(0)
      }
      await selectJulyDay('Bearbeitung begonnen am', 18)
      await expect(startTrigger).toHaveText('18.07.2013')
      await expect(hint).toHaveCount(0)
      await selectJulyDay('Bearbeitung begonnen am', 19)
      await expect(hint).toHaveCount(0)
      await selectJulyDay('Bearbeitung begonnen am', 20)
      await expect(hint).toContainText('Beginn von Folge 6 (New-Subs) am 19.07.2013')
      await selectJulyDay('Bearbeitung begonnen am', 19)
      await expect(hint).toHaveCount(0)
      expect(contextReads).toBe(initialContextReads)
      await startTrigger.locator('..').getByRole('button', { name: 'Leeren', exact: true }).click()
      await expect(startTrigger).toHaveText('TT.MM.JJJJ')
      await expect(hint).toHaveCount(0)
      await save.click()
      await expect(page.getByText('Basisdaten gespeichert.', { exact: true })).toBeVisible()
      expect(mutations).toHaveLength(2)
      expect(mutations[1].body.production_started_on).toBeNull()
      await selectJulyDay('Bearbeitung begonnen am', 19)
      await selectJulyDay('Bearbeitung abgeschlossen am', 19)
      await expect(endTrigger).toHaveText('19.07.2013')
      await expect(page.getByText(ownError, { exact: true })).toHaveCount(0)
      await save.click()
      await expect(page.getByText('Basisdaten gespeichert.', { exact: true })).toBeVisible()
      expect(mutations).toHaveLength(3)
      expect(mutations[2].body.production_started_on).toBe(mutations[2].body.release_date)
      for (const response of ['400', '500', 'network']) {
        nextResponse = response
        const before = mutations.length
        await save.click()
        const alert = page.locator('form').getByRole('alert')
        if (response === 'network') await expect(alert).toContainText(/fetch|network|Netzwerk|Netzwerkfehler|fehlgeschlagen/i)
        else await expect(alert).toHaveText(`Datumsprüfung fehlgeschlagen (Fixture ${response}).`)
        expect(mutations).toHaveLength(before + 1)
        await expect(startTrigger).toHaveText('19.07.2013')
        await expect(endTrigger).toHaveText('19.07.2013')
      }
      expect(contextReads).toBe(initialContextReads)
      nextResponse = 'success'
      version = { ...version, production_started_on: '2013-07-20T00:00:00Z', release_date: '2013-07-19T00:00:00Z' }
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.locator('form').getByRole('alert')).toHaveText(ownError)
      await expect(hint).toContainText('Abweichungen zwischen Folgen verhindern das Speichern nicht')
      await expect(hint).not.toContainText('Speichern bleibt erlaubt')
      const writesBeforeInvalidSave = mutations.length
      await save.click()
      await expect(page.locator('form').getByRole('alert')).toHaveText(ownError)
      expect(mutations).toHaveLength(writesBeforeInvalidSave)
      await page.screenshot({ path: `${out}/${width}-${session}-own-date-error.png`, fullPage: true })
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }))
      expect(geometry.documentWidth).toBeLessThanOrEqual(width)
      contextFailure = true
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Datums-Kontext konnte nicht geladen werden (Fixture).', { exact: true })).toBeVisible()
      await expect(save).toHaveCount(0)
      expect(refreshes).toBe(session === 'access' ? 0 : 1)
      if (session === 'expired-access') expect(rejectedAccesses).toBeGreaterThan(0)
      expect(pageErrors).toEqual([])
      results.push({ width, height, session, geometry, fixtureMutations: mutations, unexpectedWrites, refreshes, rejectedAccesses, initialContextReads, extraContextReadsOnDateInteraction: 0, pageErrors, checks: ['previous hint nonblocking save', 'known bounds 18 and 19 allowed', 'next hint after 19', 'real DatePicker touch/keyboard', 'clear sends null', 'same own day saves', 'API 400 visible', 'API 500 visible', 'network error visible', 'invalid own dates on reload inline error and no write', 'own error plus advisory text does not promise save eligibility', 'context failure visible and stale form absent', 'no root overflow including open calendar'] })
      fs.writeFileSync(out + '/date-browser-results.json', JSON.stringify({ cases: results.length, liveWrites: 0, results }, null, 2))
      console.log(JSON.stringify({ width, session, status: 'pass', refreshes, fixtureMutations: mutations.length }))
      await context.close()
    }
    expect(unexpectedWrites).toBe(0)
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
