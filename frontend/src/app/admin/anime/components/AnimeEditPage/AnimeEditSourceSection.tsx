'use client'

import { useState } from 'react'

import { Button } from '@/components/ui'
import type { AnimeDetail } from '@/types/anime'

import styles from '../../../admin.module.css'
import createStyles from '../../create/page.module.css'
import workspaceStyles from '../ManualCreate/ManualCreateWorkspace.module.css'
import { CreateJellyfinCard } from '../../create/CreateJellyfinCard'
import { AniSearchSearchCard } from '../shared/AniSearchSearchCard'
import { useAnimeEditAniSearchLink } from '../../hooks/useAnimeEditAniSearchLink'
import { useJellyfinIntake } from '../../hooks/useJellyfinIntake'
import { buildAniSearchAnimeURL } from '../../utils/anime-helpers'

/**
 * Task 2 (quick-261018-l5r), reiner Umbau ohne Verhaltensänderung: ausgelagerte "Quelle"-Sektion
 * der Anime-Bearbeitung (Identität-Karte + Jellyfin-Such-/Verbinden-Karte), extrahiert aus
 * AnimeEditWorkspace.tsx (CLAUDE.md 450-Zeilen-Regel). Task 3 ergänzt die neue
 * AniSearch-Verknüpfungs-Karte (fehlendes Gegenstück zu CreateJellyfinCard, siehe
 * .planning/debug/anisearch-link-missing-on-create.md) -- nutzt ausschließlich
 * @/components/ui-Primitives für den NEUEN Code (CLAUDE.md Frontend-UI-Regel); die
 * bestehende Identitäts-Karte oben nutzt weiterhin natives Markup (Task-2-Altbestand, hier nicht
 * nachgezogen).
 */

/**
 * Teil B (quick-261018-l5r): deutsche Kurzbeschriftungen fuer die 8
 * Uebernahme-Felder der additiven AniSearch-Verknuepfung -- es gibt an keiner
 * anderen Stelle im Code eine wiederverwendbare Beschriftung fuer genau diese
 * rohen Backend-Feldnamen (createAniSearchSummary.ts zeigt die rohen Keys
 * unverändert an), daher hier bewusst eine kleine, lokale Map statt einer
 * verwaisten/irrefuehrenden Wiederverwendung.
 */
const ANISEARCH_TAKEOVER_FIELD_LABELS: Record<string, string> = {
  title_de: 'Titel (DE)',
  title_en: 'Titel (EN)',
  year: 'Jahr',
  max_episodes: 'Max. Episoden',
  genre: 'Genres',
  tags: 'Tags',
  description: 'Beschreibung',
  type: 'Format/Typ',
}

function labelForAniSearchTakeoverField(field: string): string {
  return ANISEARCH_TAKEOVER_FIELD_LABELS[field] ?? field
}

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
  // Task 3: ueberschreibt die angezeigte AniSearch-ID/URL sofort nach einem erfolgreichen
  // Verknuepfen-Request, bis `anime` beim naechsten Laden den neuen Wert selbst mitbringt (Plan-
  // Vorgabe: "lokaler State, der die Response ueberschreibt").
  const [linkedOverride, setLinkedOverride] = useState<{ anisearchID: string; source: string } | null>(null)
  const aniSearchLink = useAnimeEditAniSearchLink({
    animeID: anime.id,
    onLinked: (result) => setLinkedOverride(result),
  })

  const displayedAniSearchID = linkedOverride?.anisearchID || effectiveAniSearchID
  const displayedAniSearchURL = linkedOverride ? buildAniSearchAnimeURL(linkedOverride.anisearchID) : aniSearchURL

  // Teil B (quick-261018-l5r): "Übernommen" fasst gefüllte und ersetzte Felder zusammen (dem
  // Admin ist nur wichtig, WAS sich geändert hat, nicht ob das Feld vorher leer oder befüllt war).
  const takeover = aniSearchLink.linkTakeover
  const takeoverAppliedFieldLabels = takeover
    ? [...takeover.filled, ...takeover.replaced].map(labelForAniSearchTakeoverField)
    : []
  const takeoverKeptFields = takeover?.kept ?? []

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
              <strong className={workspaceStyles.infoValue}>{displayedAniSearchID || '—'}</strong>
              <Button
                href={displayedAniSearchURL || '#'}
                target="_blank"
                rel="noreferrer"
                variant="secondary"
                size="sm"
                disabled={!displayedAniSearchURL}
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
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>AniSearch</p>
          <h2 className={workspaceStyles.sectionTitle}>AniSearch verknüpfen</h2>
        </div>

        <AniSearchSearchCard
          searchInputId="edit-anisearch-title-search"
          searchLabel="AniSearch-Titel suchen"
          searchPlaceholder="z. B. Freezing"
          searchQuery={aniSearchLink.titleQuery}
          onSearchQueryChange={aniSearchLink.setTitleQuery}
          onSearchSubmit={() => {
            void aniSearchLink.handleTitleSearch()
          }}
          isSearchingCandidates={aniSearchLink.isSearching}
          searchButtonLabel="Suchen"
          idInputId="edit-anisearch-id-input"
          idLabel="AniSearch-ID oder -URL"
          idPlaceholder="z. B. 6465 oder https://www.anisearch.de/anime/6465,freezing"
          idValue={aniSearchLink.idOrUrlInput}
          onIDChange={aniSearchLink.setIdOrUrlInput}
          onSubmit={() => {
            void aniSearchLink.handleLink()
          }}
          isSubmitting={aniSearchLink.isLinking}
          submitButtonLabel="Verknüpfen"
          candidates={aniSearchLink.candidates}
          onCandidateSelect={aniSearchLink.handleSelectCandidate}
          candidateActionLabel="Übernehmen"
        />

        {aniSearchLink.linkConflict ? (
          <div className={styles.errorBox} role="alert">
            <p>
              Diese AniSearch-ID ist bereits mit „{aniSearchLink.linkConflict.existingTitle}“ verknüpft.
            </p>
            <Button href={aniSearchLink.linkConflict.redirectPath} variant="ghost" size="sm">
              Zum anderen Anime wechseln
            </Button>
          </div>
        ) : null}

        {!aniSearchLink.linkConflict && aniSearchLink.linkErrorMessage ? (
          <div className={styles.errorBox} role="alert">
            <p>{aniSearchLink.linkErrorMessage}</p>
          </div>
        ) : null}

        {aniSearchLink.linkSuccessMessage ? (
          <p className={styles.hint} role="status">
            {aniSearchLink.linkSuccessMessage}
          </p>
        ) : null}

        {takeover?.jellyfin_unreachable ? (
          <div className={styles.warningBox} role="status">
            Jellyfin nicht erreichbar – nur leere Felder gefüllt.
          </div>
        ) : null}

        {takeoverAppliedFieldLabels.length > 0 ? (
          <p className={styles.hint} role="status">
            Übernommen: {takeoverAppliedFieldLabels.join(', ')}
          </p>
        ) : null}

        {takeoverKeptFields.length > 0 ? (
          <p
            className={styles.hint}
            role="status"
            title={takeoverKeptFields.map((entry) => entry.reason).join(' / ')}
          >
            Behalten (manuell geändert):{' '}
            {takeoverKeptFields.map((entry) => labelForAniSearchTakeoverField(entry.field)).join(', ')}
          </p>
        ) : null}
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
