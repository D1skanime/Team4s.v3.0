// Run in the canonical frontend Docker runtime, not the retired Windows checkout.
// Real workspace/component with isolated API fixtures. All writes are aborted.
const { chromium } = require('/app/node_modules/playwright')
const { expect } = require('/app/node_modules/playwright/test')
const fs = require('node:fs')
const sharp = require('/app/node_modules/sharp')
const origin = 'http://192.168.235.196:3000'
const out = '/tmp/team4s-quick-260914-gif-gallery'
const version = { id: 28, anime_id: 1, episode_number: 2, title: 'Nice Coupling', release_version: 'v1', media_provider: '', media_item_id: '', created_at: '2026-09-14T00:00:00Z', updated_at: '2026-09-14T00:00:00Z' }
const profile = { member_id: 77, has_member_profile: true, has_project_assignments: true, app_user_id: 11, display_name: 'Galerie-Test', fansub_name: 'Galerie-Test', slug: 'galerie-test', account_display_name: 'Galerie-Test', account_status: 'active', account_global_roles: ['user'], memberships: [], historical_credits: [], recent_media: [], recent_contributions: [], capabilities: { can_view_own_profile: true, can_edit_own_profile: true }, avatar: null }
const longTitle = 'Typesetting und Karaoke: ausführliche Dokumentation der überarbeiteten Schilder und Übergänge'
const longCaption = 'Die Timeline und der rote linke Card-Rand erzählen fast dasselbe. Links läuft die vertikale Linie mit Punkt. Direkt daneben hat jede Karte nochmals einen farbigen Rand. Eines der beiden visuellen Signale reicht für eine verständliche Darstellung. Vollständiger Abschlusssatz bleibt im Detailfenster verfügbar.'
const cases = [
  { name: '390', width: 390, height: 844, columns: 2 },
  { name: '768', width: 768, height: 1024, columns: 2 },
  { name: '1440', width: 1440, height: 900, columns: 4 },
  { name: 'three-below', width: 1440, height: 900, container: 703, columns: 2 },
  { name: 'three-at', width: 1440, height: 900, container: 704, columns: 3 },
  { name: 'four-below', width: 1440, height: 900, container: 943, columns: 3 },
  { name: 'four-at', width: 1440, height: 900, container: 944, columns: 4 },
  { name: 'embedded', width: 1440, height: 900, container: 340, columns: 2 },
  { name: 'zoom-200', width: 1440, height: 900, zoom: 2, columns: 2 },
  { name: 'readonly', width: 768, height: 1024, readonly: true, columns: 2 },
]
;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const pictures = await Promise.all(['#688baf', '#70a58d', '#ac86a5', '#ac9b66'].map((color, index) => sharp(Buffer.from(`<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="500" fill="${color}"/><circle cx="620" cy="125" r="85" fill="white" opacity="0.3"/><path d="M0 500L260 200L400 390L550 245L800 500" fill="white" opacity="0.2"/><text x="45" y="420" font-size="90" fill="white">Bild ${index + 1}</text></svg>`)).png().toBuffer()))
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  let writes = 0
  const results = []
  try {
    for (const fixture of cases) {
      const canEdit = !fixture.readonly
      const context = await browser.newContext({ viewport: { width: fixture.width, height: fixture.height }, hasTouch: fixture.width === 390 })
      const token = Buffer.from('{}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.fixture'
      await context.addCookies([{ name: 'team4s_access_token', value: token, url: origin }])
      let mediaReads = 0
      const errors = []
      const capabilities = { can_view_media: true, can_upload_media: canEdit, can_update_media: canEdit, can_delete_media: false, can_delete_own_media: canEdit, can_edit_notes: false, can_manage_segments: false, can_edit_metadata: canEdit }
      const items = Array.from({ length: 11 }, (_, index) => ({
        id: 101 + index, release_version_id: 28, media_asset_id: 201 + index,
        category: index < 3 ? 'screenshot' : index === 3 ? 'typesetting_karaoke' : index < 7 ? 'fun_outtake' : 'other',
        title: index === 3 ? longTitle : `Medium ${index + 1}`,
        caption: index === 3 || index > 4 ? longCaption : null,
        sort_order: index, is_preview_candidate: index === 3,
        visibility: 'intern', review_status: 'freigegeben', review_state: 'confirmed', can_update: canEdit, can_delete: false,
        thumbnail_url: index === 10 ? null : `/gallery-fixture-${index % 4}.png`,
        original_url: index === 10 ? null : `/gallery-fixture-${index % 4}.png`,
        last_activity_at: '2026-09-14T12:59:00Z', created_at: '2026-09-14T00:00:00Z', uploaded_by_user_id: 11,
      }))
      await context.route('**/*', async route => {
        const request = route.request()
        const path = new URL(request.url()).pathname
        const picture = path.match(/^\/gallery-fixture-([0-3])\.png$/)
        if (picture) return route.fulfill({ contentType: 'image/png', body: pictures[Number(picture[1])] })
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { writes++; return route.abort() }
        if (path.includes('/api/') || path.includes('/realms/')) {
          if (path === '/api/v1/admin/episode-versions/28/editor-context') return route.fulfill({ json: { data: { anime_title: 'Buddy Complex', anime_folder_path: null, selected_groups: [{ id: 1, name: 'New-Subs', slug: 'new-subs', logo_url: null }], version } } })
          if (path === '/api/v1/admin/release-versions/28/capabilities') return route.fulfill({ json: { data: capabilities } })
          if (path === '/api/v1/admin/release-versions/28/media') { mediaReads++; return route.fulfill({ json: { data: items } }) }
          if (path === '/api/v1/me/profile') return route.fulfill({ json: { data: profile } })
          if (path === '/api/v1/me/projects/1') return route.fulfill({ json: { data: { anime_id: 1, fansub_group_id: 1, release_versions: [{ release_version_id: 28, episode_number: '2', episode_title: 'Nice Coupling' }] } } })
          if (path.endsWith('/anime/1/timeline')) return route.fulfill({ json: { data: { anime_id: 1, fansub_group_id: 1, production_started_on: null, production_completed_on: null } } })
          return route.fulfill({ status: 404, json: { message: 'Isolated fixture' } })
        }
        return route.continue()
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(origin + '/me/releases/28/workspace?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F1', { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.getByRole('tab', { name: 'Bilder & Medien' }).click()
      const heading = page.getByRole('heading', { name: 'Vorhandene Medien · 11' })
      await expect(heading).toBeVisible()
      if (fixture.container) await heading.evaluate((node, width) => { node.closest('section').style.width = `${width}px` }, fixture.container)
      if (fixture.zoom) await page.evaluate(zoom => { document.documentElement.style.zoom = String(zoom) }, fixture.zoom)
      await page.locator('img[src^="/gallery-fixture-"]').evaluateAll(async imgs => { await Promise.all(imgs.map(img => img.decode())) })
      await heading.scrollIntoViewIfNeeded()
      const geometry = await heading.evaluate(node => {
        const section = node.closest('section')
        const grid = section.querySelector('[class*="mediaGrid"]')
        const cards = [...grid.children].map(card => {
          const thumb = card.querySelector('[class*="mediaThumb"]')
          const opener = card.querySelector('[class*="mediaCardOpen"]')
          const title = card.querySelector('[class*="mediaName"]')
          const caption = card.querySelector('[class*="mediaCaption"]')
          const action = card.querySelector('[class*="mediaPreviewAction"]')
          const rect = element => { const r = element.getBoundingClientRect(); return { width: r.width, height: r.height, x: r.x, y: r.y } }
          const lines = element => element ? { height: element.clientHeight, lineHeight: parseFloat(getComputedStyle(element).lineHeight), clamp: getComputedStyle(element).webkitLineClamp } : null
          return {
            card: rect(card), thumb: rect(thumb), title: lines(title), caption: lines(caption), action: action ? rect(action) : null,
            opener: rect(opener),
            metadata: [...card.querySelectorAll('[class*="mediaCategory"], [class*="mediaStatus"], [class*="previewBadge"], [class*="mediaActivity"]')].map(element => ({ text: element.textContent, width: element.clientWidth, scrollWidth: element.scrollWidth })),
          }
        })
        return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, container: section.clientWidth, columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length, cards }
      })
      expect(geometry.cards).toHaveLength(11)
      expect(geometry.columns).toBe(fixture.columns)
      expect(geometry.documentWidth).toBeLessThanOrEqual(fixture.width)
      for (const card of geometry.cards) {
        expect(Math.abs(card.thumb.width / card.thumb.height - 4 / 3)).toBeLessThan(0.02)
        expect(card.title.height).toBeLessThanOrEqual(card.title.lineHeight * 2 + 1)
        if (card.caption) expect(card.caption.height).toBeLessThanOrEqual(card.caption.lineHeight * 3 + 1)
        if (card.action) expect(card.action.height / (fixture.zoom || 1)).toBeLessThanOrEqual(56)
        for (const meta of card.metadata) expect(meta.scrollWidth, meta.text).toBeLessThanOrEqual(meta.width + 1)
      }
      const readsBefore = mediaReads
      // CSS zoom is scoped to gallery geometry: fixed global overlays do not emulate browser zoom.
      if (!fixture.zoom) {
      const opener = page.getByRole('button', { name: longTitle + (canEdit ? ' bearbeiten' : ' ansehen') + ', aktuelles Vorschaubild', exact: true })
      await opener.focus()
      if (fixture.width === 390) await opener.tap()
      else await opener.press('Enter')
      const detail = page.getByRole('dialog', { name: canEdit ? 'Medium bearbeiten' : 'Medium ansehen' })
      await expect(detail.getByLabel('Titel', { exact: true })).toHaveValue(longTitle)
      await expect(detail.getByLabel('Beschreibung', { exact: true })).toHaveValue(longCaption)
      await detail.getByRole('button', { name: 'Schließen', exact: true }).click()
      await expect(detail).toHaveCount(0)
      }
      expect(mediaReads).toBe(readsBefore)
      await expect(page.getByRole('button', { name: 'Als Vorschau wählen', exact: true })).toHaveCount(canEdit ? 3 : 0)
      await expect(page.getByRole('button', { name: 'Vorschau entfernen', exact: true })).toHaveCount(canEdit ? 1 : 0)
      expect(errors).toEqual([])
      await heading.scrollIntoViewIfNeeded()
      if (['390', '768', '1440', 'embedded', 'zoom-200'].includes(fixture.name)) await page.screenshot({ path: `${out}/${fixture.name}-gallery.png`, fullPage: true })
      results.push({ ...fixture, detailVerified: !fixture.zoom, mediaReads, extraMediaReadsOnDetail: mediaReads - readsBefore, errors, geometry, status: 'pass' })
      console.log(JSON.stringify({ name: fixture.name, columns: geometry.columns, container: geometry.container, status: 'pass' }))
      await context.close()
    }
    expect(writes).toBe(0)
    fs.writeFileSync(out + '/gallery-browser-results.json', JSON.stringify({ cases: results.length, writes, zoomNote: 'CSS zoom=2 exercises gallery layout reflow only; it is not claimed as browser-chrome zoom. Existing fixed Drawer overlays do not emulate native browser zoom under CSS zoom, so detail interaction is verified in the nine unzoomed cases.', results }, null, 2))
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
