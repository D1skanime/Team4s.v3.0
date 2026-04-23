"use client";

import React from "react";
import Link from "next/link";

import styles from "../../admin.module.css";
import createStyles from "./page.module.css";
import workspaceStyles from "../components/ManualCreate/ManualCreateWorkspace.module.css";
import { AnimeCreateGenreField } from "../components/CreatePage/AnimeCreateGenreField";
import { AnimeCreateTagField } from "../components/CreatePage/AnimeCreateTagField";
import { CreateAniSearchIntakeCard } from "./CreateAniSearchIntakeCard";
import { CreateAssetSearchDialog } from "./CreateAssetSearchDialog";
import { CreateAssetSection } from "./CreateAssetSection";
import { CreateJellyfinCard } from "./CreateJellyfinCard";
import { CreatePageStepper } from "./CreatePageStepper";
import { CreateReviewSection } from "./CreateReviewSection";
import {
  buildCreateSuccessMessage,
  appendJellyfinLinkageToCreatePayload,
  buildManualCreateRedirectPath,
  CREATE_REDIRECT_DELAY_MS,
  createManualAnimeAndRedirect,
  formatCreatePageError,
  resolveJellyfinPreviewBaseDraft,
  resolveJellyfinReviewVisibility,
  resolveSourceActionState,
} from "./createPageHelpers";
import { useAdminAnimeCreateController } from "./useAdminAnimeCreateController";

export {
  buildCreateSuccessMessage,
  appendJellyfinLinkageToCreatePayload,
  buildManualCreateRedirectPath,
  CREATE_REDIRECT_DELAY_MS,
  createManualAnimeAndRedirect,
  formatCreatePageError,
  resolveJellyfinPreviewBaseDraft,
  resolveJellyfinReviewVisibility,
  resolveSourceActionState,
};
export { buildManualCreateDraftSnapshot } from "../hooks/useManualAnimeDraft";
export {
  stageManualCreateCover,
  uploadCreatedAnimeCover,
} from "./createAssetUploadPlan";

const ANIME_TYPES = ["tv", "film", "ova", "ona", "special", "bonus"] as const;
const CONTENT_TYPES = ["anime", "hentai"] as const;
const ANIME_STATUSES = ["disabled", "ongoing", "done", "aborted", "licensed"] as const;

export default function AdminAnimeCreatePage() {
  const controller = useAdminAnimeCreateController();
  const {
    anisearch,
    assetSearch,
    debug,
    errorMessage,
    fileInputRefs,
    handlers,
    jellyfin,
    manualDraft,
    status,
  } = controller;

  const reviewMissingFields: string[] = [];
  if (!manualDraft.values.title.trim()) reviewMissingFields.push("Titel");
  if (!manualDraft.hasCover) {
    reviewMissingFields.push("Cover");
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link> |{" "}
        <Link href="/admin/anime">Studio</Link> | <Link href="/auth">Auth</Link>
      </p>

      <div className={createStyles.pageShell}>
        <header className={createStyles.pageHeader}>
          <div className={createStyles.pageTitleBlock}>
            <h1 className={createStyles.pageTitle}>Anime erstellen</h1>
            <p className={createStyles.pageIntro}>
              Schritt fuer Schritt zum perfekten Ergebnis.
            </p>
          </div>
        </header>

        <CreatePageStepper activeStep={1} />

        <section id="section-1" className={createStyles.pageSection}>
          <div className={createStyles.sectionHeading}>
            <span className={createStyles.sectionNumber}>1</span>
            <div>
              <h2 className={createStyles.sectionTitle}>Anime finden</h2>
              <p className={createStyles.sectionSub}>
                Suche den Anime in AniSearch und waehle anschliessend den passenden
                Ordner in Jellyfin aus.
              </p>
            </div>
          </div>

          <div className={createStyles.providerGrid}>
            <CreateAniSearchIntakeCard
              anisearchID={anisearch.input}
              searchQuery={anisearch.searchQuery}
              isLoading={anisearch.isLoading}
              isSearchingCandidates={anisearch.isSearchingCandidates}
              candidates={anisearch.candidates}
              result={anisearch.result}
              conflict={anisearch.conflict}
              errorMessage={anisearch.errorMessage}
              onAniSearchIDChange={handlers.setAniSearchID}
              onSearchQueryChange={handlers.setAniSearchSearchQuery}
              onSearchSubmit={() => {
                void handlers.handleAniSearchCandidateSearch();
              }}
              onCandidateDismiss={handlers.clearAniSearchState}
              onCandidateSelect={(candidate) => {
                void handlers.handleAniSearchCandidateSelect(candidate);
              }}
              onSubmit={() => {
                void handlers.handleAniSearchDraftLoad();
              }}
            />

            <CreateJellyfinCard
              query={jellyfin.intake.query}
              candidates={jellyfin.intake.candidates}
              selectedCandidateID={jellyfin.intake.reviewState.selectedCandidate?.jellyfin_series_id}
              hasAdoptedAssets={jellyfin.hasAdoptedPreview}
              isSearching={jellyfin.intake.isSearching}
              isLoadingPreview={jellyfin.intake.isLoadingPreview}
              canSearch={jellyfin.searchState.canSearch}
              isSubmitting={status.isSubmittingCreate}
              showResults={jellyfin.showResults}
              onQueryChange={handlers.setJellyfinQuery}
              onSearch={() => {
                void handlers.handleJellyfinSearch();
              }}
              onSelectCandidate={handlers.handleJellyfinCandidateSelect}
              onAdoptCandidate={(id) => {
                void handlers.handleJellyfinCandidateAdopt(id);
              }}
              onDiscard={handlers.handleDiscardJellyfinPreview}
            />
          </div>
        </section>

        <section id="section-2" className={createStyles.pageSection}>
          <div className={createStyles.sectionHeading}>
            <span className={createStyles.sectionNumber}>2</span>
            <div>
              <h2 className={createStyles.sectionTitle}>Assets</h2>
              <p className={createStyles.sectionSub}>
                Pruefe und ergaenze die Assets. Du kannst sie aus Jellyfin
                uebernehmen, manuell hochladen oder online suchen.
              </p>
            </div>
          </div>

          <CreateAssetSection
            stagedCover={manualDraft.stagedCover}
            stagedBanner={manualDraft.stagedAssets.banner}
            stagedLogo={manualDraft.stagedAssets.logo}
            stagedBackgrounds={manualDraft.stagedAssets.background}
            stagedBackgroundVideos={manualDraft.stagedAssets.background_video}
            jellyfinDraftAssets={jellyfin.draftAssets}
            onOpenFileDialog={handlers.openAssetFileDialog}
            onOpenAssetSearch={handlers.openAssetSearch}
            onRemoveSingleAsset={handlers.removeSingleAsset}
            onRemoveBackground={handlers.removeBackground}
            onRemoveBackgroundVideo={handlers.removeBackgroundVideo}
            onRemoveJellyfinAsset={handlers.handleRemoveJellyfinAsset}
            fileInputRefs={fileInputRefs}
          />

          <input
            ref={fileInputRefs.cover}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                await handlers.handleCoverUpload(file);
              } finally {
                event.target.value = "";
              }
            }}
          />
          <input
            ref={fileInputRefs.banner}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={(event) =>
              handlers.handleSingleAssetInputChange("banner", event)
            }
          />
          <input
            ref={fileInputRefs.logo}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={(event) =>
              handlers.handleSingleAssetInputChange("logo", event)
            }
          />
          <input
            ref={fileInputRefs.background}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={handlers.handleBackgroundInputChange}
          />
          <input
            ref={fileInputRefs.background_video}
            className={styles.fileInput}
            type="file"
            accept="video/*"
            onChange={handlers.handleBackgroundVideoInputChange}
          />
        </section>

        <section id="section-3" className={createStyles.pageSection}>
          <div className={createStyles.sectionHeading}>
            <span className={createStyles.sectionNumber}>3</span>
            <div>
              <h2 className={createStyles.sectionTitle}>Details</h2>
              <p className={createStyles.sectionSub}>
                Ergaenze die Metadaten und Beschreibung.
              </p>
            </div>
          </div>

          <div className={createStyles.detailsStack}>
            <section className={workspaceStyles.sectionCard}>
              <div className={workspaceStyles.sectionHeader}>
                <p className={workspaceStyles.sectionEyebrow}>Pflichtangaben</p>
                <h2 className={workspaceStyles.sectionTitle}>Basisdaten</h2>
                <p className={workspaceStyles.sectionText}>
                  Titel, Typ und Status bestimmen den Kern des Eintrags.
                </p>
              </div>

              <div className={styles.gridTwo}>
                <div className={`${styles.field} ${workspaceStyles.titleField}`}>
                  <label htmlFor="create-title">Titel *</label>
                  <div className={workspaceStyles.fieldMeta}>
                    <input
                      id="create-title"
                      className={`${workspaceStyles.titleFieldInput} ${
                        manualDraft.missingFields.includes("Titel")
                          ? workspaceStyles.inputInvalid
                          : ""
                      }`}
                      value={manualDraft.values.title}
                      onChange={(event) => handlers.setTitle(event.target.value)}
                      aria-invalid={manualDraft.missingFields.includes("Titel")}
                    />
                    <div className={workspaceStyles.titleActionRow}>
                      <span className={workspaceStyles.statusInline}>
                        {manualDraft.missingFields.includes("Titel")
                          ? "Titel fehlt"
                          : "Titel bereit"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-type">Typ *</label>
                  <select
                    id="create-type"
                    value={manualDraft.values.type}
                    onChange={(event) =>
                      handlers.setType(event.target.value as (typeof ANIME_TYPES)[number])
                    }
                  >
                    {ANIME_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-content-type">Inhaltstyp *</label>
                  <select
                    id="create-content-type"
                    value={manualDraft.values.contentType}
                    onChange={(event) =>
                      handlers.setContentType(
                        event.target.value as (typeof CONTENT_TYPES)[number],
                      )
                    }
                  >
                    {CONTENT_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-status">Status *</label>
                  <select
                    id="create-status"
                    value={manualDraft.values.status}
                    onChange={(event) =>
                      handlers.setStatus(
                        event.target.value as (typeof ANIME_STATUSES)[number],
                      )
                    }
                  >
                    {ANIME_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-year">Jahr</label>
                  <input
                    id="create-year"
                    value={manualDraft.values.year}
                    onChange={(event) => handlers.setYear(event.target.value)}
                    placeholder="z. B. 2026"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-max-episodes">Maximale Episoden</label>
                  <input
                    id="create-max-episodes"
                    value={manualDraft.values.maxEpisodes}
                    onChange={(event) => handlers.setMaxEpisodes(event.target.value)}
                    placeholder="z. B. 12"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-title-de">Titel DE</label>
                  <input
                    id="create-title-de"
                    value={manualDraft.values.titleDE}
                    onChange={(event) => handlers.setTitleDE(event.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-title-en">Titel EN</label>
                  <input
                    id="create-title-en"
                    value={manualDraft.values.titleEN}
                    onChange={(event) => handlers.setTitleEN(event.target.value)}
                  />
                </div>

                <div className={`${styles.field} ${createStyles.folderPathField}`}>
                  <label htmlFor="create-folder-path">Ordnerpfad</label>
                  <input
                    id="create-folder-path"
                    className={createStyles.folderPathInput}
                    value={jellyfin.folderPath}
                    placeholder="Noch kein Jellyfin-Ordner verknuepft"
                    readOnly
                  />
                </div>
              </div>
            </section>

            <section className={workspaceStyles.sectionCard}>
              <div className={workspaceStyles.sectionHeader}>
                <p className={workspaceStyles.sectionEyebrow}>Metadaten</p>
                <h2 className={workspaceStyles.sectionTitle}>
                  Genre, Tags und Beschreibung
                </h2>
                <p className={workspaceStyles.sectionText}>
                  Genres ordnen den Titel grob ein. Tags helfen bei Suche, Themen
                  und spaeterer Pflege.
                </p>
              </div>

              <div className={styles.grid}>
                <AnimeCreateGenreField
                  draft={manualDraft.values.genreDraft}
                  selectedTokens={manualDraft.values.genreTokens}
                  suggestions={manualDraft.suggestions.genre.options}
                  suggestionsTotal={manualDraft.suggestions.genre.total}
                  loadedTokenCount={manualDraft.suggestions.genre.loadedCount}
                  isLoading={manualDraft.suggestions.genre.isLoading}
                  error={manualDraft.suggestions.genre.error}
                  isSubmitting={status.isSubmittingCreate}
                  canLoadMore={manualDraft.suggestions.genre.canLoadMore}
                  canResetLimit={manualDraft.suggestions.genre.canResetLimit}
                  onDraftChange={handlers.setDraftGenre}
                  onAddDraft={handlers.addDraftGenre}
                  onRemoveToken={handlers.removeGenreToken}
                  onAddSuggestion={handlers.addGenreSuggestion}
                  onIncreaseLimit={handlers.increaseGenreLimit}
                  onResetLimit={handlers.resetGenreLimit}
                />

                <AnimeCreateTagField
                  draft={manualDraft.values.tagDraft}
                  selectedTokens={manualDraft.values.tagTokens}
                  suggestions={manualDraft.suggestions.tag.options}
                  suggestionsTotal={manualDraft.suggestions.tag.total}
                  loadedTokenCount={manualDraft.suggestions.tag.loadedCount}
                  isLoading={manualDraft.suggestions.tag.isLoading}
                  error={manualDraft.suggestions.tag.error}
                  isSubmitting={status.isSubmittingCreate}
                  canLoadMore={manualDraft.suggestions.tag.canLoadMore}
                  canResetLimit={manualDraft.suggestions.tag.canResetLimit}
                  onDraftChange={handlers.setDraftTag}
                  onAddDraft={handlers.addDraftTag}
                  onRemoveToken={handlers.removeTagToken}
                  onAddSuggestion={handlers.addTagSuggestion}
                  onIncreaseLimit={handlers.increaseTagLimit}
                  onResetLimit={handlers.resetTagLimit}
                />

                <div className={`${styles.field} ${workspaceStyles.descriptionField}`}>
                  <label htmlFor="create-description">Beschreibung</label>
                  <textarea
                    id="create-description"
                    className={workspaceStyles.descriptionArea}
                    value={manualDraft.values.description}
                    onChange={(event) => handlers.setDescription(event.target.value)}
                  />
                  <p className={workspaceStyles.fieldNote}>
                    Kurz, eindeutig und ohne Prozess-Text.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section id="section-4" className={createStyles.pageSection}>
          <div className={createStyles.sectionHeading}>
            <span className={createStyles.sectionNumber}>4</span>
            <div>
              <h2 className={createStyles.sectionTitle}>Pruefen & Anlegen</h2>
              <p className={createStyles.sectionSub}>Abschliessende Kontrolle.</p>
            </div>
          </div>

          <CreateReviewSection
            missingFields={reviewMissingFields}
            hasTitle={manualDraft.values.title.trim().length > 0}
            hasCover={manualDraft.hasCover}
            hasAniSearch={!!anisearch.result}
            hasJellyfin={jellyfin.hasAdoptedPreview}
            assetCount={
              jellyfin.selectedDraftAssetCount +
              (manualDraft.stagedAssets.background?.length ?? 0)
            }
            isSubmitting={status.isSubmittingCreate}
            successMessage={status.successMessage}
            errorMessage={errorMessage}
            onSubmit={() => {
              void handlers.handleCreateSubmit({
                preventDefault: () => undefined,
              } as React.FormEvent<HTMLFormElement>);
            }}
          />
        </section>

        <CreateAssetSearchDialog
          activeKind={assetSearch.activeKind}
          query={assetSearch.query}
          candidates={assetSearch.candidates}
          selectedCandidateIDs={assetSearch.selectedCandidateIDs}
          errorMessage={assetSearch.errorMessage}
          hasMore={assetSearch.hasMore}
          isOpen={assetSearch.isOpen}
          isSearching={assetSearch.isSearching}
          isAdopting={assetSearch.isAdopting}
          onClose={handlers.closeAssetSearch}
          onQueryChange={handlers.setAssetSearchQuery}
          onSearch={() => {
            void handlers.handleAssetCandidateSearch();
          }}
          onLoadMore={() => {
            void handlers.handleLoadMoreAssets();
          }}
          onToggleCandidate={handlers.toggleAssetCandidateSelection}
          onAdoptSelection={() => {
            void handlers.handleAssetCandidateAdoption();
          }}
        />

        {debug.showDebugPanel ? (
          <details className={createStyles.developerDetails}>
            <summary className={createStyles.developerSummary}>
              Debug Request/Response
            </summary>
            <div className={createStyles.developerBody}>
              {debug.lastRequest ? (
                <pre className={createStyles.developerBlock}>
                  <strong>Request</strong>
                  {"\n"}
                  {debug.lastRequest}
                </pre>
              ) : null}
              {debug.lastResponse ? (
                <pre className={createStyles.developerBlock}>
                  <strong>Response</strong>
                  {"\n"}
                  {debug.lastResponse}
                </pre>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </main>
  );
}
