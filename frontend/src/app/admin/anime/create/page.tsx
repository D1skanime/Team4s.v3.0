"use client";

import Link from "next/link";

import styles from "../../admin.module.css";
import createStyles from "./page.module.css";
import { JellyfinDraftAssets } from "../components/ManualCreate/JellyfinDraftAssets";
import { ManualCreateWorkspace } from "../components/ManualCreate/ManualCreateWorkspace";
import { CreateJellyfinResultsPanel } from "./CreateJellyfinResultsPanel";
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

function CreatePageTypeHint({
  preview,
}: {
  preview: ReturnType<typeof useAdminAnimeCreateController>["jellyfin"]["preview"];
}) {
  if (!preview) return null;

  return (
    <div className={styles.details}>
      <strong>{preview.type_hint.suggested_type ?? "Typ-Hinweis"}</strong>
      <p className={styles.hint}>Vertrauen: {preview.type_hint.confidence}</p>
      <p className={styles.hint}>{preview.type_hint.reasons.join(" ")}</p>
    </div>
  );
}

export default function AdminAnimeCreatePage() {
  const controller = useAdminAnimeCreateController();
  const {
    auth,
    debug,
    editor,
    errorMessage,
    fileInputRefs,
    handlers,
    jellyfin,
    manualDraft,
    status,
  } = controller;
  const authStatusReady = auth.isHydrated;
  const authStatusClassName = authStatusReady
    ? auth.hasAuthToken
      ? createStyles.statusPillMuted
      : createStyles.statusPillWarning
    : createStyles.statusPillMuted;
  const authStatusLabel = authStatusReady
    ? auth.hasAuthToken
      ? "Auth bereit"
      : "Auth fehlt"
    : "Auth wird geladen";

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
              Pflicht sind nur Titel und Cover. Jellyfin bleibt eine optionale Hilfe.
            </p>
          </div>
          <div className={createStyles.statusBar}>
            <span
              className={`${createStyles.statusPill} ${
                manualDraft.missingFields.length === 0
                  ? createStyles.statusPillReady
                  : createStyles.statusPillWarning
              }`}
            >
              {manualDraft.readinessLabel}
            </span>
            <span className={createStyles.statusPill}>
              {jellyfin.hasSelectedPreview
                ? "Jellyfin verknuepft"
                : jellyfin.showResults
                  ? `${jellyfin.intake.candidates.length} Treffer`
                  : "Manuell"}
            </span>
            <span
              className={`${createStyles.statusPill} ${authStatusClassName}`}
            >
              {authStatusLabel}
            </span>
            {jellyfin.selectedDraftAssetCount > 0 ? (
              <span className={createStyles.statusPill}>
                {jellyfin.selectedDraftAssetCount} Assets
              </span>
            ) : null}
          </div>
        </header>

        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
        {status.successMessage ? (
          <div className={styles.successBox}>{status.successMessage}</div>
        ) : null}

        <section className={createStyles.workspaceSection}>
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
            titleActions={
              <button
                className={createStyles.primaryAction}
                type="button"
                disabled={
                  !manualDraft.sourceActionState.canSync ||
                  jellyfin.intake.isSearching ||
                  status.isSubmittingCreate
                }
                onClick={() => {
                  void handlers.handleJellyfinSearch();
                }}
              >
                {jellyfin.intake.isSearching ? "Jellyfin sucht..." : "Jellyfin suchen"}
              </button>
            }
            titleHint={<p className={styles.hint}>{manualDraft.sourceActionState.helperText}</p>}
            typeHint={<CreatePageTypeHint preview={jellyfin.preview} />}
            draftAssets={
              jellyfin.draftAssets ? (
                <>
                  <JellyfinDraftAssets
                    animeTitle={
                      manualDraft.values.title.trim() ||
                      jellyfin.preview?.jellyfin_series_name ||
                      "Anime"
                    }
                    assetSlots={jellyfin.draftAssets}
                    onRemoveAsset={handlers.handleRemoveJellyfinAsset}
                  />
                  {jellyfin.preview ? (
                    <div className={styles.actions}>
                      {jellyfin.reviewVisibility.showRestartAction ? (
                        <button
                          className={styles.buttonSecondary}
                          type="button"
                          onClick={handlers.restartJellyfinReview}
                        >
                          Anderen Treffer waehlen
                        </button>
                      ) : null}
                      <button
                        className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                        type="button"
                        onClick={handlers.handleDiscardJellyfinPreview}
                      >
                        Auswahl verwerfen
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null
            }
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
            onRemoveSingleAsset={handlers.removeSingleAsset}
            onRemoveBackground={handlers.removeBackground}
          />
        </section>

        {jellyfin.showResults ? (
          <CreateJellyfinResultsPanel
            query={manualDraft.values.title.trim()}
            candidates={jellyfin.intake.candidates}
            selectedCandidateID={jellyfin.intake.reviewState.selectedCandidate?.jellyfin_series_id}
            hasActivePreview={jellyfin.hasSelectedPreview}
            isLoadingPreview={jellyfin.intake.isLoadingPreview}
            onSelectCandidate={handlers.handleJellyfinCandidateSelect}
            onLoadCandidatePreview={(id) => {
              void handlers.handleJellyfinCandidateReview(id);
            }}
          />
        ) : null}

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
