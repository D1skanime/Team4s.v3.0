"use client";

import Image from "next/image";
import type { ChangeEvent, RefObject } from "react";

import {
  handleCoverImgError,
  resolveCoverUrl,
} from "../../utils/anime-helpers";
import styles from "../../../admin.module.css";

interface AnimeCreateCoverFieldProps {
  inputRef: RefObject<HTMLInputElement | null>;
  coverImage: string;
  coverPreviewUrl?: string;
  isSubmitting: boolean;
  isUploading: boolean;
  isMissing: boolean;
  onCoverImageChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenFileDialog: () => void;
}

export function AnimeCreateCoverField({
  inputRef,
  coverImage,
  coverPreviewUrl,
  isSubmitting,
  isUploading,
  isMissing,
  onCoverImageChange,
  onFileChange,
  onOpenFileDialog,
}: AnimeCreateCoverFieldProps) {
  const hasCover = coverImage.trim().length > 0;
  const resolvedCoverUrl =
    coverPreviewUrl?.trim() || resolveCoverUrl(coverImage);

  return (
    <div className={styles.field}>
      <label htmlFor="create-cover-image">Cover *</label>
      <div className={styles.coverCard}>
        <div className={styles.coverStage}>
          {hasCover ? (
            <Image
              className={styles.coverPoster}
              src={resolvedCoverUrl}
              alt=""
              width={240}
              height={360}
              unoptimized
              onError={handleCoverImgError}
            />
          ) : (
            <div className={styles.coverEmptyState}>
              <strong>Kein Cover</strong>
              <span>Poster fehlt noch.</span>
            </div>
          )}
        </div>

        <div className={styles.coverCardBody}>
          <input
            id="create-cover-image"
            value={coverImage}
            onChange={(event) => onCoverImageChange(event.target.value)}
            disabled={isSubmitting || isUploading}
            placeholder="dateiname.jpg oder URL"
            aria-invalid={isMissing}
            className={isMissing ? styles.inputInvalid : ""}
          />

          <div className={styles.coverMetaBlock}>
            <span className={styles.coverMetaLabel}>Aktueller Pfad</span>
            <code className={styles.coverMetaValue}>
              {hasCover ? coverImage : "Noch keine Datei ausgewaehlt."}
            </code>
          </div>

          {isMissing ? (
            <p className={styles.fieldError}>
              Cover ist Pflicht, bevor gespeichert werden kann.
            </p>
          ) : null}

          <div className={styles.actions}>
            <input
              ref={inputRef as RefObject<HTMLInputElement>}
              className={styles.fileInput}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              disabled={isUploading || isSubmitting}
            />
            <button
              className={styles.button}
              type="button"
              disabled={isUploading || isSubmitting}
              onClick={onOpenFileDialog}
            >
              {isUploading ? "Upload..." : "Cover hochladen"}
            </button>
            {hasCover ? (
              <a
                className={styles.buttonSecondary}
                href={resolvedCoverUrl}
                target="_blank"
                rel="noreferrer"
              >
                Cover oeffnen
              </a>
            ) : null}
          </div>

          <p className={styles.hint}>
            Die Datei bleibt bis zum Speichern im Entwurf. Erst beim Erstellen
            wird sie in den echten Anime-Asset-Pfad hochgeladen.
          </p>
        </div>
      </div>
    </div>
  );
}
