import { Fragment } from 'react'

import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import type { ActionEntry, EffectiveRightState } from '@/types/admin-capability'
import { decisiveSourceLabel } from './userGroupRightsHelpers'
import { CapabilityDetailRow } from './CapabilityDetailRow'

export function CategoryTable({
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
