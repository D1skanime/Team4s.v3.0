import { test, expect } from '@playwright/test'

/**
 * Prueft, dass ein normaler, gruppenloser Benutzer (`e2e-user`, kein
 * Fixture-Eintrag, keine `platform_admin`-Rolle) von der PlatformAdminGate
 * blockiert wird, sobald er die Admin-Benutzerliste aufruft - er sieht die
 * Sperrseite statt der eigentlichen Benutzerverwaltung.
 */
test.describe('Normaler Benutzer', () => {
  test('Normaler Benutzer erreicht die Admin-Seite nicht', async ({ page }) => {
    await page.goto('/admin/users')

    await expect(page.getByText('Diese Ansicht ist dem Team4s-Admin vorbehalten.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Benutzerverwaltung' })).toHaveCount(0)
  })
})
