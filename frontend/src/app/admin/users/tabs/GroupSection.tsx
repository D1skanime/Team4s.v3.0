import { Accordion, Button, EmptyState, SectionHeader } from '@/components/ui'
import type { AccordionItemDef } from '@/components/ui'
import { categoryDisplayLabel } from '../../roles/capabilityCategories'
import { groupStatesByCategory, sortCategories } from './userGroupRightsHelpers'
import { CategoryTable } from './CategoryTable'
import { GroupRolesSection } from './GroupRolesSection'
import type { AdminGroupMembershipSummary } from '@/types/admin-users'
import type { ActionEntry, EffectiveRightState, RoleCapabilityMatrix } from '@/types/admin-capability'

export function GroupSection({
  membership,
  appUserId,
  states,
  actionMeta,
  matrix,
  openCategoryIds,
  onOpenCategoryIdsChange,
  expandedRows,
  onToggleRow,
  onOpenRevoke,
  onOpenGrant,
  onOpenRoleAssignment,
}: {
  membership: AdminGroupMembershipSummary
  appUserId: number
  states: EffectiveRightState[]
  actionMeta: Map<string, ActionEntry>
  matrix: RoleCapabilityMatrix | null
  openCategoryIds: Set<string>
  onOpenCategoryIdsChange: (next: Set<string>) => void
  expandedRows: Set<string>
  onToggleRow: (key: string) => void
  onOpenRevoke: (groupId: number, groupName: string, state: EffectiveRightState, label: string) => void
  onOpenGrant: (groupId: number, state: EffectiveRightState, label: string) => void
  onOpenRoleAssignment: (
    groupId: number,
    groupName: string,
    roleCode: string,
    roleLabel: string,
    change: 'assign' | 'revoke',
  ) => void
}) {
  const byCategory = groupStatesByCategory(states, actionMeta)
  const categories = sortCategories([...byCategory.keys()])

  const accordionItems: AccordionItemDef[] = categories.map((category) => ({
    id: `${membership.fansub_group_id}-${category}`,
    title: categoryDisplayLabel(category),
    children: (
      <CategoryTable
        groupId={membership.fansub_group_id}
        appUserId={appUserId}
        states={byCategory.get(category) ?? []}
        actionMeta={actionMeta}
        matrix={matrix}
        expandedRows={expandedRows}
        onToggleRow={onToggleRow}
        onOpenRevoke={(state, label) =>
          onOpenRevoke(membership.fansub_group_id, membership.fansub_group_name, state, label)
        }
        onOpenGrant={(state, label) => onOpenGrant(membership.fansub_group_id, state, label)}
      />
    ),
  }))

  return (
    <section
      style={{ marginBottom: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)' }}
      data-group-section
    >
      <SectionHeader
        level={3}
        title={membership.fansub_group_name}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              window.open(`/admin/fansubs/${membership.fansub_group_id}/edit`, '_blank')
            }
          >
            Gruppe bearbeiten
          </Button>
        }
      />
      <GroupRolesSection
        membership={membership}
        matrix={matrix}
        onOpenRoleAssignment={(roleCode, roleLabel, change) =>
          onOpenRoleAssignment(membership.fansub_group_id, membership.fansub_group_name, roleCode, roleLabel, change)
        }
      />
      {accordionItems.length === 0 ? (
        <EmptyState variant="inline" title="Keine Rechte in dieser Gruppe." />
      ) : (
        <Accordion
          items={accordionItems}
          mode="multi"
          openIds={openCategoryIds}
          onOpenChange={onOpenCategoryIdsChange}
        />
      )}
    </section>
  )
}
