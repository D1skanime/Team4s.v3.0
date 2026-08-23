import { Button, TableCell, TableRow } from '@/components/ui'
import type { EffectiveRightState, RoleCapabilityMatrix } from '@/types/admin-capability'
import { CapabilityHistoryPanel } from './CapabilityHistoryPanel'
import { roleLabelFor } from './userGroupRightsHelpers'

export function CapabilityDetailRow({
  groupId,
  appUserId,
  label,
  state,
  matrix,
  onOpenRevoke,
  onOpenGrant,
}: {
  groupId: number
  appUserId: number
  label: string
  state: EffectiveRightState
  matrix: RoleCapabilityMatrix | null
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
            {state.granting_roles.length > 0
              ? state.granting_roles.map((role) => roleLabelFor(role, matrix)).join(', ')
              : '–'}
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
