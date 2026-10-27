import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Prueft fuer das einfache Mitglied (nur historisch verlinkt, keine
 * `fansub_lead`-Rolle) zwei Ebenen der geschuetzten Bearbeitung: (a) die UI
 * zeigt den Bestaetigen-Button fuer Beitragsvorschlaege gar nicht erst an,
 * weil die Komponente ohne `can_manage_members` komplett leer rendert, und
 * (b) ein direkter, authentifizierter API-Aufruf gegen den Confirm-Endpunkt
 * liefert 403 (die Berechtigungspruefung greift, bevor ein konkreter
 * Vorschlag ueberhaupt nachgeschlagen wird - eine beliebige Vorschlags-ID
 * reicht fuer diesen Nachweis aus).
 */
const manifestPath = path.join(__dirname, '../../scripts/e2e/fixtures.manifest.json')

function readFansubGroupId(): number {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as { fansub_group_id: number }
  return manifest.fansub_group_id
}

test.describe('Einfaches Mitglied', () => {
  test('Einfaches Mitglied hat keinen Zugriff auf die geschuetzte Bearbeitung', async ({ page }) => {
    const groupId = readFansubGroupId()

    await page.goto(`/admin/fansubs/${groupId}/edit?tab=collaboration`)
    await expect(page.getByRole('button', { name: 'Vorschlag bestätigen' })).toHaveCount(0)

    const cookies = await page.context().cookies()
    const accessToken = cookies.find((cookie) => cookie.name === 'team4s_access_token')?.value
    expect(accessToken, 'team4s_access_token-Cookie muss nach dem Login vorhanden sein').toBeTruthy()

    const apiBase = process.env.E2E_API_BASE || 'http://127.0.0.1:18092'
    const response = await page.request.post(
      `${apiBase}/api/v1/admin/fansubs/${groupId}/contribution-proposals/999999/confirm`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    expect(response.status()).toBe(403)
  })
})
