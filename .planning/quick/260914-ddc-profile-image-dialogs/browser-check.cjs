// Run from canonical repo: docker exec -i -w /app team4sv30-frontend node < .planning/quick/260914-ddc-profile-image-dialogs/browser-check.cjs
// All API responses are isolated fixtures; no real profile reads or writes.
const { chromium } = require('/app/node_modules/playwright')
const { expect } = require('/app/node_modules/playwright/test')
const sharp = require('/app/node_modules/sharp')
const fs = require('node:fs')
const origin = 'http://192.168.235.196:3000'
const out = '/tmp/team4s-quick-260914-ddc'
const profile = {
  member_id: 4, app_user_id: 11, legacy_user_id: 8, has_member_profile: true,
  has_project_assignments: false, display_name: 'Dialog-Test', fansub_name: 'Dialog-Test', slug: 'dialog-test',
  email: 'dialog-test@example.invalid', keycloak_subject: 'fixture-only', bio: 'Isolierte Browserprüfung',
  member_story: '', member_story_json: { type: 'doc', content: [{ type: 'paragraph' }] },
  member_story_html: '', member_story_text: '', member_story_editor_type: 'tiptap', member_story_content_schema_version: 1,
  active_from_date: null, active_until_date: null, is_currently_active: true, noindex: true,
  is_verified: true, claim_status: null, claim_member_nick: null, profile_visibility: 'private',
  avatar: null, background_image: null, keycloak_account_url: null,
  capabilities: { can_view_own_profile: true, can_edit_own_profile: true, can_upload_own_avatar: true,
    can_open_keycloak_account: false, can_view_memberships: true, can_view_historical_credits: true },
  memberships: [], historical_credits: [], recent_media: [], recent_contributions: [],
  created_at: '2026-09-14T00:00:00Z', updated_at: '2026-09-14T00:00:00Z',
  account_status: 'active', account_display_name: 'Dialog-Test', account_global_roles: ['user'],
}
;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const image = await sharp({ create: { width: 1200, height: 600, channels: 3, background: '#527caf' } }).png().toBuffer()
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const results = []
  let writes = 0
  try {
    for (const [width, height] of [[390,844], [768,1024], [1440,900]]) {
      const context = await browser.newContext({ viewport: { width, height } })
      const errors = []
      const token = Buffer.from('{}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url') + '.fixture'
      await context.addCookies([{ name: 'team4s_access_token', value: token, url: origin }])
      await context.route('**/*', async route => {
        const request = route.request()
        const path = new URL(request.url()).pathname
        if (!['GET','HEAD','OPTIONS'].includes(request.method())) {
          writes++
          return route.abort()
        }
        if (path.includes('/api/') || path.includes('/realms/')) {
          if (path === '/api/v1/me/profile') return route.fulfill({ json: { data: profile } })
          if (path === '/api/v1/me/badges') return route.fulfill({ json: { badges: [] } })
          return route.fulfill({ status: 404, json: { message: 'Isolated fixture: endpoint unavailable' } })
        }
        return route.continue()
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(origin + '/me/profile', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await expect(page.getByRole('heading', { name: 'Dialog-Test', exact: false })).toBeVisible({ timeout: 20000 })
      for (const tab of ['Profil', 'Sichtbarkeit', 'Aktivität', 'Account']) {
        const selected = page.getByRole('tab', { name: tab, exact: true })
        await selected.click()
        for (const [name, title] of [['Avatar-Bild ändern', 'Avatar zuschneiden'], ['Banner ändern', 'Hintergrundbild zuschneiden']]) {
          const trigger = page.getByRole('button', { name, exact: true })
          const chooserPromise = page.waitForEvent('filechooser')
          await trigger.click()
          await (await chooserPromise).setFiles({ name: 'dialog-test.png', mimeType: 'image/png', buffer: image })
          const dialog = page.getByRole('dialog', { name: title })
          await expect(dialog).toBeVisible()
          await expect(selected).toHaveAttribute('aria-selected', 'true')
          await expect(dialog.getByRole('button', { name: 'Dialog schließen' })).toBeFocused()
          await expect(dialog.getByRole('button', { name: 'Ausschnitt übernehmen' })).toBeEnabled()
          const metrics = await dialog.evaluate(el => {
            const rect = el.getBoundingClientRect()
            const ancestors = []
            for (let node=el; node; node=node.parentElement) {
              const css = getComputedStyle(node)
              if (node.getAttribute('aria-hidden') === 'true' || css.opacity === '0' || css.display === 'none') ancestors.push(node.tagName)
            }
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, hiddenAncestors: ancestors,
              documentWidth: document.documentElement.scrollWidth, viewport: innerWidth }
          })
          expect(metrics.hiddenAncestors).toEqual([])
          expect(metrics.x).toBeGreaterThanOrEqual(0)
          expect(metrics.x + metrics.width).toBeLessThanOrEqual(width)
          const zoom = dialog.getByRole('slider', { name: 'Zoom' })
          await zoom.focus()
          await zoom.press('ArrowRight')
          await expect(zoom).not.toHaveValue('1')
          await dialog.getByRole('button', { name: 'Position zurücksetzen' }).click()
          await expect(zoom).toHaveValue('1')
          if (tab === 'Profil') await page.screenshot({ path: `${out}/${width}-${name.startsWith('Avatar') ? 'avatar' : 'banner'}.png` })
          await dialog.getByRole('button', { name: 'Abbrechen' }).click()
          await expect(dialog).toHaveCount(0)
          await expect(trigger).toBeFocused()
          await expect(selected).toHaveAttribute('aria-selected','true')
          // Selecting the identical file again must still open the editor.
          const nextChooser = page.waitForEvent('filechooser')
          await trigger.click()
          await (await nextChooser).setFiles({ name: 'dialog-test.png', mimeType: 'image/png', buffer: image })
          await expect(dialog).toBeVisible()
          await dialog.getByRole('button', { name: 'Dialog schließen' }).press('Escape')
          await expect(dialog).toHaveCount(0)
          results.push({ width, height, tab, title, metrics, result: 'pass' })
        }
      }
      expect(errors).toEqual([])
      await context.close()
    }
    expect(writes).toBe(0)
    fs.writeFileSync(out + '/browser-results.json', JSON.stringify({ results, writes, cases: results.length, pageErrors: [] }, null, 2))
    console.log(JSON.stringify({ cases: results.length, writes, output: out }))
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode=1 })
