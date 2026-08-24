'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { Button, EmptyState, ErrorState, LoadingState, Pagination, SectionHeader } from '@/components/ui'
import {
  ApiError,
  getAdminUserGroupMemberships,
  getEffectiveRights,
  listRoleCapabilities,
} from '@/lib/api'
import type { AdminGroupMembershipSummary, AdminListMeta } from '@/types/admin-users'
import type {
  ActionEntry,
  CapabilityOverrideMutationResult,
  EffectiveRightState,
  RoleCapabilityMatrix,
} from '@/types/admin-capability'
import { GroupSection } from './GroupSection'
import { groupStatesByCategory } from './userGroupRightsHelpers'
import { GuidedGrantFlow } from './GuidedGrantFlow'
import { GuidedRevokeFlow } from './GuidedRevokeFlow'
import { RoleAssignmentImpactModal } from './RoleAssignmentImpactModal'

/** Bounded page size for the group-membership selector (139-05's additive pagination). */
const MEMBERSHIP_PAGE_LIMIT = 25

/** Welcher geführte Fluss (CAP-08) gerade für welche Capability-Zeile geöffnet ist. */
type ActiveFlow =
  | {
      kind: 'revoke'
      groupId: number
      groupName: string
      actionCode: string
      actionLabel: string
      state: EffectiveRightState
    }
  | {
      kind: 'grant'
      groupId: number
      actionCode: string
      actionLabel: string
      state: EffectiveRightState
    }
  | {
      kind: 'roleAssignment'
      groupId: number
      groupName: string
      roleCode: string
      roleLabel: string
      change: 'assign' | 'revoke'
    }
  | null

interface Props {
  userId: number
  /** Deep-link pre-selection (?tab=roles-rights&group={fansubGroupId}), threaded from
   * UserDetailPageClient.tsx. Pre-selects and eagerly fetches exactly that ONE group's rights
   * on mount -- never a fan-out over all memberships. */
  initialGroupId?: number
}

interface GroupRightsState {
  memberships: AdminGroupMembershipSummary[]
  meta: AdminListMeta | null
  rightsByGroup: Record<number, EffectiveRightState[]>
}

function buildActionMeta(matrix: RoleCapabilityMatrix | null): Map<string, ActionEntry> {
  const map = new Map<string, ActionEntry>()
  if (matrix) {
    for (const action of matrix.all_actions) {
      map.set(action.code, action)
    }
  }
  return map
}

export function UserGroupRightsTab({ userId, initialGroupId }: Props) {
  const [data, setData] = useState<GroupRightsState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(null)
  const [openCategoryIds, setOpenCategoryIds] = useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [membershipOffset, setMembershipOffset] = useState(0)

  // Merges a freshly fetched group's rights into state and opens its categories by default
  // (D-12: the per-group catalog is small and fully relevant, not paginated) -- additive to
  // any already-open categories from a previously selected group, so switching back and forth
  // never loses a manually collapsed/expanded state. `matrixForMeta` is passed explicitly
  // (rather than reading the `matrix` state/memo) so callers that just fetched a fresh matrix
  // result in the SAME tick (loadData) don't race a stale pre-setState closure.
  const applyFetchedRights = useCallback(
    (groupId: number, states: EffectiveRightState[], matrixForMeta: RoleCapabilityMatrix | null) => {
      setData((prev) =>
        prev ? { ...prev, rightsByGroup: { ...prev.rightsByGroup, [groupId]: states } } : prev,
      )
      const byCategory = groupStatesByCategory(states, buildActionMeta(matrixForMeta))
      setOpenCategoryIds((prev) => {
        const next = new Set(prev)
        for (const category of byCategory.keys()) {
          next.add(`${groupId}-${category}`)
        }
        return next
      })
    },
    [],
  )

  // D22 (F-01 rights-tab fan-out fix): fetch ONLY the bounded membership list + the role
  // capability matrix on mount -- never Promise.all(memberships.map(getEffectiveRights)).
  // A single group's rights are fetched lazily, either because a deep-link (`initialGroupId`)
  // names it, because exactly one membership exists (auto-select keeps the existing
  // single-membership test coverage passing unchanged), or because the admin selects it.
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [membershipsResp, matrixResult] = await Promise.all([
        getAdminUserGroupMemberships(userId, MEMBERSHIP_PAGE_LIMIT, membershipOffset),
        listRoleCapabilities().catch(() => null),
      ])

      const memberships = membershipsResp.memberships
      setMatrix(matrixResult)
      setData({ memberships, meta: membershipsResp.meta ?? null, rightsByGroup: {} })

      let resolvedGroupId: number | null = null
      if (
        initialGroupId != null &&
        memberships.some((membership) => membership.fansub_group_id === initialGroupId)
      ) {
        resolvedGroupId = initialGroupId
      } else if (memberships.length === 1) {
        resolvedGroupId = memberships[0].fansub_group_id
      }
      setSelectedGroupId(resolvedGroupId)

      if (resolvedGroupId != null) {
        const states = await getEffectiveRights(resolvedGroupId, userId)
        applyFetchedRights(resolvedGroupId, states, matrixResult)
      } else {
        setOpenCategoryIds(new Set())
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Daten konnten nicht geladen werden. Erneut versuchen.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [userId, initialGroupId, membershipOffset, applyFetchedRights])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const actionMeta = useMemo(() => buildActionMeta(matrix), [matrix])

  // Lazily fetches exactly ONE group's rights and merges the result into rightsByGroup --
  // never re-fetches an already-cached group's rights on re-selection.
  const loadRightsForGroup = useCallback(
    async (groupId: number) => {
      const states = await getEffectiveRights(groupId, userId)
      applyFetchedRights(groupId, states, matrix)
    },
    [userId, matrix, applyFetchedRights],
  )

  const handleSelectGroup = useCallback(
    (groupId: number) => {
      setSelectedGroupId(groupId)
      if (!data?.rightsByGroup[groupId]) {
        void loadRightsForGroup(groupId)
      }
    },
    [data, loadRightsForGroup],
  )

  const toggleRow = useCallback((key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleOpenRevoke = useCallback(
    (groupId: number, groupName: string, state: EffectiveRightState, label: string) => {
      setActiveFlow({ kind: 'revoke', groupId, groupName, actionCode: state.action_code, actionLabel: label, state })
    },
    [],
  )

  const handleOpenGrant = useCallback((groupId: number, state: EffectiveRightState, label: string) => {
    setActiveFlow({ kind: 'grant', groupId, actionCode: state.action_code, actionLabel: label, state })
  }, [])

  const handleOpenRoleAssignment = useCallback(
    (
      groupId: number,
      groupName: string,
      roleCode: string,
      roleLabel: string,
      change: 'assign' | 'revoke',
    ) => {
      setActiveFlow({ kind: 'roleAssignment', groupId, groupName, roleCode, roleLabel, change })
    },
    [],
  )

  // D-18/D-21: nach jeder bestätigten Mutation muss die Zeile sofort den neuen Zustand
  // zeigen -- keine veraltete UI. Das Modal selbst bleibt offen (eigener lokaler
  // activation-status-Zustand) und zeigt seinen eigenen Erfolg unabhängig von diesem Reload.
  // D22: reagiert NICHT mehr mit dem alten eagern Fan-out (loadData() für alle Gruppen) --
  // aktualisiert nur die Mitgliederliste (Rollenänderungen können Status/Rollen betreffen)
  // und NUR die aktuell ausgewählte Gruppe erneut.
  const handleMutated = useCallback(
    async (_result?: CapabilityOverrideMutationResult) => {
      try {
        const membershipsResp = await getAdminUserGroupMemberships(userId, MEMBERSHIP_PAGE_LIMIT, membershipOffset)
        setData((prev) =>
          prev
            ? { ...prev, memberships: membershipsResp.memberships, meta: membershipsResp.meta ?? null }
            : prev,
        )
      } catch {
        // Best-effort Refresh -- Fehler der eigentlichen Mutation werden bereits im
        // jeweiligen geführten Fluss (Guided Revoke/Grant, RoleAssignmentImpactModal) angezeigt.
      }
      if (selectedGroupId != null) {
        try {
          await loadRightsForGroup(selectedGroupId)
        } catch {
          // s.o.
        }
      }
    },
    [userId, membershipOffset, selectedGroupId, loadRightsForGroup],
  )

  const selectedMembership = useMemo(
    () => data?.memberships.find((membership) => membership.fansub_group_id === selectedGroupId) ?? null,
    [data, selectedGroupId],
  )

  let content: ReactNode
  if (isLoading) {
    content = <LoadingState title="Wird geladen …" description="" />
  } else if (error) {
    content = <ErrorState title="Fehler beim Laden" description={error} />
  } else if (!data || data.memberships.length === 0) {
    content = (
      <div style={{ padding: 'var(--space-4)' }}>
        <EmptyState variant="inline" title="Keine Gruppenmitgliedschaften." />
      </div>
    )
  } else {
    const totalMemberships = data.meta?.total ?? data.memberships.length
    const totalPages = Math.max(1, Math.ceil(totalMemberships / MEMBERSHIP_PAGE_LIMIT))
    content = (
      <div style={{ padding: 'var(--space-4)' }}>
        <SectionHeader
          title="Effektive Rechte nach Gruppe"
          description="Aktionsfähig — hier werden persönliche Rechteabweichungen für eine ausgewählte Gruppe geprüft und geändert."
        />
        <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {data.memberships.map((membership) => (
            <Button
              key={membership.fansub_group_id}
              variant="ghost"
              fullWidth
              aria-pressed={selectedGroupId === membership.fansub_group_id}
              onClick={() => handleSelectGroup(membership.fansub_group_id)}
            >
              <span>{membership.fansub_group_name}</span>
              {membership.roles.length > 0 && (
                <span style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                  {membership.roles.join(', ')}
                </span>
              )}
            </Button>
          ))}
        </div>
        {totalPages > 1 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Pagination
              currentPage={Math.floor(membershipOffset / MEMBERSHIP_PAGE_LIMIT) + 1}
              totalPages={totalPages}
              onPageChange={(page) => setMembershipOffset((page - 1) * MEMBERSHIP_PAGE_LIMIT)}
            />
          </div>
        )}
        {selectedGroupId != null && selectedMembership && (
          <GroupSection
            key={selectedGroupId}
            membership={selectedMembership}
            appUserId={userId}
            states={data.rightsByGroup[selectedGroupId] ?? []}
            actionMeta={actionMeta}
            matrix={matrix}
            openCategoryIds={openCategoryIds}
            onOpenCategoryIdsChange={setOpenCategoryIds}
            expandedRows={expandedRows}
            onToggleRow={toggleRow}
            onOpenRevoke={handleOpenRevoke}
            onOpenGrant={handleOpenGrant}
            onOpenRoleAssignment={handleOpenRoleAssignment}
          />
        )}
      </div>
    )
  }

  return (
    <>
      {content}
      {activeFlow?.kind === 'revoke' && (
        <GuidedRevokeFlow
          open
          onClose={() => setActiveFlow(null)}
          fansubGroupId={activeFlow.groupId}
          fansubGroupName={activeFlow.groupName}
          appUserId={userId}
          appUserDisplayName={`Nutzer #${userId}`}
          actionCode={activeFlow.actionCode}
          actionLabel={activeFlow.actionLabel}
          state={activeFlow.state}
          matrix={matrix}
          onMutated={handleMutated}
        />
      )}
      {activeFlow?.kind === 'grant' && (
        <GuidedGrantFlow
          open
          onClose={() => setActiveFlow(null)}
          fansubGroupId={activeFlow.groupId}
          appUserId={userId}
          actionCode={activeFlow.actionCode}
          actionLabel={activeFlow.actionLabel}
          state={activeFlow.state}
          onMutated={handleMutated}
        />
      )}
      {activeFlow?.kind === 'roleAssignment' && (
        <RoleAssignmentImpactModal
          open
          onClose={() => setActiveFlow(null)}
          fansubGroupId={activeFlow.groupId}
          fansubGroupName={activeFlow.groupName}
          appUserId={userId}
          appUserDisplayName={`Nutzer #${userId}`}
          roleCode={activeFlow.roleCode}
          roleLabel={activeFlow.roleLabel}
          change={activeFlow.change}
          actionMeta={actionMeta}
          onMutated={handleMutated}
        />
      )}
    </>
  )
}
