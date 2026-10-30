import type { ReactNode } from 'react'

import { Badge } from './Badge'
import { Button } from './Button'
import type { CapabilityActivationStatus } from '@/types/admin-capability'

/**
 * Honest activation-status vocabulary for capability mutations (Plan 138-02,
 * CAP-10/D-21, UI-SPEC.md Section C). The role-matrix mutation path and the
 * personal-override mutation path have genuinely DIFFERENT honest vocabularies
 * -- there is no async window on the role-matrix path (no "wird aktiviert"
 * spinner is ever legitimate there), while the override path can legitimately
 * report a post-commit enrichment failure as "pending". This component
 * therefore accepts a discriminated `path` prop instead of one shared enum
 * that would pretend the two paths are the same.
 */
export type ActivationStatusIndicatorProps =
  | {
      /** Role-matrix grant/revoke mutation result (backend/internal/handlers/admin_capability_handler.go). */
      path: 'role_matrix'
      /** Mirrors RoleCapabilityMutationResult.cache_reload_succeeded. */
      cacheReloadSucceeded: boolean
      /** Optional retry affordance rendered only in the failure case. */
      onRetry?: () => void
    }
  | {
      /** Personal per-user capability-override mutation result (EffectiveRightsService.MutateOverride). */
      path: 'override'
      activationStatus: CapabilityActivationStatus
    }

const ROLE_MATRIX_SUCCESS_TEXT = 'Gespeichert und aktiv.'
const ROLE_MATRIX_FAILURE_TEXT =
  'Gespeichert, aber nicht aktiv: Der Rechte-Cache konnte nicht aktualisiert werden. Erneut versuchen oder Administrator informieren.'
const OVERRIDE_ACTIVE_TEXT = 'Gespeichert und sofort aktiv.'
const OVERRIDE_PENDING_TEXT = 'Status wird geprüft — bitte Seite neu laden, um den aktuellen Stand zu sehen.'

/**
 * Renders the honest, locked activation-status copy for a capability
 * mutation (UI-SPEC.md Copywriting Contract), on top of the shared `Badge`
 * primitive per 138-PATTERNS.md's "No Analog Found" role-match entry --
 * never a hand-rolled status pill and never new color tokens (D-35).
 */
export function ActivationStatusIndicator(props: ActivationStatusIndicatorProps): ReactNode {
  if (props.path === 'role_matrix') {
    if (props.cacheReloadSucceeded) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Badge variant="success">{ROLE_MATRIX_SUCCESS_TEXT}</Badge>
        </span>
      )
    }

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Badge variant="danger">{ROLE_MATRIX_FAILURE_TEXT}</Badge>
        {props.onRetry ? (
          <Button variant="secondary" size="sm" onClick={props.onRetry}>
            Erneut versuchen
          </Button>
        ) : null}
      </span>
    )
  }

  // path === 'override'
  if (props.activationStatus === 'active') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Badge variant="success">{OVERRIDE_ACTIVE_TEXT}</Badge>
      </span>
    )
  }

  if (props.activationStatus === 'pending') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Badge variant="warning">{OVERRIDE_PENDING_TEXT}</Badge>
      </span>
    )
  }

  // 'persisted' and 'failed' are schema-compatible reserved values that
  // MutateOverride never produces today (UI-SPEC.md Section C: a real failure
  // on the override path is a 4xx/5xx returned BEFORE any activation status
  // is constructed at all -- a 200 response can never carry 'failed', and
  // 'persisted' is reserved for a future cache-activation model that does not
  // exist on this path yet, per capability_policy_contract.go's
  // CapabilityActivationStatus doc comment). Rendering nothing here is the
  // defensive fallback for an unreachable state rather than inventing a
  // fake vocabulary entry for it.
  return null
}
