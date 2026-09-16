'use client'

import { useState } from 'react'

import { EpisodeClassificationFields } from '@/components/episodes/EpisodeClassificationFields'
import type { EpisodeClassification } from '@/types/episodeClassification'

import styles from './EpisodeVersionEditor.module.css'

interface EpisodeClassificationSectionProps {
  classification: EpisodeClassification
}

/**
 * Canon/Filler und Episodentyp im Versionseditor. Die Werte gehören zur
 * übergeordneten Episode; Speichern ändert den Episode-Datensatz, nicht die Version.
 */
export function EpisodeClassificationSection({ classification }: EpisodeClassificationSectionProps) {
  const [current, setCurrent] = useState(classification)

  return (
    <section className={styles.card} aria-labelledby="episode-classification-title">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="episode-classification-title" className={styles.sectionTitle}>
            Episode {current.episode_number}
          </h2>
          <p className={styles.helperText}>
            Canon/Filler und Episodentyp gehören zur Episode und gelten für alle ihre Versionen,
            nicht nur für diese. Änderungen werden sofort gespeichert.
          </p>
        </div>
      </div>
      <EpisodeClassificationFields
        key={current.episode_id}
        classification={current}
        onSaved={setCurrent}
        layout="stacked"
      />
    </section>
  )
}
