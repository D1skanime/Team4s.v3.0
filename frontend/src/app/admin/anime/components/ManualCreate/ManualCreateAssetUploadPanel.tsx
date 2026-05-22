"use client";

import type { ChangeEvent, RefObject } from "react";

import { buildCreateAssetUploadPlan } from "../../create/createAssetUploadPlan";
import type { CreateAssetUploadDraftValue } from "../../create/createAssetUploadPlan";

import styles from "../../../admin.module.css";
import workspaceStyles from "./ManualCreateWorkspace.module.css";
import { AnimeCreateCoverField } from "../CreatePage/AnimeCreateCoverField";

type SingleAssetKind = "banner" | "logo" | "background_video";
type AssetInputRefs = Record<
  "cover" | SingleAssetKind | "background",
  RefObject<HTMLInputElement | null>
>;

interface ManualCreateAssetUploadPanelProps {
  inputRefs: AssetInputRefs;
  coverImage: string;
  coverPreviewUrl?: string;
  stagedBanner: CreateAssetUploadDraftValue | null;
  stagedLogo: CreateAssetUploadDraftValue | null;
  stagedBackgrounds: CreateAssetUploadDraftValue[];
  stagedBackgroundVideo: CreateAssetUploadDraftValue | null;
  isSubmitting: boolean;
  isUploadingCover: boolean;
  isMissingCover: boolean;
  onCoverImageChange: (value: string) => void;
  onCoverFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenFileDialog: (kind: keyof AssetInputRefs) => void;
  onOpenAssetSearch: (kind: "cover" | "banner" | "logo" | "background") => void;
  onSingleAssetChange: (
    kind: SingleAssetKind,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onBackgroundChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveSingleAsset: (kind: SingleAssetKind) => void;
  onRemoveBackground: (index: number) => void;
}

const ACCEPT_BY_KIND: Record<SingleAssetKind | "background", string> = {
  banner: "image/*",
  logo: "image/*",
  background: "image/*",
  background_video: "video/*",
};

function renderStagedAssetSummary(
  label: string,
  value: CreateAssetUploadDraftValue | null,
  onRemove: () => void,
) {
  return (
    <div className={styles.coverMetaBlock}>
      <span className={styles.coverMetaLabel}>{label}</span>
      <code className={styles.coverMetaValue}>
        {value ? value.draftValue : "Noch keine Datei ausgewählt."}
      </code>
      {value ? (
        <div className={styles.actions}>
          <a
            className={styles.buttonSecondary}
            href={value.previewUrl}
            target="_blank"
            rel="noreferrer"
          >
            Vorschau öffnen
          </a>
          <button
            className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
            type="button"
            onClick={onRemove}
          >
            Entfernen
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ManualCreateAssetUploadPanel(
  props: ManualCreateAssetUploadPanelProps,
) {
  const {
    inputRefs,
    coverImage,
    coverPreviewUrl,
    stagedBanner,
    stagedLogo,
    stagedBackgrounds,
    stagedBackgroundVideo,
    isSubmitting,
    isUploadingCover,
    isMissingCover,
    onCoverImageChange,
    onCoverFileChange,
    onOpenFileDialog,
    onOpenAssetSearch,
    onSingleAssetChange,
    onBackgroundChange,
    onRemoveSingleAsset,
    onRemoveBackground,
  } = props;
  const uploadPlan = buildCreateAssetUploadPlan();

  return (
    <>
      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Cover</p>
          <h2 className={workspaceStyles.sectionTitle}>Poster und Datei</h2>
          <p className={workspaceStyles.sectionText}>
            Poster ist Pflicht. Du kannst das Cover direkt über die
            verifizierte V2-Upload-Seam vorbereiten oder einen vorhandenen
            Dateipfad verwenden.
          </p>
        </div>

        <AnimeCreateCoverField
          // Passing a ref object through to the field is intentional; the component never reads `.current` during render.
          // eslint-disable-next-line react-hooks/refs
          inputRef={inputRefs.cover}
          coverImage={coverImage}
          coverPreviewUrl={coverPreviewUrl}
          isSubmitting={isSubmitting}
          isUploading={isUploadingCover}
          isMissing={isMissingCover}
          onCoverImageChange={onCoverImageChange}
          onFileChange={onCoverFileChange}
          onOpenFileDialog={() => onOpenFileDialog("cover")}
        />
        <div className={styles.actions}>
          <button
            className={styles.buttonSecondary}
            type="button"
            disabled={isSubmitting}
            onClick={() => onOpenAssetSearch("cover")}
          >
            Cover online suchen
          </button>
        </div>
      </section>

      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Asset-Upload</p>
          <h2 className={workspaceStyles.sectionTitle}>
            Banner, Logo und Backgrounds
          </h2>
          <p className={workspaceStyles.sectionText}>
            Diese Assets bleiben bis zum Speichern lokal vorgemerkt und werden
            erst nach dem erfolgreichen Create über die vorhandene V2-Seam
            hochgeladen und verlinkt.
          </p>
        </div>

        <div className={styles.grid}>
          {(["banner", "logo", "background_video"] as SingleAssetKind[]).map(
            (kind) => {
              const staged =
                kind === "banner"
                  ? stagedBanner
                  : kind === "logo"
                    ? stagedLogo
                    : stagedBackgroundVideo;

              return (
                <div key={kind} className={styles.field}>
                  <label htmlFor={`create-${kind}-file`}>
                    {uploadPlan[kind].label}
                  </label>
                  <input
                    id={`create-${kind}-file`}
                    ref={inputRefs[kind] as RefObject<HTMLInputElement>}
                    className={styles.fileInput}
                    type="file"
                    accept={ACCEPT_BY_KIND[kind]}
                    onChange={(event) => onSingleAssetChange(kind, event)}
                    disabled={isSubmitting}
                  />
                  {renderStagedAssetSummary(
                    "Vorgemerkt",
                    staged,
                    () => onRemoveSingleAsset(kind),
                  )}
                  <div className={styles.actions}>
                    <button
                      className={styles.button}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onOpenFileDialog(kind)}
                    >
                      {uploadPlan[kind].label} vorbereiten
                    </button>
                    {kind !== "background_video" ? (
                      <button
                        className={styles.buttonSecondary}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => onOpenAssetSearch(kind)}
                      >
                        {uploadPlan[kind].label} online suchen
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            },
          )}

          <div className={styles.field}>
            <label htmlFor="create-background-file">
              {uploadPlan.background.label}
            </label>
            <input
              id="create-background-file"
              // The ref is attached to the input for the external "open file dialog" button.
              // eslint-disable-next-line react-hooks/refs
              ref={inputRefs.background as RefObject<HTMLInputElement>}
              className={styles.fileInput}
              type="file"
              accept={ACCEPT_BY_KIND.background}
              onChange={onBackgroundChange}
              disabled={isSubmitting}
            />
            <div className={styles.coverMetaBlock}>
              <span className={styles.coverMetaLabel}>Vorgemerkt</span>
              <code className={styles.coverMetaValue}>
                {stagedBackgrounds.length > 0
                  ? `${stagedBackgrounds.length} Datei(en) vorgemerkt`
                  : "Noch keine Datei ausgewählt."}
              </code>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.button}
                type="button"
                disabled={isSubmitting}
                onClick={() => onOpenFileDialog("background")}
              >
                Background hinzufügen
              </button>
              <button
                className={styles.buttonSecondary}
                type="button"
                disabled={isSubmitting}
                onClick={() => onOpenAssetSearch("background")}
              >
                Backgrounds online suchen
              </button>
            </div>
            {stagedBackgrounds.length > 0 ? (
              <div className={styles.stack}>
                {stagedBackgrounds.map((entry, index) => (
                  <div key={`${entry.file.name}:${entry.file.size}:${entry.file.lastModified}`} className={styles.coverMetaBlock}>
                    <span className={styles.coverMetaLabel}>
                      Background {index + 1}
                    </span>
                    <code className={styles.coverMetaValue}>
                      {entry.draftValue}
                    </code>
                    <div className={styles.actions}>
                      <a
                        className={styles.buttonSecondary}
                        href={entry.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Vorschau öffnen
                      </a>
                      <button
                        className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                        type="button"
                        onClick={() => onRemoveBackground(index)}
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
