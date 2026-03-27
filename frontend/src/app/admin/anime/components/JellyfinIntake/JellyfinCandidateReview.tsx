import type { AdminJellyfinIntakeSearchItem } from '@/types/admin'

import { JellyfinCandidateCard } from './JellyfinCandidateCard'
import styles from './JellyfinCandidateReview.module.css'

interface JellyfinCandidateReviewProps {
  query: string
  candidates: AdminJellyfinIntakeSearchItem[]
  selectedCandidateID?: string | null
  isLoadingPreview?: boolean
  onSelectCandidate: (candidateID: string) => void
  onLoadCandidatePreview: (candidateID: string) => void
}

export function JellyfinCandidateReview({
  query,
  candidates,
  selectedCandidateID,
  isLoadingPreview = false,
  onSelectCandidate,
  onLoadCandidatePreview,
}: JellyfinCandidateReviewProps) {
  return (
    <section className={styles.surface}>
      <div className={styles.compactPicker}>
        <strong>Jellyfin-Treffer fuer "{query}"</strong>
        <div className={styles.compactList}>
          {candidates.map((candidate) => (
            <button
              key={candidate.jellyfin_series_id}
              className={`${styles.compactItem} ${
                candidate.jellyfin_series_id === selectedCandidateID ? styles.compactItemSelected : ''
              }`}
              type="button"
              onClick={() => onSelectCandidate(candidate.jellyfin_series_id)}
            >
              <span>{candidate.name}</span>
              <span className={styles.compactMeta}>
                {candidate.production_year ? `${candidate.production_year} | ` : ''}
                {candidate.path || 'ohne Pfad'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.reviewGrid}>
        {candidates.map((candidate) => (
          <JellyfinCandidateCard
            key={candidate.jellyfin_series_id}
            candidate={candidate}
            isSelected={candidate.jellyfin_series_id === selectedCandidateID}
            isLoadingPreview={isLoadingPreview && candidate.jellyfin_series_id === selectedCandidateID}
            onSelect={onSelectCandidate}
            onLoadPreview={onLoadCandidatePreview}
          />
        ))}
      </div>
    </section>
  )
}
