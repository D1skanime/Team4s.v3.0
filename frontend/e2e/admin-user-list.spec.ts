import { test, expect } from '@playwright/test'

/**
 * Prueft, dass das dedizierte Plattform-Admin-Testkonto (`e2e-admin`) auf die
 * Admin-Benutzerliste zugreifen kann, ohne von der PlatformAdminGate
 * blockiert zu werden. Nutzt den per `auth.setup.ts` persistierten
 * storageState des `admin`-Projekts.
 */
test.describe('Plattform-Admin', () => {
  test('Plattform-Admin sieht die Admin-Benutzerliste', async ({ page }) => {
    await page.goto('/admin/users')

    await expect(page.getByRole('heading', { name: 'Benutzerverwaltung' })).toBeVisible()
    await expect(page.getByText('Diese Ansicht ist dem Team4s-Admin vorbehalten.')).toHaveCount(0)
  })
})
