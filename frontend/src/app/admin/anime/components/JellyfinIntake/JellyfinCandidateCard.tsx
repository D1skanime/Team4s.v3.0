import Link from 'next/link'
import type { AdminJellyfinIntakeSearchItem } from '@/types/admin'
import { resolveJellyfinIntakeAssetUrl } from '../../utils/jellyfin-intake-assets'

import styles from './JellyfinCandidateCard.module.css'

interface JellyfinCandidateCardProps {
  candidate: AdminJellyfinIntakeSearchItem
  isSelected?: boolean
  isLoadingPreview?: boolean
  onSelect: (candidateID: string) => void
  onLoadPreview: (candidateID: string) => void
}

function renderPreviewTile(label: string, candidateName: string, url?: string) {
  const resolvedUrl = resolveJellyfinIntakeAssetUrl(url)
  return (
    <div className={styles.previewTile}>
      <span className={styles.previewLabel}>{label}</span>
      <div className={styles.previewFrame}>
        {resolvedUrl ? (
          <img className={styles.previewImage} src={resolvedUrl} alt={`${label} Vorschau fuer ${candidateName}`} />
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

export function JellyfinCandidateCard({
  candidate,
  isSelected = false,
  isLoadingPreview = false,
  onSelect,
  onLoadPreview,
}: JellyfinCandidateCardProps) {
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

      {candidate.already_imported ? (
        <div className={styles.importedState}>
          <strong>Bereits als Anime angelegt</strong>
          <p>
            {candidate.existing_title || candidate.name}
            {candidate.existing_anime_id ? ` (#${candidate.existing_anime_id})` : ''}
          </p>
          {candidate.existing_anime_id ? (
            <Link className={styles.importedLink} href={`/admin/anime/${candidate.existing_anime_id}/edit`}>
              Bestehenden Anime oeffnen
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className={styles.previewGrid}>
        {renderPreviewTile('poster', candidate.name, candidate.poster_url)}
        {renderPreviewTile('banner', candidate.name, candidate.banner_url)}
        {renderPreviewTile('logo', candidate.name, candidate.logo_url)}
        {renderPreviewTile('background', candidate.name, candidate.background_url)}
      </div>

      <div className={styles.actions}>
        {!isSelected ? (
          <button className={styles.actionButtonSecondary} type="button" onClick={() => onSelect(candidate.jellyfin_series_id)}>
            Diesen Treffer ansehen
          </button>
        ) : (
          <span className={styles.selectionHint}>Nur Fokus und Vergleich. Noch nichts ins Formular uebernommen.</span>
        )}
        {candidate.already_imported ? (
          <button className={styles.actionButtonDisabled} type="button" disabled>
            Bereits importiert
          </button>
        ) : (
          <button className={styles.actionButton} type="button" onClick={() => onLoadPreview(candidate.jellyfin_series_id)}>
            {isLoadingPreview ? 'Jellyfin-Vorschau laedt...' : 'Jellyfin Vorschau laden'}
          </button>
        )}
      </div>
    </article>
  )
}
