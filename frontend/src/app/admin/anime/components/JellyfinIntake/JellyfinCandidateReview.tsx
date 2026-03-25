import type { AdminJellyfinIntakeSearchItem } from '@/types/admin'

import { JellyfinCandidateCard } from './JellyfinCandidateCard'
import styles from './JellyfinCandidateReview.module.css'

interface JellyfinCandidateReviewProps {
  query: string
  candidates: AdminJellyfinIntakeSearchItem[]
  selectedCandidateID?: string | null
  onReviewCandidate: (candidateID: string) => void
}

export function JellyfinCandidateReview({
  query,
  candidates,
  selectedCandidateID,
  onReviewCandidate,
}: JellyfinCandidateReviewProps) {
  return (
    <section className={styles.surface}>
      <div className={styles.compactPicker}>
        <strong>Jellyfin-Treffer fuer "{query}"</strong>
        <div className={styles.compactList}>
          {candidates.map((candidate) => (
            <button
              key={candidate.jellyfin_series_id}
              className={styles.compactItem}
              type="button"
              onClick={() => onReviewCandidate(candidate.jellyfin_series_id)}
            >
              {candidate.name}
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
            onReview={onReviewCandidate}
          />
        ))}
      </div>
    </section>
  )
}
