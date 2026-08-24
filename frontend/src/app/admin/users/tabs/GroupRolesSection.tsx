import { useState } from 'react'

import { Badge, Button, SectionHeader, Select } from '@/components/ui'
import { resolveRoleLink } from '../resolveRoleLink'
import { assignableFansubGroupRoles, roleLabelFor } from './userGroupRightsHelpers'
import type { AdminGroupMembershipSummary } from '@/types/admin-users'
import type { RoleCapabilityMatrix } from '@/types/admin-capability'

/** D-22: kompakte "Rollen in dieser Gruppe"-Sektion, gated auf RoleAssignmentImpactModal (D-18/D-20). */
export function GroupRolesSection({
  membership,
  matrix,
  onOpenRoleAssignment,
}: {
  membership: AdminGroupMembershipSummary
  matrix: RoleCapabilityMatrix | null
  onOpenRoleAssignment: (roleCode: string, roleLabel: string, change: 'assign' | 'revoke') => void
}) {
  const [selectedRoleCode, setSelectedRoleCode] = useState('')
  const assignableRoles = assignableFansubGroupRoles(matrix, membership.roles)

  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <SectionHeader level={3} title="Rollen in dieser Gruppe" />
      <div
        style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 'var(--space-2)',
        }}
      >
        {membership.roles.length === 0 ? (
          <Badge variant="muted">–</Badge>
        ) : (
          membership.roles.map((role) => {
            const link = resolveRoleLink(role, matrix, 'caps')
            return (
              <div key={role} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Badge variant="info">{roleLabelFor(role, matrix)}</Badge>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenRoleAssignment(role, roleLabelFor(role, matrix), 'revoke')}
                >
                  Entfernen
                </Button>
              </div>
            )
          })
        )}
      </div>

      {assignableRoles.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <Select
            aria-label="Zuzuweisende Rolle auswählen"
            value={selectedRoleCode}
            onChange={(event) => setSelectedRoleCode(event.target.value)}
          >
            <option value="">Rolle auswählen …</option>
            {assignableRoles.map((role) => (
              <option key={role.role_code} value={role.role_code}>
                {role.label_de}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedRoleCode}
            onClick={() => {
              const role = assignableRoles.find((entry) => entry.role_code === selectedRoleCode)
              if (!role) return
              onOpenRoleAssignment(role.role_code, role.label_de, 'assign')
              setSelectedRoleCode('')
            }}
          >
            Rolle zuweisen
          </Button>
        </div>
      )}
    </div>
  )
}
