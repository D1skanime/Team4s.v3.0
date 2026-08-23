'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  Accordion,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import type { AccordionItemDef } from '@/components/ui'
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
import { categoryDisplayLabel } from '../../role-capabilities/capabilityCategories'
import { resolveRoleLink } from '../resolveRoleLink'
import { CapabilityHistoryPanel } from './CapabilityHistoryPanel'
import { GuidedGrantFlow } from './GuidedGrantFlow'
import { GuidedRevokeFlow } from './GuidedRevokeFlow'

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
  | null

interface Props {
  userId: number
}

interface GroupRightsState {
  memberships: AdminGroupMembershipSummary[]
  rightsByGroup: Record<number, EffectiveRightState[]>
}

/**
 * Reale fachliche Kategorien der Registry (Migration 0108/0146/0150, 138-RESEARCH.md R-02).
 * Nur eine Sortierreihenfolge -- keine zweite Label-Map (categoryDisplayLabel bleibt die
 * einzige Quelle für Anzeigenamen, D-11/Pattern 5).
 */
const CATEGORY_ORDER = [
  'gruppe',
  'gruppenmedien',
  'gruppenseite',
  'projekt',
  'rechteverwaltung',
  'release',
  'review',
]

const UNKNOWN_CATEGORY = 'sonstige'

function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

function groupStatesByCategory(
  states: EffectiveRightState[],
  actionMeta: Map<string, ActionEntry>,
): Map<string, EffectiveRightState[]> {
  const map = new Map<string, EffectiveRightState[]>()
  for (const state of states) {
    const category = actionMeta.get(state.action_code)?.category ?? UNKNOWN_CATEGORY
    const existing = map.get(category) ?? []
    existing.push(state)
    map.set(category, existing)
  }
  return map
}

/** D-13: menschliche "Quelle"-Beschriftung statt technischer decisive_source-Rohwerte. */
function decisiveSourceLabel(state: EffectiveRightState): string {
  switch (state.decisive_source) {
    case 'platform_admin':
      return 'Plattform-Admin'
    case 'group_role':
      return state.granting_roles.length > 0 ? state.granting_roles.join(' + ') : '–'
    case 'user_allow':
      return 'persönliche Abweichung (zusätzlich erlaubt)'
    case 'user_deny':
      return 'persönliche Abweichung (entzogen)'
    case 'specialized_grant':
      return state.specialized_grants.length > 0 ? state.specialized_grants.join(' + ') : '–'
    case 'no_grant':
      return '–'
    default:
      return state.decisive_source
  }
}

function CapabilityDetailRow({
  groupId,
  appUserId,
  label,
  state,
  onOpenRevoke,
  onOpenGrant,
}: {
  groupId: number
  appUserId: number
  label: string
  state: EffectiveRightState
  onOpenRevoke: (state: EffectiveRightState, label: string) => void
  onOpenGrant: (state: EffectiveRightState, label: string) => void
}) {
  // D-15/D-16: nur die vier gesperrten Business-Verben, nie ein rohes Allow/Deny-Switch.
  const showRevoke = state.allowed && !state.non_deniable
  const showGrant = !state.allowed
  const showRemoveOverride = state.user_allow || state.user_deny

  return (
    <TableRow>
      <TableCell colSpan={3}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) 0',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div>
            <strong>Rollenquellen:</strong>{' '}
            {state.granting_roles.length > 0 ? state.granting_roles.join(', ') : '–'}
          </div>
          <div>
            <strong>Spezialisierte Grants:</strong>{' '}
            {state.specialized_grants.length > 0 ? state.specialized_grants.join(', ') : '–'}
          </div>
          <div>
            <strong>Persönlich zusätzlich erlaubt:</strong> {state.user_allow ? 'Ja' : 'Nein'}
          </div>
          <div>
            <strong>Persönlich entzogen:</strong> {state.user_deny ? 'Ja' : 'Nein'}
          </div>
          <div>
            <strong>Nicht entziehbar (non-deniable):</strong> {state.non_deniable ? 'Ja' : 'Nein'}
          </div>
          <div>
            <strong>Reason-Code:</strong> {state.reason_code || '–'}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {showRevoke && (
              <Button variant="secondary" size="sm" onClick={() => onOpenRevoke(state, label)}>
                Recht entziehen
              </Button>
            )}
            {showGrant && (
              <Button variant="secondary" size="sm" onClick={() => onOpenGrant(state, label)}>
                Recht zusätzlich erlauben
              </Button>
            )}
            {showRemoveOverride &&
              (state.user_deny ? (
                <Button variant="ghost" size="sm" onClick={() => onOpenRevoke(state, label)}>
                  Abweichung entfernen
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => onOpenGrant(state, label)}>
                  Abweichung entfernen
                </Button>
              ))}
          </div>

          <div style={{ marginTop: 'var(--space-2)' }}>
            <CapabilityHistoryPanel
              fansubGroupId={groupId}
              appUserId={appUserId}
              actionCode={state.action_code}
            />
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

function CategoryTable({
  groupId,
  appUserId,
  states,
  actionMeta,
  expandedRows,
  onToggleRow,
  onOpenRevoke,
  onOpenGrant,
}: {
  groupId: number
  appUserId: number
  states: EffectiveRightState[]
  actionMeta: Map<string, ActionEntry>
  expandedRows: Set<string>
  onToggleRow: (key: string) => void
  onOpenRevoke: (state: EffectiveRightState, label: string) => void
  onOpenGrant: (state: EffectiveRightState, label: string) => void
}) {
  return (
    <Table variant="compact">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Capability</TableHeaderCell>
          <TableHeaderCell>Effektiv</TableHeaderCell>
          <TableHeaderCell>Quelle</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {states.map((state) => {
          const key = `${groupId}:${state.action_code}`
          const isOpen = expandedRows.has(key)
          const label = actionMeta.get(state.action_code)?.label_de ?? state.action_code
          return (
            <Fragment key={key}>
              <TableRow
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => onToggleRow(key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onToggleRow(key)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <TableCell>{label}</TableCell>
                <TableCell>
                  <Badge variant={state.allowed ? 'success' : 'muted'}>
                    {state.allowed ? 'Erlaubt' : 'Nicht erlaubt'}
                  </Badge>
                </TableCell>
                <TableCell>{decisiveSourceLabel(state)}</TableCell>
              </TableRow>
              {isOpen ? (
                <CapabilityDetailRow
                  groupId={groupId}
                  appUserId={appUserId}
                  label={label}
                  state={state}
                  onOpenRevoke={onOpenRevoke}
                  onOpenGrant={onOpenGrant}
                />
              ) : null}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}

function GroupSection({
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
    <Card variant="section" style={{ marginBottom: 'var(--space-4)' }} data-group-section>
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
      <div
        style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 'var(--space-3)',
        }}
      >
        {membership.roles.length === 0 ? (
          <Badge variant="muted">–</Badge>
        ) : (
          membership.roles.map((role) => {
            const link = resolveRoleLink(role, matrix)
            return (
              <div key={role} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Badge variant="info">{role}</Badge>
                {link && (
                  <Button
                    variant="ghost"
                    size="sm"
                    href={link}
                    aria-label={`Rechte der Rolle ${role} ansehen`}
                  >
                    Was darf diese Rolle?
                  </Button>
                )}
              </div>
            )
          })
        )}
      </div>
      {accordionItems.length === 0 ? (
        <EmptyState title="Keine Rechte in dieser Gruppe." description="" />
      ) : (
        <Accordion
          items={accordionItems}
          mode="multi"
          openIds={openCategoryIds}
          onOpenChange={onOpenCategoryIdsChange}
        />
      )}
    </Card>
  )
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

  // D-18/D-21: nach jeder bestätigten Mutation muss die Zeile sofort den neuen Zustand
  // zeigen -- keine veraltete UI. Das Modal selbst bleibt offen (eigener lokaler
  // activation-status-Zustand) und zeigt seinen eigenen Erfolg unabhängig von diesem Reload.
  const handleMutated = useCallback((_result: CapabilityOverrideMutationResult) => {
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
        <EmptyState title="Keine Gruppenmitgliedschaften." description="" />
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
    </>
  )
}
