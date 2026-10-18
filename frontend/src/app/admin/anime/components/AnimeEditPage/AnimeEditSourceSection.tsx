'use client'

import { Button } from '@/components/ui'

import styles from '../../../admin.module.css'
import createStyles from '../../create/page.module.css'
import workspaceStyles from '../ManualCreate/ManualCreateWorkspace.module.css'
import { CreateJellyfinCard } from '../../create/CreateJellyfinCard'
import { useJellyfinIntake } from '../../hooks/useJellyfinIntake'
import type { AnimeDetail } from '@/types/anime'

/**
 * Task 2 (quick-261018-l5r), reiner Umbau ohne Verhaltensänderung: ausgelagerte "Quelle"-Sektion
 * der Anime-Bearbeitung (Identität-Karte + Jellyfin-Such-/Verbinden-Karte), extrahiert aus
 * AnimeEditWorkspace.tsx (CLAUDE.md 450-Zeilen-Regel). Task 3 ergänzt hier die neue
 * AniSearch-Verknüpfungs-Karte, ohne diese Datei erneut aufteilen zu müssen.
 */

export function hasProviderSource(
  prefix: 'anisearch:' | 'jellyfin:',
  source?: string | null,
  sourceLinks?: string[] | null,
): boolean {
  const normalizedPrefix = prefix.toLowerCase()
  if ((source || '').trim().toLowerCase().startsWith(normalizedPrefix)) return true
  return (sourceLinks ?? []).some((value) => value.trim().toLowerCase().startsWith(normalizedPrefix))
}

interface AnimeEditSourceSectionProps {
  anime: AnimeDetail
  effectiveAniSearchID: string
  aniSearchURL: string
  effectiveJellyfinSeriesID: string
  effectiveFolderPath: string
  hasJellyfinSource: boolean
  jellyfinIntake: ReturnType<typeof useJellyfinIntake>
  hasAdoptedJellyfinSelection: boolean
  isSubmitting: boolean
  onJellyfinSearch: () => void
  onJellyfinSelect: (candidateID: string) => void
  onJellyfinAdopt: (candidateID: string) => void
  onDiscardJellyfinSelection: () => void
}

export function AnimeEditSourceSection({
  anime,
  effectiveAniSearchID,
  aniSearchURL,
  effectiveJellyfinSeriesID,
  effectiveFolderPath,
  hasJellyfinSource,
  jellyfinIntake,
  hasAdoptedJellyfinSelection,
  isSubmitting,
  onJellyfinSearch,
  onJellyfinSelect,
  onJellyfinAdopt,
  onDiscardJellyfinSelection,
}: AnimeEditSourceSectionProps) {
  return (
    <div className={createStyles.providerGrid}>
      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Identität</p>
          <h2 className={workspaceStyles.sectionTitle}>Bestehender Anime</h2>
        </div>

        <div className={styles.gridTwo}>
          <div className={workspaceStyles.infoField}>
            <span>Anime ID</span>
            <strong className={workspaceStyles.infoValue}>{anime.id}</strong>
          </div>
          <div className={`${workspaceStyles.infoField} ${workspaceStyles.infoFieldWithAction}`}>
            <span>AniSearch ID</span>
            <div className={workspaceStyles.infoAction}>
              <strong className={workspaceStyles.infoValue}>{effectiveAniSearchID || '—'}</strong>
              <Button
                href={aniSearchURL || '#'}
                target="_blank"
                rel="noreferrer"
                variant="secondary"
                size="sm"
                disabled={!aniSearchURL}
              >
                AniSearch öffnen
              </Button>
            </div>
          </div>
          <div className={workspaceStyles.infoField}>
            <span>Jellyfin Item ID</span>
            <strong className={`${workspaceStyles.infoValue} ${workspaceStyles.infoValueMono}`}>{effectiveJellyfinSeriesID || '—'}</strong>
          </div>
          <div className={workspaceStyles.infoField}>
            <span>Quelle</span>
            <strong className={workspaceStyles.infoValue}>{hasJellyfinSource ? 'Jellyfin' : 'Manuell'}</strong>
          </div>
          <div className={`${workspaceStyles.infoField} ${workspaceStyles.infoFieldWide}`}>
            <span>Ordnerpfad</span>
            <code className={workspaceStyles.infoValue}>{effectiveFolderPath || '—'}</code>
          </div>
        </div>
      </section>

      <section className={workspaceStyles.sectionCard}>
        <CreateJellyfinCard
          query={jellyfinIntake.query}
          candidates={jellyfinIntake.candidates}
          currentAnimeID={anime.id}
          selectedCandidateID={jellyfinIntake.reviewState.selectedCandidate?.jellyfin_series_id}
          hasAdoptedAssets={hasAdoptedJellyfinSelection}
          isSearching={jellyfinIntake.isSearching}
          isLoadingPreview={jellyfinIntake.isLoadingPreview}
          canSearch={jellyfinIntake.query.trim().length >= 2}
          isSubmitting={isSubmitting}
          showResults={jellyfinIntake.candidates.length > 0 || jellyfinIntake.reviewState.mode !== 'idle'}
          onQueryChange={jellyfinIntake.setQuery}
          onSearch={onJellyfinSearch}
          onSelectCandidate={onJellyfinSelect}
          onAdoptCandidate={onJellyfinAdopt}
          onDiscard={onDiscardJellyfinSelection}
        />
      </section>
    </div>
  )
}
