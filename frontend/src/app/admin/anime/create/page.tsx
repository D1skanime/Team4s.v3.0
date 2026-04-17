"use client";

import React from "react";
import Link from "next/link";

import styles from "../../admin.module.css";
import createStyles from "./page.module.css";
import { CreateAssetSearchDialog } from "./CreateAssetSearchDialog";
import { ManualCreateWorkspace } from "../components/ManualCreate/ManualCreateWorkspace";
import { CreateAniSearchIntakeCard } from "./CreateAniSearchIntakeCard";
import { CreateAssetSection } from "./CreateAssetSection";
import { CreateJellyfinCard } from "./CreateJellyfinCard";
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
import { CreatePageStepper } from "./CreatePageStepper";
import { CreateReviewSection } from "./CreateReviewSection";

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

export default function AdminAnimeCreatePage() {
  const controller = useAdminAnimeCreateController();
  const {
    debug,
    editor,
    errorMessage,
    fileInputRefs,
    handlers,
    jellyfin,
    manualDraft,
    status,
  } = controller;
  const reviewMissingFields: string[] = [];
  if (!manualDraft.values.title.trim()) reviewMissingFields.push("Titel");
  if (!manualDraft.stagedCover && !manualDraft.values.coverImage.trim()) reviewMissingFields.push("Cover");

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
              Schritt für Schritt zum perfekten Ergebnis.
            </p>
          </div>
        </header>
        <CreatePageStepper activeStep={1} />

        {/* ── Section 1: Anime finden ──────────────────────────────── */}
        <section id="section-1" className={createStyles.pageSection}>
          <div className={createStyles.sectionHeading}>
            <span className={createStyles.sectionNumber}>1</span>
            <div>
              <h2 className={createStyles.sectionTitle}>Anime finden</h2>
              <p className={createStyles.sectionSub}>
                Suche den Anime in AniSearch und wähle anschließend den passenden Ordner in Jellyfin aus.
              </p>
            </div>
          </div>
          <ManualCreateWorkspace
            editor={editor}
            title={manualDraft.values.title}
            type={manualDraft.values.type}
            contentType={manualDraft.values.contentType}
            status={manualDraft.values.status}
            year={manualDraft.values.year}
            maxEpisodes={manualDraft.values.maxEpisodes}
            titleDE={manualDraft.values.titleDE}
            titleEN={manualDraft.values.titleEN}
            genreDraft={manualDraft.values.genreDraft}
            genreTokens={manualDraft.values.genreTokens}
            tagDraft={manualDraft.values.tagDraft}
            tagTokens={manualDraft.values.tagTokens}
            description={manualDraft.values.description}
            coverImage={manualDraft.values.coverImage}
            coverPreviewUrl={manualDraft.stagedCover?.previewUrl}
            inputRefs={fileInputRefs}
            stagedBanner={manualDraft.stagedAssets.banner}
            stagedLogo={manualDraft.stagedAssets.logo}
            stagedBackgrounds={manualDraft.stagedAssets.background}
            stagedBackgroundVideo={manualDraft.stagedAssets.background_video}
            genreSuggestions={manualDraft.suggestions.genre.options}
            genreSuggestionsTotal={manualDraft.suggestions.genre.total}
            loadedTokenCount={manualDraft.suggestions.genre.loadedCount}
            isLoadingGenres={manualDraft.suggestions.genre.isLoading}
            genreError={manualDraft.suggestions.genre.error}
            tagSuggestions={manualDraft.suggestions.tag.options}
            tagSuggestionsTotal={manualDraft.suggestions.tag.total}
            loadedTagTokenCount={manualDraft.suggestions.tag.loadedCount}
            isLoadingTags={manualDraft.suggestions.tag.isLoading}
            tagError={manualDraft.suggestions.tag.error}
            tagSuggestionCanLoadMore={manualDraft.suggestions.tag.canLoadMore}
            tagSuggestionCanResetLimit={manualDraft.suggestions.tag.canResetLimit}
            isSubmitting={status.isSubmittingCreate}
            isUploadingCover={status.isUploadingCover}
            canLoadMore={manualDraft.suggestions.genre.canLoadMore}
            canResetLimit={manualDraft.suggestions.genre.canResetLimit}
            missingFields={manualDraft.missingFields}
            titleActions={undefined}
            titleHint={undefined}
            typeHint={undefined}
            draftAssets={undefined}
            onSubmit={handlers.handleCreateSubmit}
            onTitleChange={handlers.setTitle}
            onTypeChange={handlers.setType}
            onContentTypeChange={handlers.setContentType}
            onStatusChange={handlers.setStatus}
            onYearChange={handlers.setYear}
            onMaxEpisodesChange={handlers.setMaxEpisodes}
            onTitleDEChange={handlers.setTitleDE}
            onTitleENChange={handlers.setTitleEN}
            onDescriptionChange={handlers.setDescription}
            onCoverImageChange={handlers.setCoverImage}
            onDraftGenreChange={handlers.setDraftGenre}
            onAddDraftGenre={handlers.addDraftGenre}
            onRemoveGenreToken={handlers.removeGenreToken}
            onAddGenreSuggestion={handlers.addGenreSuggestion}
            onIncreaseGenreLimit={handlers.increaseGenreLimit}
            onResetGenreLimit={handlers.resetGenreLimit}
            onDraftTagChange={handlers.setDraftTag}
            onAddDraftTag={handlers.addDraftTag}
            onRemoveTagToken={handlers.removeTagToken}
            onAddTagSuggestion={handlers.addTagSuggestion}
            onIncreaseTagLimit={handlers.increaseTagLimit}
            onResetTagLimit={handlers.resetTagLimit}
            onCoverFileChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                await handlers.handleCoverUpload(file);
              } finally {
                event.target.value = "";
              }
            }}
            onSingleAssetFileChange={handlers.handleSingleAssetInputChange}
            onBackgroundFileChange={handlers.handleBackgroundInputChange}
            onOpenFileDialog={handlers.openAssetFileDialog}
            onOpenAssetSearch={handlers.openAssetSearch}
            onRemoveSingleAsset={handlers.removeSingleAsset}
            onRemoveBackground={handlers.removeBackground}
          />

          <div className={createStyles.providerGrid}>
            <CreateAniSearchIntakeCard
              anisearchID={controller.anisearch.input}
              searchQuery={controller.anisearch.searchQuery}
              isLoading={controller.anisearch.isLoading}
              isSearchingCandidates={controller.anisearch.isSearchingCandidates}
              candidates={controller.anisearch.candidates}
              result={controller.anisearch.result}
              conflict={controller.anisearch.conflict}
              errorMessage={controller.anisearch.errorMessage}
              onAniSearchIDChange={handlers.setAniSearchID}
              onSearchQueryChange={handlers.setAniSearchSearchQuery}
              onSearchSubmit={() => { void handlers.handleAniSearchCandidateSearch(); }}
              onCandidateDismiss={handlers.clearAniSearchState}
              onCandidateSelect={(candidate) => { void handlers.handleAniSearchCandidateSelect(candidate); }}
              onSubmit={() => { void handlers.handleAniSearchDraftLoad(); }}
            />
            <CreateJellyfinCard
              query={jellyfin.intake.query}
              candidates={jellyfin.intake.candidates}
              selectedCandidateID={jellyfin.intake.reviewState.selectedCandidate?.jellyfin_series_id}
              hasActivePreview={jellyfin.hasSelectedPreview}
              hasAdoptedAssets={jellyfin.selectedDraftAssetCount > 0}
              isSearching={jellyfin.intake.isSearching}
              isLoadingPreview={jellyfin.intake.isLoadingPreview}
              canSearch={jellyfin.searchState.canSearch}
              isSubmitting={status.isSubmittingCreate}
              showResults={jellyfin.showResults}
              onQueryChange={handlers.setJellyfinQuery}
              onSearch={() => { void handlers.handleJellyfinSearch(); }}
              onSelectCandidate={handlers.handleJellyfinCandidateSelect}
              onLoadCandidatePreview={(id) => { void handlers.handleJellyfinCandidateReview(id); }}
              onAdopt={handlers.handleJellyfinAdopt}
              onDiscard={handlers.handleDiscardJellyfinPreview}
            />
          </div>
        </section>

        {/* ── Section 2: Assets ────────────────────────────────────── */}
        <section id="section-2" className={createStyles.pageSection}>
          <div className={createStyles.sectionHeading}>
            <span className={createStyles.sectionNumber}>2</span>
            <div>
              <h2 className={createStyles.sectionTitle}>Assets</h2>
              <p className={createStyles.sectionSub}>
                Prüfe und ergänze die Assets. Du kannst sie aus Jellyfin übernehmen, manuell hochladen oder online suchen.
              </p>
            </div>
          </div>
          <CreateAssetSection
            stagedCoverPreviewUrl={manualDraft.stagedCover?.previewUrl}
            stagedBanner={manualDraft.stagedAssets.banner}
            stagedLogo={manualDraft.stagedAssets.logo}
            stagedBackgrounds={manualDraft.stagedAssets.background}
            stagedBackgroundVideo={manualDraft.stagedAssets.background_video}
            jellyfinDraftAssets={jellyfin.draftAssets}
            onOpenFileDialog={handlers.openAssetFileDialog}
            onOpenAssetSearch={handlers.openAssetSearch}
            onRemoveSingleAsset={handlers.removeSingleAsset}
            onRemoveBackground={handlers.removeBackground}
            onRemoveJellyfinAsset={handlers.handleRemoveJellyfinAsset}
            fileInputRefs={fileInputRefs}
          />
        </section>

        {/* ── Section 3: Details ───────────────────────────────────── */}
        <section id="section-3" className={createStyles.pageSection}>
          <div className={createStyles.sectionHeading}>
            <span className={createStyles.sectionNumber}>3</span>
            <div>
              <h2 className={createStyles.sectionTitle}>Details</h2>
              <p className={createStyles.sectionSub}>
                Ergänze die Metadaten und Beschreibung.
              </p>
            </div>
          </div>
          {/* Metadaten-Formular aus ManualCreateWorkspace wird hier isoliert — Plan 17-04 */}
        </section>

        {/* ── Section 4: Prüfen & Anlegen ──────────────────────────── */}
        <section id="section-4" className={createStyles.pageSection}>
          <div className={createStyles.sectionHeading}>
            <span className={createStyles.sectionNumber}>4</span>
            <div>
              <h2 className={createStyles.sectionTitle}>Prüfen & Anlegen</h2>
              <p className={createStyles.sectionSub}>Abschließende Kontrolle.</p>
            </div>
          </div>
          <CreateReviewSection
            missingFields={reviewMissingFields}
            hasTitle={manualDraft.values.title.trim().length > 0}
            hasCover={!!manualDraft.stagedCover || !!manualDraft.values.coverImage}
            hasAniSearch={!!controller.anisearch.result}
            hasJellyfin={jellyfin.hasSelectedPreview}
            assetCount={jellyfin.selectedDraftAssetCount + (manualDraft.stagedAssets.background?.length ?? 0)}
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
          activeKind={controller.assetSearch.activeKind}
          query={controller.assetSearch.query}
          candidates={controller.assetSearch.candidates}
          selectedCandidateIDs={controller.assetSearch.selectedCandidateIDs}
          errorMessage={controller.assetSearch.errorMessage}
          hasMore={controller.assetSearch.hasMore}
          isOpen={controller.assetSearch.isOpen}
          isSearching={controller.assetSearch.isSearching}
          isAdopting={controller.assetSearch.isAdopting}
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
