import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Prueft, dass die Gruppenleitung ("E2E Gruppe A", Live-Rolle `fansub_lead`)
 * im Tab "Fansub Members" sowohl die eingehenden Hinweise als auch die
 * offenen Beitragsvorschlaege sieht - beide Abschnitte sind in der
 * Produktivkomponente ausschliesslich hinter `can_manage_members` gerendert.
 * Die Gruppen-ID stammt aus dem von `provision-fixtures.mjs` erzeugten
 * Manifest, nicht aus einer hartcodierten Zahl, damit der Test eine
 * erneute Provisionierung mit anderen IDs unverändert ueberlebt.
 */
const manifestPath = path.join(__dirname, '../../scripts/e2e/fixtures.manifest.json')

function readFansubGroupId(): number {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as { fansub_group_id: number }
  return manifest.fansub_group_id
}

test.describe('Gruppenleitung', () => {
  test('Gruppenleitung sieht Eingehende Hinweise und Offene Vorschlaege im Tab Fansub Members', async ({ page }) => {
    const groupId = readFansubGroupId()

    await page.goto(`/admin/fansubs/${groupId}/edit?tab=collaboration`)

    await expect(page.getByText(/Eingehende Hinweise/)).toBeVisible()
    await expect(page.getByText(/Offene Vorschläge/)).toBeVisible()
  })
})
