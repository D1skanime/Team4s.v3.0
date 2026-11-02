import type { Decorator } from '@storybook/nextjs'

import { clearAuthSession, persistAuthSession } from '@/lib/api'
import type { AuthTokenData } from '@/types/auth'

import { resetWatchlistStoryState, setActiveProfileFixture } from './handlers'
import { anonymProfile, fansubLeadProfile, mitgliedProfile, plattformAdminProfile } from './profileFixtures'

/**
 * Rollen-Simulation für Storybook: schaltet zwischen anonym/Mitglied/Fansub-Leitung/Plattform-
 * Admin um, OHNE einen erfundenen `AuthProvider`/React-Context zu bauen -- stattdessen wird der
 * echte, bereits für Tests genutzte Browser-Session-Store (`persistAuthSession`/
 * `clearAuthSession` aus `@/lib/api`, siehe `useAuthSession.test.tsx`) geseedet. Session-Store
 * und die per `setActiveProfileFixture` hinterlegte MSW-Antwort für `/api/v1/me/profile` MÜSSEN
 * zur selben Rolle passen (CONTEXT.md-Vorgabe), sonst zeigt `AppShellClientWrapper` einen
 * widersprüchlichen Zustand (aktive Session, aber kein passendes Profil).
 */

export type Team4sRole = 'anonym' | 'mitglied' | 'fansub-lead' | 'plattform-admin'

/** Storybook-Toolbar-Eintrag für den Rollen-Umschalter (Werkzeugleiste oben). */
export const TEAM4S_ROLE_GLOBAL_TYPE = {
  description: 'Simulierte Team4s-Rolle (Session-Store + passendes Profil-Fixture)',
  defaultValue: 'anonym' as Team4sRole,
  toolbar: {
    title: 'Rolle',
    icon: 'user',
    items: [
      { value: 'anonym', title: 'Anonym' },
      { value: 'mitglied', title: 'Mitglied' },
      { value: 'fansub-lead', title: 'Fansub-Leitung' },
      { value: 'plattform-admin', title: 'Plattform-Admin' },
    ],
    dynamicTitle: true,
  },
}

/** Minimale, aber gültige Demo-Tokens je Rolle -- weit in der Zukunft liegende
 *  Ablaufzeitstempel (Jahr 2286), damit `useAuthSession` nie einen Refresh-Versuch gegen eine
 *  echte Keycloak-Instanz auslöst (Vorlage: `useAuthSession.test.tsx`). */
function buildDemoAuthToken(role: Exclude<Team4sRole, 'anonym'>): AuthTokenData {
  const byRole: Record<Exclude<Team4sRole, 'anonym'>, { userId: number; displayName: string }> = {
    mitglied: { userId: 2, displayName: 'Demo Mitglied' },
    'fansub-lead': { userId: 3, displayName: 'Demo Fansub-Leitung' },
    'plattform-admin': { userId: 4, displayName: 'Demo Plattform-Admin' },
  }
  const { userId, displayName } = byRole[role]
  return {
    token_type: 'Bearer',
    access_token: `storybook-access-${role}`,
    access_token_expires_at: 9999999999,
    access_token_expires_in: 3600,
    refresh_token: `storybook-refresh-${role}`,
    refresh_token_expires_at: 9999999999,
    refresh_token_expires_in: 7200,
    user_id: userId,
    app_user_id: userId,
    display_name: displayName,
    session_id: `storybook-session-${role}`,
  }
}

/** Dekorator: seedet vor jedem Render Session-Store UND MSW-Profil-Fixture passend zur in der
 *  Toolbar gewählten Rolle. Reihenfolge in `preview.tsx`: nach dem Theme-Decorator, da die Rolle
 *  keinen visuellen Bühnenaspekt betrifft. */
export const withRoleSimulation: Decorator = (Story, context) => {
  const role = (context.globals.team4sRole as Team4sRole | undefined) ?? 'anonym'
  resetWatchlistStoryState()

  if (role === 'anonym') {
    clearAuthSession()
    setActiveProfileFixture(anonymProfile)
  } else {
    persistAuthSession(buildDemoAuthToken(role))
    const profileByRole = {
      mitglied: mitgliedProfile,
      'fansub-lead': fansubLeadProfile,
      'plattform-admin': plattformAdminProfile,
    } as const
    setActiveProfileFixture(profileByRole[role])
  }

  return Story()
}
