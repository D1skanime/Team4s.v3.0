"use client";

import type { FormEvent, ReactNode, RefObject } from "react";

import { AnimeStatus, ContentType } from "@/types/anime";
import { AnimeType, GenreToken } from "@/types/admin";

import styles from "../../../admin.module.css";
import workspaceStyles from "./ManualCreateWorkspace.module.css";
import { AnimeCreateCoverField } from "../CreatePage/AnimeCreateCoverField";
import { AnimeCreateGenreField } from "../CreatePage/AnimeCreateGenreField";
import { AnimeEditorShell } from "../shared/AnimeEditorShell";
import type { AnimeEditorController } from "../../types/admin-anime-editor";

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
  description: string;
  coverImage: string;
  coverPreviewUrl?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  genreSuggestions: GenreToken[];
  genreSuggestionsTotal: number;
  loadedTokenCount: number;
  isLoadingGenres: boolean;
  genreError: string | null;
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
  onFileChange: React.ChangeEventHandler<HTMLInputElement>;
  onOpenFileDialog: () => void;
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

            <section className={workspaceStyles.sectionCard}>
              <div className={workspaceStyles.sectionHeader}>
                <p className={workspaceStyles.sectionEyebrow}>Metadaten</p>
                <h2 className={workspaceStyles.sectionTitle}>
                  Genre und Beschreibung
                </h2>
                <p className={workspaceStyles.sectionText}>
                  Nutze nur Metadaten, die fuer Suche oder Darstellung wirklich
                  helfen.
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
            <section className={workspaceStyles.sectionCard}>
              <div className={workspaceStyles.sectionHeader}>
                <p className={workspaceStyles.sectionEyebrow}>Cover</p>
                <h2 className={workspaceStyles.sectionTitle}>
                  Poster und Datei
                </h2>
                <p className={workspaceStyles.sectionText}>
                  Poster ist Pflicht. Du kannst das Cover direkt ueber die
                  verifizierte V2-Upload-Seam vorbereiten oder einen
                  vorhandenen Dateipfad verwenden.
                </p>
              </div>

              <AnimeCreateCoverField
                inputRef={props.inputRef}
                coverImage={props.coverImage}
                coverPreviewUrl={props.coverPreviewUrl}
                isSubmitting={props.isSubmitting}
                isUploading={props.isUploadingCover}
                isMissing={isCoverMissing}
                onCoverImageChange={props.onCoverImageChange}
                onFileChange={props.onFileChange}
                onOpenFileDialog={props.onOpenFileDialog}
              />
            </section>
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
