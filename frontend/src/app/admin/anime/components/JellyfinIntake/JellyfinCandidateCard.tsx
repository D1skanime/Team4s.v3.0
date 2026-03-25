import type { AdminJellyfinIntakeSearchItem } from '@/types/admin'

import styles from './JellyfinCandidateCard.module.css'

interface JellyfinCandidateCardProps {
  candidate: AdminJellyfinIntakeSearchItem
  isSelected?: boolean
  onReview: (candidateID: string) => void
}

function renderPreviewTile(label: string, url?: string) {
  return (
    <div className={styles.previewTile}>
      <span className={styles.previewLabel}>{label}</span>
      <div className={styles.previewFrame}>
        {url ? (
          <img className={styles.previewImage} src={url} alt={`${label} preview`} />
        ) : (
          <div className={styles.emptyFrame}>keine Vorschau</div>
        )}
      </div>
    </div>
  )
}

function confidenceLabel(confidence: AdminJellyfinIntakeSearchItem['confidence']) {
  switch (confidence) {
    case 'high':
      return 'Hohe Uebereinstimmung'
    case 'medium':
      return 'Mittlere Uebereinstimmung'
    default:
      return 'Niedrige Uebereinstimmung'
  }
}

export function JellyfinCandidateCard({ candidate, isSelected = false, onReview }: JellyfinCandidateCardProps) {
  return (
    <article className={`${styles.card} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{candidate.name}</h3>
          <div className={styles.meta}>
            <span>Jellyfin-ID: {candidate.jellyfin_series_id}</span>
            <span className={styles.path}>{candidate.path || 'ohne Pfad'}</span>
            <span>Parent: {candidate.parent_context || 'unbekannt'}</span>
            <span>Library: {candidate.library_context || 'unbekannt'}</span>
          </div>
        </div>
        <div className={styles.badgeColumn}>
          <span className={`${styles.badge} ${candidate.confidence === 'high' ? styles.confidenceHigh : ''}`}>
            {confidenceLabel(candidate.confidence)}
          </span>
          {isSelected ? <span className={styles.badge}>Ausgewaehlt</span> : null}
        </div>
      </div>

      <div className={styles.typeHint}>
        <p className={styles.typeLabel}>Typ-Vorschlag: {candidate.type_hint.suggested_type || 'offen'}</p>
        {candidate.type_hint.reasons.map((reason) => (
          <p key={reason} className={styles.reason}>
            {reason}
          </p>
        ))}
      </div>

      <div className={styles.previewGrid}>
        {renderPreviewTile('poster', candidate.poster_url)}
        {renderPreviewTile('banner', candidate.banner_url)}
        {renderPreviewTile('logo', candidate.logo_url)}
        {renderPreviewTile('background', candidate.background_url)}
      </div>

      <div className={styles.actions}>
        <button className={styles.actionButton} type="button" onClick={() => onReview(candidate.jellyfin_series_id)}>
          {isSelected ? 'Vorschau uebernehmen' : 'Treffer pruefen'}
        </button>
      </div>
    </article>
  )
}
