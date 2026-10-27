import { defineConfig, devices } from '@playwright/test'

/**
 * Konfiguriert die rollenbasierten Team4s-E2E-Tests. Ein gemeinsames
 * `setup`-Projekt (siehe `e2e/auth.setup.ts`) meldet alle vier Testkonten
 * über das echte Keycloak-Login-Formular an und persistiert je Rolle einen
 * eigenen `storageState`. Jedes der vier Rollen-Projekte haengt von `setup`
 * ab, sodass vor jedem einzelnen `playwright test`-Lauf eine frische
 * Anmeldung erfolgt - damit erneuert sich eine abgelaufene Sitzung
 * automatisch, ohne dass eine Alters-/Gueltigkeitspruefung noetig ist.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: [['line'], ['json', { outputFile: 'e2e/.reports/last-run.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: 'auth.setup.ts',
    },
    {
      name: 'admin',
      testMatch: 'admin-user-list.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
    },
    {
      name: 'leader',
      testMatch: 'fansub-leader-tabs.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/leader.json',
      },
    },
    {
      name: 'member',
      testMatch: 'member-protected-edit.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/member.json',
      },
    },
    {
      name: 'user',
      testMatch: 'user-blocked-admin.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
})
