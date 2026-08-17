import { Button, EmptyState, SectionHeader } from '@/components/ui'
import { MembershipsSection } from '@/components/profile/MembershipsSection'
import type { MemberProfileMembership } from '@/types/profile'

export interface MyGroupsSectionProps {
  memberships: MemberProfileMembership[]
}

/**
 * "Meine Gruppen" (D-05): direktes Reuse von MembershipsSection (verlinkt bereits korrekt
 * auf /fansubs/[slug], siehe RESEARCH Pitfall 5) fuer nicht-leere memberships. Bei leeren
 * memberships wird MembershipsSection NIEMALS gerendert -- deren eigener Empty-Zweig ist ein
 * kargtes <p> ohne Absprung (D-09-Verstoss). Stattdessen rendert dieser Wrapper direkt die
 * D-09-konforme EmptyState mit funktionierendem /fansubs-Escape-Hatch.
 */
export function MyGroupsSection({ memberships }: MyGroupsSectionProps) {
  if (memberships.length === 0) {
    return (
      <section>
        <SectionHeader title="Meine Gruppen" />
        <EmptyState
          title="Noch in keiner Gruppe"
          description="Tritt einer Fansub-Gruppe bei oder entdecke, wer an deinen Lieblingsanimes arbeitet."
          action={
            <Button href="/fansubs" variant="secondary">
              Fansub-Gruppen entdecken
            </Button>
          }
        />
      </section>
    )
  }

  return <MembershipsSection memberships={memberships} title="Meine Gruppen" showWorkspaceLink />
}
