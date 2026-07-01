'use client'

import { useState } from 'react'

import { Button, Card, FormField, Select } from '@/components/ui'
import { updateFansubAppMemberRole } from '@/lib/api'

import styles from './ClaimManagementPanel.module.css'

export type ClaimRoleAssignment = {
  id: string
  appUserId: number
  memberName: string
  endedRoleLabels: string[]
}

type RoleOption = {
  code: string
  label: string
}

type RoleAssignmentAfterClaimProps = {
  groupId: number
  assignments: ClaimRoleAssignment[]
  roleOptions: RoleOption[]
  onAssigned: (assignmentId: string) => void
}

export function RoleAssignmentAfterClaim({
  groupId,
  assignments,
  roleOptions,
  onAssigned,
}: RoleAssignmentAfterClaimProps) {
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})
  const [busyAssignment, setBusyAssignment] = useState<string | null>(null)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null)

  if (assignments.length === 0) return null

  async function handleAssign(assignment: ClaimRoleAssignment) {
    const role = selectedRoles[assignment.id] ?? ''
    if (!role) return
    try {
      setBusyAssignment(assignment.id)
      setAssignmentError(null)
      setAssignmentMessage(null)
      await updateFansubAppMemberRole(groupId, assignment.appUserId, { role, enabled: true })
      setAssignmentMessage('Aktive Rolle zugewiesen.')
      onAssigned(assignment.id)
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : 'Aktive Rolle konnte nicht zugewiesen werden.')
    } finally {
      setBusyAssignment(null)
    }
  }

  return (
    <Card variant="nested" className={styles.roleAssignmentPanel}>
      <h3>Aktive Rolle zuweisen</h3>
      <p>
        Der Claim wurde bestätigt. Für beendete historische Rollen kannst du jetzt explizit eine neue aktive Rolle setzen.
      </p>
      {assignmentError ? <p className={styles.inlineError}>{assignmentError}</p> : null}
      {assignmentMessage ? <p className={styles.inlineSuccess}>{assignmentMessage}</p> : null}
      <div className={styles.roleAssignmentList}>
        {assignments.map((assignment) => {
          const selectId = `claim-role-assign-select-${assignment.id}`
          const selectedRole = selectedRoles[assignment.id] ?? ''
          return (
            <div key={assignment.id} className={styles.roleAssignmentItem}>
              <div>
                <strong>{assignment.memberName}</strong>
                <p>Beendete historische Rollen: {assignment.endedRoleLabels.join(', ')}</p>
              </div>
              <FormField label="Aktive Rolle" htmlFor={selectId}>
                <Select
                  id={selectId}
                  aria-label="Aktive Rolle auswählen"
                  value={selectedRole}
                  onChange={(event) => setSelectedRoles((current) => ({ ...current, [assignment.id]: event.target.value }))}
                >
                  <option value="">Rolle wählen</option>
                  {roleOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </Select>
              </FormField>
              <Button
                type="button"
                variant="success"
                loading={busyAssignment === assignment.id}
                disabled={!selectedRole || busyAssignment === assignment.id}
                onClick={() => void handleAssign(assignment)}
              >
                Aktive Rolle zuweisen
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
