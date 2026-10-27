import { test as setup, expect } from '@playwright/test'
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

for (const role of ROLES) {
  setup(`login als ${role}`, async ({ page }) => {
    const password = process.env[passwordEnvVar(role)]
    expect(password, `${passwordEnvVar(role)} muss gesetzt sein (siehe scripts/e2e/provision.sh)`).toBeTruthy()

    await page.goto('/login')
    // AppShell rendert links einen schmalen, ueber die volle Hoehe
    // reichenden Hover-Streifen (`edgeStrip`), der die Navigations-Drawer
    // oeffnet. Playwrights Mauszeiger startet auf einer frischen Seite bei
    // (0,0) - also exakt auf diesem Streifen. Ein expliziter Zwischenschritt
    // in die Seitenmitte, bevor der Button angeklickt wird, verhindert, dass
    // der erste Mausweg des Tests ungewollt durch den Streifen fuehrt und
    // die Drawer-Backdrop ueber den Anmelden-Button legt - kein echter
    // Nutzer startet seine Maus je in der Bildschirmecke.
    await page.mouse.move(640, 400)
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await page.waitForURL(/\/realms\/team4s\/.*\/auth/, { timeout: 15000 })

    await page.locator('#username').fill(`e2e-${role}@team4s.test`)
    await page.locator('#password').fill(password as string)
    await page.locator('#kc-login').click()

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

    await page.context().storageState({ path: path.join(AUTH_DIR, `${role}.json`) })
  })
}
