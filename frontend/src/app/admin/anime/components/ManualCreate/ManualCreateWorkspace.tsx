"use client";

import type { FormEvent, ReactNode, RefObject } from "react";

import { AnimeStatus, ContentType } from "@/types/anime";
import { AnimeType, GenreToken, TagToken } from "@/types/admin";

import styles from "../../../admin.module.css";
import workspaceStyles from "./ManualCreateWorkspace.module.css";
import { AnimeCreateGenreField } from "../CreatePage/AnimeCreateGenreField";
import { AnimeCreateTagField } from "../CreatePage/AnimeCreateTagField";
import { AnimeEditorShell } from "../shared/AnimeEditorShell";
import type { AnimeEditorController } from "../../types/admin-anime-editor";
import { ManualCreateAssetUploadPanel } from "./ManualCreateAssetUploadPanel";
import type { CreateAssetUploadDraftValue } from "../../create/createAssetUploadPlan";

interface ManualCreateWorkspaceProps {
  editor: AnimeEditorController;
  title: string;
  type: AnimeType;
  contentType: ContentType;
  status: AnimeStatus;
  year: string;
  maxEpisodes: string;
  titleDE: string;
  titleEN: string;
  genreDraft: string;
  genreTokens: string[];
  tagDraft: string;
  tagTokens: string[];
  description: string;
  coverImage: string;
  coverPreviewUrl?: string;
  inputRefs: {
    cover: RefObject<HTMLInputElement | null>;
    banner: RefObject<HTMLInputElement | null>;
    logo: RefObject<HTMLInputElement | null>;
    background: RefObject<HTMLInputElement | null>;
    background_video: RefObject<HTMLInputElement | null>;
  };
  stagedBanner: CreateAssetUploadDraftValue | null;
  stagedLogo: CreateAssetUploadDraftValue | null;
  stagedBackgrounds: CreateAssetUploadDraftValue[];
  stagedBackgroundVideo: CreateAssetUploadDraftValue | null;
  genreSuggestions: GenreToken[];
  genreSuggestionsTotal: number;
  loadedTokenCount: number;
  isLoadingGenres: boolean;
  genreError: string | null;
  tagSuggestions: TagToken[];
  tagSuggestionsTotal: number;
  loadedTagTokenCount: number;
  isLoadingTags: boolean;
  tagError: string | null;
  tagSuggestionCanLoadMore: boolean;
  tagSuggestionCanResetLimit: boolean;
  isSubmitting: boolean;
  isUploadingCover: boolean;
  canLoadMore: boolean;
  canResetLimit: boolean;
  missingFields: string[];
  titleActions?: ReactNode;
  titleHint?: ReactNode;
  typeHint?: ReactNode;
  draftAssets?: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
  onTypeChange: (value: AnimeType) => void;
  onContentTypeChange: (value: ContentType) => void;
  onStatusChange: (value: AnimeStatus) => void;
  onYearChange: (value: string) => void;
  onMaxEpisodesChange: (value: string) => void;
  onTitleDEChange: (value: string) => void;
  onTitleENChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCoverImageChange: (value: string) => void;
  onDraftGenreChange: (value: string) => void;
  onAddDraftGenre: () => void;
  onRemoveGenreToken: (name: string) => void;
  onAddGenreSuggestion: (name: string) => void;
  onIncreaseGenreLimit: () => void;
  onResetGenreLimit: () => void;
  onDraftTagChange: (value: string) => void;
  onAddDraftTag: () => void;
  onRemoveTagToken: (name: string) => void;
  onAddTagSuggestion: (name: string) => void;
  onIncreaseTagLimit: () => void;
  onResetTagLimit: () => void;
  onCoverFileChange: React.ChangeEventHandler<HTMLInputElement>;
  onSingleAssetFileChange: (
    kind: "banner" | "logo" | "background_video",
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onBackgroundFileChange: React.ChangeEventHandler<HTMLInputElement>;
  onOpenFileDialog: (
    kind: "cover" | "banner" | "logo" | "background" | "background_video",
  ) => void;
  onOpenAssetSearch: (kind: "cover" | "banner" | "logo" | "background") => void;
  onRemoveSingleAsset: (kind: "banner" | "logo" | "background_video") => void;
  onRemoveBackground: (index: number) => void;
}

const ANIME_TYPES: AnimeType[] = [
  "tv",
  "film",
  "ova",
  "ona",
  "special",
  "bonus",
];
const CONTENT_TYPES: ContentType[] = ["anime", "hentai"];
const ANIME_STATUSES: AnimeStatus[] = [
  "disabled",
  "ongoing",
  "done",
  "aborted",
  "licensed",
];

export function ManualCreateWorkspace(props: ManualCreateWorkspaceProps) {
  const isTitleMissing = props.missingFields.includes("Titel");
  const isCoverMissing = props.missingFields.includes("Cover");
  // Derived: whether the tag suggestion controls can adjust pagination
  const tagCanLoadMore = props.tagSuggestionCanLoadMore;
  const tagCanResetLimit = props.tagSuggestionCanResetLimit;

  return (
    <AnimeEditorShell editor={props.editor}>
      <div className={workspaceStyles.workspaceLayout}>
        <div className={workspaceStyles.formColumn}>
          <form
            id="anime-create-form"
            className={styles.form}
            onSubmit={props.onSubmit}
          >
            <section className={workspaceStyles.sectionCard}>
              <div className={workspaceStyles.sectionHeader}>
                <p className={workspaceStyles.sectionEyebrow}>Pflichtangaben</p>
                <h2 className={workspaceStyles.sectionTitle}>Basisdaten</h2>
                <p className={workspaceStyles.sectionText}>
                  Titel, Typ und Status bestimmen den Kern des Eintrags.
                </p>
              </div>

              <div className={styles.gridTwo}>
                <div
                  className={`${styles.field} ${workspaceStyles.titleField}`}
                >
                  <label htmlFor="create-title">Titel *</label>
                  <div className={workspaceStyles.fieldMeta}>
                    <input
                      id="create-title"
                      className={`${workspaceStyles.titleFieldInput} ${isTitleMissing ? workspaceStyles.inputInvalid : ""}`}
                      value={props.title}
                      onChange={(event) =>
                        props.onTitleChange(event.target.value)
                      }
                      disabled={props.isSubmitting}
                      aria-invalid={isTitleMissing}
                    />
                    <div className={workspaceStyles.titleActionRow}>
                      <div className={workspaceStyles.fieldMeta}>
                        {props.titleHint}
                        {isTitleMissing ? (
                          <p
                            className={`${workspaceStyles.fieldNote} ${workspaceStyles.fieldNoteError}`}
                          >
                            Titel ist Pflicht, bevor gespeichert werden kann.
                          </p>
                        ) : (
                          <span className={workspaceStyles.statusInline}>
                            Titel bereit
                          </span>
                        )}
                      </div>
                      {props.titleActions ? (
                        <div className={workspaceStyles.titleActions}>
                          {props.titleActions}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-type">Typ *</label>
                  <select
                    id="create-type"
                    value={props.type}
                    onChange={(event) =>
                      props.onTypeChange(event.target.value as AnimeType)
                    }
                    disabled={props.isSubmitting}
                  >
                    {ANIME_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  {props.typeHint}
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-content-type">Inhaltstyp *</label>
                  <select
                    id="create-content-type"
                    value={props.contentType}
                    onChange={(event) =>
                      props.onContentTypeChange(
                        event.target.value as ContentType,
                      )
                    }
                    disabled={props.isSubmitting}
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
                    value={props.status}
                    onChange={(event) =>
                      props.onStatusChange(event.target.value as AnimeStatus)
                    }
                    disabled={props.isSubmitting}
                  >
                    {ANIME_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className={workspaceStyles.sectionCard}>
              <div className={workspaceStyles.sectionHeader}>
                <p className={workspaceStyles.sectionEyebrow}>Zusatzdaten</p>
                <h2 className={workspaceStyles.sectionTitle}>Titel und Jahr</h2>
                <p className={workspaceStyles.sectionText}>
                  Optionale Angaben fuer Sortierung, Varianten und Kontext.
                </p>
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.field}>
                  <label htmlFor="create-year">Jahr</label>
                  <input
                    id="create-year"
                    value={props.year}
                    onChange={(event) => props.onYearChange(event.target.value)}
                    disabled={props.isSubmitting}
                    placeholder="z. B. 2026"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-max-episodes">Maximale Episoden</label>
                  <input
                    id="create-max-episodes"
                    value={props.maxEpisodes}
                    onChange={(event) =>
                      props.onMaxEpisodesChange(event.target.value)
                    }
                    disabled={props.isSubmitting}
                    placeholder="z. B. 12"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-title-de">Titel DE</label>
                  <input
                    id="create-title-de"
                    value={props.titleDE}
                    onChange={(event) =>
                      props.onTitleDEChange(event.target.value)
                    }
                    disabled={props.isSubmitting}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="create-title-en">Titel EN</label>
                  <input
                    id="create-title-en"
                    value={props.titleEN}
                    onChange={(event) =>
                      props.onTitleENChange(event.target.value)
                    }
                    disabled={props.isSubmitting}
                  />
                </div>
              </div>
            </section>

            {/* Metadata section: genre card, tags card, and description card
                as sibling surfaces so each field stays independently editable. */}
            <section className={workspaceStyles.sectionCard}>
              <div className={workspaceStyles.sectionHeader}>
                <p className={workspaceStyles.sectionEyebrow}>Metadaten</p>
                <h2 className={workspaceStyles.sectionTitle}>
                  Genre, Tags und Beschreibung
                </h2>
                <p className={workspaceStyles.sectionText}>
                  Genres ordnen den Titel grob ein. Tags helfen bei Suche,
                  Themen und spaeterer Pflege.
                </p>
              </div>

              <div className={styles.grid}>
                <AnimeCreateGenreField
                  draft={props.genreDraft}
                  selectedTokens={props.genreTokens}
                  suggestions={props.genreSuggestions}
                  suggestionsTotal={props.genreSuggestionsTotal}
                  loadedTokenCount={props.loadedTokenCount}
                  isLoading={props.isLoadingGenres}
                  error={props.genreError}
                  isSubmitting={props.isSubmitting}
                  canLoadMore={props.canLoadMore}
                  canResetLimit={props.canResetLimit}
                  onDraftChange={props.onDraftGenreChange}
                  onAddDraft={props.onAddDraftGenre}
                  onRemoveToken={props.onRemoveGenreToken}
                  onAddSuggestion={props.onAddGenreSuggestion}
                  onIncreaseLimit={props.onIncreaseGenreLimit}
                  onResetLimit={props.onResetGenreLimit}
                />

                <AnimeCreateTagField
                  draft={props.tagDraft}
                  selectedTokens={props.tagTokens}
                  suggestions={props.tagSuggestions}
                  suggestionsTotal={props.tagSuggestionsTotal}
                  loadedTokenCount={props.loadedTagTokenCount}
                  isLoading={props.isLoadingTags}
                  error={props.tagError}
                  isSubmitting={props.isSubmitting}
                  canLoadMore={tagCanLoadMore}
                  canResetLimit={tagCanResetLimit}
                  onDraftChange={props.onDraftTagChange}
                  onAddDraft={props.onAddDraftTag}
                  onRemoveToken={props.onRemoveTagToken}
                  onAddSuggestion={props.onAddTagSuggestion}
                  onIncreaseLimit={props.onIncreaseTagLimit}
                  onResetLimit={props.onResetTagLimit}
                />

                <div
                  className={`${styles.field} ${workspaceStyles.descriptionField}`}
                >
                  <label htmlFor="create-description">Beschreibung</label>
                  <textarea
                    id="create-description"
                    className={workspaceStyles.descriptionArea}
                    value={props.description}
                    onChange={(event) =>
                      props.onDescriptionChange(event.target.value)
                    }
                    disabled={props.isSubmitting}
                  />
                  <p className={workspaceStyles.fieldNote}>
                    Kurz, eindeutig und ohne Prozess-Text.
                  </p>
                </div>
              </div>
            </section>
          </form>
        </div>

        <aside className={workspaceStyles.sideColumn}>
          <div className={workspaceStyles.sideSticky}>
            <ManualCreateAssetUploadPanel
              inputRefs={props.inputRefs}
              coverImage={props.coverImage}
              coverPreviewUrl={props.coverPreviewUrl}
              stagedBanner={props.stagedBanner}
              stagedLogo={props.stagedLogo}
              stagedBackgrounds={props.stagedBackgrounds}
              stagedBackgroundVideo={props.stagedBackgroundVideo}
              isSubmitting={props.isSubmitting}
              isUploadingCover={props.isUploadingCover}
              isMissingCover={isCoverMissing}
              onCoverImageChange={props.onCoverImageChange}
              onCoverFileChange={props.onCoverFileChange}
              onOpenFileDialog={props.onOpenFileDialog}
              onOpenAssetSearch={props.onOpenAssetSearch}
              onSingleAssetChange={props.onSingleAssetFileChange}
              onBackgroundChange={props.onBackgroundFileChange}
              onRemoveSingleAsset={props.onRemoveSingleAsset}
              onRemoveBackground={props.onRemoveBackground}
            />
          </div>
        </aside>

        {props.draftAssets ? (
          <section
            className={`${workspaceStyles.sectionCard} ${workspaceStyles.fullWidthPanel}`}
          >
            <div className={workspaceStyles.sectionHeader}>
              <p className={workspaceStyles.sectionEyebrow}>Jellyfin</p>
              <h2 className={workspaceStyles.sectionTitle}>
                Uebernommene Assets
              </h2>
              <p className={workspaceStyles.sectionText}>
                Die Vorschau-Assets liegen bewusst ueber die verfuegbare
                Content-Breite, damit Cover, Banner und Backgrounds ruhig
                vergleichbar bleiben.
              </p>
            </div>
            {props.draftAssets}
          </section>
        ) : null}
      </div>
    </AnimeEditorShell>
  );
}
