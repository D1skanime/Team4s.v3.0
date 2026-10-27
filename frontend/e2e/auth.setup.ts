import { test as setup, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Meldet jede der vier E2E-Testrollen über das echte, von Keycloak
 * gehostete Login-Formular an und persistiert den resultierenden
 * Browser-`storageState` (inkl. der Auth-Cookies) je Rolle in
 * `e2e/.auth/<rolle>.json`. Dieses Setup-Projekt hat selbst keine
 * `dependencies` und läuft deshalb bei JEDEM `playwright test`-Aufruf neu -
 * das ist die Erneuerung einer abgelaufenen Sitzung: es gibt bewusst keine
 * Alters- oder Gueltigkeitspruefung, die umgangen werden könnte, sondern
 * schlicht einen frischen echten Login vor jedem Testlauf.
 */

const AUTH_DIR = path.join(__dirname, '.auth')

type Role = 'admin' | 'leader' | 'member' | 'user'

const ROLES: Role[] = ['admin', 'leader', 'member', 'user']

function passwordEnvVar(role: Role): string {
  return `E2E_PASSWORD_${role.toUpperCase()}`
}

setup.beforeAll(() => {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
})

/**
 * AppShell rendert links einen schmalen, hoverbaren Streifen (`edgeStrip`),
 * der bei Hover ODER Fokus die Navigations-Drawer oeffnet; deren Backdrop
 * kann dadurch sporadisch ueber dem "Anmelden"-Button liegen, wenn
 * Playwrights interner Klick-Vorbereitungsschritt (Maus bewegen, Element
 * pruefen) ihn zufaellig beruehrt. Das ist kein echtes Occlusion-Problem,
 * das ein Nutzer je saehe, sondern ein Timing-Flake dieser einen
 * Nebenkomponente - deshalb hier gezielt abfangen und erneut versuchen,
 * statt den eigentlichen Login-Test instabil zu machen.
 */
async function clickAnmeldenRobust(page: Page): Promise<void> {
  const anmeldenButton = page.getByRole('button', { name: 'Anmelden' })
  const drawerCloseButton = page.getByRole('button', { name: 'Drawer schließen' })

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await anmeldenButton.click({ timeout: 5000 })
      return
    } catch (error) {
      if (attempt === 4) throw error
      if (await drawerCloseButton.isVisible().catch(() => false)) {
        await drawerCloseButton.click({ timeout: 2000 }).catch(() => undefined)
      } else {
        await page.keyboard.press('Escape').catch(() => undefined)
      }
      await page.waitForTimeout(250)
    }
  }
}

for (const role of ROLES) {
  setup(`login als ${role}`, async ({ page }) => {
    const password = process.env[passwordEnvVar(role)]
    expect(password, `${passwordEnvVar(role)} muss gesetzt sein (siehe scripts/e2e/provision.sh)`).toBeTruthy()

    await page.goto('/login')
    await clickAnmeldenRobust(page)
    await page.waitForURL(/\/realms\/team4s\/.*\/auth/, { timeout: 15000 })

    await page.locator('#username').fill(`e2e-${role}@team4s.test`)
    await page.locator('#password').fill(password as string)
    await page.locator('#kc-login').click()

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

    await page.context().storageState({ path: path.join(AUTH_DIR, `${role}.json`) })
  })
}
