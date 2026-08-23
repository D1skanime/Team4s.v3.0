'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { EmptyState, ErrorState, LoadingState, SectionHeader } from '@/components/ui'
import {
  ApiError,
  getAdminUserGroupMemberships,
  getEffectiveRights,
  listRoleCapabilities,
} from '@/lib/api'
import type { AdminGroupMembershipSummary } from '@/types/admin-users'
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
}

interface GroupRightsState {
  memberships: AdminGroupMembershipSummary[]
  rightsByGroup: Record<number, EffectiveRightState[]>
}

export function UserGroupRightsTab({ userId }: Props) {
  const [data, setData] = useState<GroupRightsState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(null)
  const [openCategoryIds, setOpenCategoryIds] = useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [membershipsResp, matrixResult] = await Promise.all([
        getAdminUserGroupMemberships(userId),
        listRoleCapabilities().catch(() => null),
      ])

      const memberships = membershipsResp.memberships
      const rightsList = await Promise.all(
        memberships.map((membership) => getEffectiveRights(membership.fansub_group_id, userId)),
      )

      const rightsByGroup: Record<number, EffectiveRightState[]> = {}
      memberships.forEach((membership, index) => {
        rightsByGroup[membership.fansub_group_id] = rightsList[index]
      })

      const actionMeta = new Map<string, ActionEntry>()
      if (matrixResult) {
        for (const action of matrixResult.all_actions) {
          actionMeta.set(action.code, action)
        }
      }

      // D-12: wichtige Bereiche standardmässig offen -- da der Katalog pro Gruppe klein und
      // vollständig relevant ist (nicht paginiert), starten alle real vorhandenen Kategorien
      // offen; Admins können einzelne Sektionen danach gezielt einklappen.
      const defaultOpenIds = new Set<string>()
      memberships.forEach((membership) => {
        const byCategory = groupStatesByCategory(
          rightsByGroup[membership.fansub_group_id] ?? [],
          actionMeta,
        )
        for (const category of byCategory.keys()) {
          defaultOpenIds.add(`${membership.fansub_group_id}-${category}`)
        }
      })

      setMatrix(matrixResult)
      setData({ memberships, rightsByGroup })
      setOpenCategoryIds(defaultOpenIds)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Daten konnten nicht geladen werden. Erneut versuchen.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const actionMeta = useMemo(() => {
    const map = new Map<string, ActionEntry>()
    if (matrix) {
      for (const action of matrix.all_actions) {
        map.set(action.code, action)
      }
    }
    return map
  }, [matrix])

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
  // Optionaler Parameter, da RoleAssignmentImpactModal (D-22) onMutated ohne Argument aufruft --
  // eine Rollenänderung betrifft potenziell viele Capabilities, nicht ein einzelnes
  // CapabilityOverrideMutationResult.
  const handleMutated = useCallback((_result?: CapabilityOverrideMutationResult) => {
    void loadData()
  }, [loadData])

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
    content = (
      <div style={{ padding: 'var(--space-4)' }}>
        <SectionHeader title="Effektive Rechte nach Gruppe" />
        {data.memberships.map((membership) => (
          <GroupSection
            key={membership.fansub_group_id}
            membership={membership}
            appUserId={userId}
            states={data.rightsByGroup[membership.fansub_group_id] ?? []}
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
        ))}
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
