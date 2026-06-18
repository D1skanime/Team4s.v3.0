'use client'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table'
import type { ActionEntry, RoleEntry } from '@/types/admin-capability'

export interface RoleCapabilityTableProps {
  roles: RoleEntry[]
  allActions: ActionEntry[]
  filteredCategory: string
  onGrant: (roleCode: string, actionCode: string) => void
  onRevoke: (roleCode: string, actionCode: string) => void
}

export function RoleCapabilityTable({
  roles,
  allActions,
  filteredCategory,
  onGrant,
  onRevoke,
}: RoleCapabilityTableProps) {
  const visibleActions = filteredCategory
    ? allActions.filter((a) => a.category === filteredCategory)
    : allActions

  return (
    <Table variant="compact">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Rolle</TableHeaderCell>
          {visibleActions.map((action) => (
            <TableHeaderCell key={action.code} title={action.code}>
              <span style={{ fontSize: '0.75rem' }}>
                {action.category}
              </span>
              <br />
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                {action.label_de}
              </span>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.role_code}>
            <TableCell style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
              {role.label_de}
            </TableCell>
            {visibleActions.map((action) => {
              const state = role.actions.find((a) => a.code === action.code)
              const granted = state?.granted ?? false
              const standalone = state?.standalone ?? false

              if (standalone) {
                return (
                  <TableCell key={action.code} style={{ textAlign: 'center' }}>
                    <Badge
                      variant="muted"
                      aria-label="Systemaktion — nicht über Rollen konfigurierbar"
                    >
                      Systemaktion
                    </Badge>
                  </TableCell>
                )
              }

              if (granted) {
                return (
                  <TableCell key={action.code} style={{ textAlign: 'center' }}>
                    <Badge variant="info" style={{ marginBottom: 'var(--space-1)' }}>
                      Vergeben
                    </Badge>
                    <br />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onRevoke(role.role_code, action.code)}
                    >
                      Entziehen
                    </Button>
                  </TableCell>
                )
              }

              return (
                <TableCell key={action.code} style={{ textAlign: 'center' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onGrant(role.role_code, action.code)}
                  >
                    Vergeben
                  </Button>
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
