import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { CapabilityActivationStatus } from '@/types/admin-capability'
import styles from './ActivationStatusIndicator.module.css'

/**
 * Zeigt ehrlich an, ob eine Rechte-Änderung bereits wirksam ist oder nicht. Die Rollenmatrix
 * (Pfad `role_matrix`) und die persönliche Ausnahme für ein einzelnes Mitglied (Pfad
 * `override`) haben unterschiedliche, tatsächlich mögliche Zustände -- die Rollenmatrix kennt
 * keinen "wird geprüft"-Zwischenzustand, die persönliche Ausnahme schon.
 */
export type ActivationStatusIndicatorProps =
  | {
      path: 'role_matrix'
      cacheReloadSucceeded: boolean
      /** Wiederholen-Knopf, nur im Fehlerfall gerendert. */
      onRetry?: () => void
    }
  | {
      path: 'override'
      activationStatus: CapabilityActivationStatus
    }

const ROLE_MATRIX_SUCCESS_TEXT = 'Gespeichert und aktiv.'
const ROLE_MATRIX_FAILURE_TEXT =
  'Gespeichert, aber nicht aktiv: Der Rechte-Cache konnte nicht aktualisiert werden. Erneut versuchen oder Administrator informieren.'
const OVERRIDE_ACTIVE_TEXT = 'Gespeichert und sofort aktiv.'
const OVERRIDE_PENDING_TEXT = 'Status wird geprüft — bitte Seite neu laden, um den aktuellen Stand zu sehen.'

/**
 * Rendert den Aktivierungsstatus einer Rechte-Änderung als Badge. Für die Zustände "persisted"
 * und "failed" der persönlichen Ausnahme rendert die Komponente bewusst nichts: Diese Werte
 * sind im Vertrag zwar vorgesehen, treten beim heutigen Speicherpfad aber nie tatsächlich auf
 * (ein echter Fehler kommt als HTTP-Fehlerantwort VOR jeder Statuskonstruktion zurück).
 */
export function ActivationStatusIndicator(props: ActivationStatusIndicatorProps): ReactNode {
  if (props.path === 'role_matrix') {
    if (props.cacheReloadSucceeded) {
      return (
        <span className={styles.activationStatusIndicator}>
          <Badge variant="success">{ROLE_MATRIX_SUCCESS_TEXT}</Badge>
        </span>
      )
    }

    return (
      <span className={styles.activationStatusIndicator}>
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
      <span className={styles.activationStatusIndicator}>
        <Badge variant="success">{OVERRIDE_ACTIVE_TEXT}</Badge>
      </span>
    )
  }

  if (props.activationStatus === 'pending') {
    return (
      <span className={styles.activationStatusIndicator}>
        <Badge variant="warning">{OVERRIDE_PENDING_TEXT}</Badge>
      </span>
    )
  }

  return null
}
