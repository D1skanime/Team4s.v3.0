/**
 * D-01/D-02: 6 fachliche UI-Labels → visibility_code + review_status_code Mapping
 *
 * Die UI abstrahiert die zwei Phase-72-Achsen (visibilities + review_statuses)
 * zu einem einzigen bedienbaren Status-Dropdown mit 6 deutschen Labels.
 *
 * Quellen: database/migrations/0097_v12_status_foundation.up.sql (review_statuses)
 *          database/migrations/0037_add_release_decomposition_tables.up.sql (visibilities)
 */

export type StatusLabel =
  | 'öffentlich'
  | 'intern'
  | 'in Prüfung'
  | 'abgelehnt'
  | 'archiviert'
  | 'entfernt'

export interface StatusAxes {
  /** Sichtbarkeits-Code (maps auf visibilities.name) */
  visibilityCode: string
  /** Reviewstatus-Code (maps auf review_statuses.code) */
  reviewStatusCode: string
}

/**
 * Vollständiges D-02-Mapping: 6 UI-Labels → zwei DB-Achsen.
 * Frontend übergibt nur Code-Strings; ID-Auflösung bleibt im Backend.
 */
export const STATUS_LABEL_MAPPING: Record<StatusLabel, StatusAxes> = {
  öffentlich: { visibilityCode: 'public', reviewStatusCode: 'approved' },
  intern: { visibilityCode: 'private', reviewStatusCode: 'approved' },
  'in Prüfung': { visibilityCode: 'private', reviewStatusCode: 'in_review' },
  abgelehnt: { visibilityCode: 'private', reviewStatusCode: 'rejected' },
  archiviert: { visibilityCode: 'private', reviewStatusCode: 'archived' },
  entfernt: { visibilityCode: 'private', reviewStatusCode: 'removed' },
}

/**
 * Reihenfolge der Status-Labels im Dropdown (UI-SPEC: intern zuerst, dann in Prüfung als Default).
 */
export const STATUS_LABELS_ORDERED: StatusLabel[] = [
  'intern',
  'in Prüfung',
  'öffentlich',
  'abgelehnt',
  'archiviert',
  'entfernt',
]
