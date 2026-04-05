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
        {value ? value.draftValue : "Noch keine Datei ausgewaehlt."}
      </code>
      {value ? (
        <div className={styles.actions}>
          <a
            className={styles.buttonSecondary}
            href={value.previewUrl}
            target="_blank"
            rel="noreferrer"
          >
            Vorschau oeffnen
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
  const uploadPlan = buildCreateAssetUploadPlan();

  return (
    <>
      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Cover</p>
          <h2 className={workspaceStyles.sectionTitle}>Poster und Datei</h2>
          <p className={workspaceStyles.sectionText}>
            Poster ist Pflicht. Du kannst das Cover direkt ueber die
            verifizierte V2-Upload-Seam vorbereiten oder einen vorhandenen
            Dateipfad verwenden.
          </p>
        </div>

        <AnimeCreateCoverField
          inputRef={props.inputRefs.cover}
          coverImage={props.coverImage}
          coverPreviewUrl={props.coverPreviewUrl}
          isSubmitting={props.isSubmitting}
          isUploading={props.isUploadingCover}
          isMissing={props.isMissingCover}
          onCoverImageChange={props.onCoverImageChange}
          onFileChange={props.onCoverFileChange}
          onOpenFileDialog={() => props.onOpenFileDialog("cover")}
        />
      </section>

      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Asset-Upload</p>
          <h2 className={workspaceStyles.sectionTitle}>
            Banner, Logo und Backgrounds
          </h2>
          <p className={workspaceStyles.sectionText}>
            Diese Assets bleiben bis zum Speichern lokal vorgemerkt und werden
            erst nach dem erfolgreichen Create ueber die vorhandene V2-Seam
            hochgeladen und verlinkt.
          </p>
        </div>

        <div className={styles.grid}>
          {(["banner", "logo", "background_video"] as SingleAssetKind[]).map(
            (kind) => {
              const staged =
                kind === "banner"
                  ? props.stagedBanner
                  : kind === "logo"
                    ? props.stagedLogo
                    : props.stagedBackgroundVideo;

              return (
                <div key={kind} className={styles.field}>
                  <label htmlFor={`create-${kind}-file`}>
                    {uploadPlan[kind].label}
                  </label>
                  <input
                    id={`create-${kind}-file`}
                    ref={props.inputRefs[kind] as RefObject<HTMLInputElement>}
                    className={styles.fileInput}
                    type="file"
                    accept={ACCEPT_BY_KIND[kind]}
                    onChange={(event) => props.onSingleAssetChange(kind, event)}
                    disabled={props.isSubmitting}
                  />
                  {renderStagedAssetSummary(
                    "Vorgemerkt",
                    staged,
                    () => props.onRemoveSingleAsset(kind),
                  )}
                  <div className={styles.actions}>
                    <button
                      className={styles.button}
                      type="button"
                      disabled={props.isSubmitting}
                      onClick={() => props.onOpenFileDialog(kind)}
                    >
                      {uploadPlan[kind].label} vorbereiten
                    </button>
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
              ref={props.inputRefs.background as RefObject<HTMLInputElement>}
              className={styles.fileInput}
              type="file"
              accept={ACCEPT_BY_KIND.background}
              onChange={props.onBackgroundChange}
              disabled={props.isSubmitting}
            />
            <div className={styles.coverMetaBlock}>
              <span className={styles.coverMetaLabel}>Vorgemerkt</span>
              <code className={styles.coverMetaValue}>
                {props.stagedBackgrounds.length > 0
                  ? `${props.stagedBackgrounds.length} Datei(en) vorgemerkt`
                  : "Noch keine Datei ausgewaehlt."}
              </code>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.button}
                type="button"
                disabled={props.isSubmitting}
                onClick={() => props.onOpenFileDialog("background")}
              >
                Background hinzufuegen
              </button>
            </div>
            {props.stagedBackgrounds.length > 0 ? (
              <div className={styles.stack}>
                {props.stagedBackgrounds.map((entry, index) => (
                  <div key={`${entry.draftValue}-${index}`} className={styles.coverMetaBlock}>
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
                        Vorschau oeffnen
                      </a>
                      <button
                        className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                        type="button"
                        onClick={() => props.onRemoveBackground(index)}
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
