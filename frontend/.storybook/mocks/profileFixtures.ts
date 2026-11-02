import type { MemberProfileData } from '@/types/profile'

/**
 * Baut eine vollständige `MemberProfileData`-Demo-Fixture aus neutralen Literal-Defaults, die bei
 * Bedarf gezielt überschrieben werden können. Rein erfundene Demo-Daten (keine echten
 * Produktionsdaten, siehe Threat-ID T-261102cb2-01) -- analog zum bestehenden
 * `FansubHeroSection.stories.tsx`-Muster für andere Domänen-Fixtures.
 */
export function buildMemberProfileFixture(overrides: Partial<MemberProfileData> = {}): MemberProfileData {
  return {
    member_id: 1,
    has_member_profile: true,
    has_project_assignments: false,
    app_user_id: 1,
    display_name: 'Demo Mitglied',
    fansub_name: 'Demo Mitglied',
    slug: 'demo-mitglied',
    email: 'demo@team4s.de',
    keycloak_subject: 'storybook-keycloak-subject',
    is_currently_active: true,
    noindex: false,
    is_verified: true,
    profile_visibility: 'public',
    avatar: null,
    background_image: null,
    capabilities: {
      can_view_own_profile: true,
      can_edit_own_profile: true,
      can_upload_own_avatar: true,
      can_open_keycloak_account: true,
      can_view_memberships: true,
      can_view_historical_credits: true,
    },
    memberships: [],
    historical_credits: [],
    recent_media: [],
    recent_contributions: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    account_status: 'active',
    account_display_name: 'Demo Mitglied',
    account_global_roles: [],
    ...overrides,
  }
}

/** Anonym braucht keine Profil-Fixture -- `clearAuthSession()` reicht (siehe `roleSimulation.ts`),
 *  der MSW-Handler für `/api/v1/me/profile` liefert in diesem Fall 404. */
export const anonymProfile: MemberProfileData | null = null

/** Einfaches Mitglied ohne Fansub-Gruppen und ohne Projekt-Berechtigung. */
export const mitgliedProfile: MemberProfileData = buildMemberProfileFixture({
  member_id: 2,
  display_name: 'Demo Mitglied',
  account_display_name: 'Demo Mitglied',
  slug: 'demo-mitglied',
  account_global_roles: [],
  memberships: [],
  has_project_assignments: false,
})

/** Fansub-Leitung mit aktiver Gruppenmitgliedschaft und Projekt-Berechtigung (D-06/D-09). */
export const fansubLeadProfile: MemberProfileData = buildMemberProfileFixture({
  member_id: 3,
  display_name: 'Demo Fansub-Leitung',
  account_display_name: 'Demo Fansub-Leitung',
  slug: 'demo-fansub-leitung',
  account_global_roles: [],
  has_project_assignments: true,
  memberships: [
    {
      fansub_group_id: 1,
      fansub_group_name: 'Demo Fansub-Gruppe',
      fansub_group_slug: 'demo-fansub-gruppe',
      group_status: 'active',
      app_member_status: 'leader',
      app_member_roles: ['leader'],
      is_current: true,
      has_historical_link: false,
    },
  ],
})

/** Plattformweite Admin-Rolle -- sieht zusätzliche Admin-Navigation in der AppShell. */
export const plattformAdminProfile: MemberProfileData = buildMemberProfileFixture({
  member_id: 4,
  display_name: 'Demo Plattform-Admin',
  account_display_name: 'Demo Plattform-Admin',
  slug: 'demo-plattform-admin',
  account_global_roles: ['platform_admin'],
  has_project_assignments: true,
  memberships: [],
})
