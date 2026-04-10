"use client";

import Link from "next/link";

import styles from "../../admin.module.css";
import createStyles from "./page.module.css";
import type {
  CreateAniSearchConflictState,
  CreateAniSearchDraftState,
} from "./createAniSearchControllerHelpers";

interface CreateAniSearchIntakeCardProps {
  anisearchID: string;
  isLoading: boolean;
  result: CreateAniSearchDraftState | null;
  conflict: CreateAniSearchConflictState | null;
  errorMessage: string | null;
  onAniSearchIDChange: (value: string) => void;
  onSubmit: () => void;
}

export function CreateAniSearchIntakeCard({
  anisearchID,
  isLoading,
  result,
  conflict,
  errorMessage,
  onAniSearchIDChange,
  onSubmit,
}: CreateAniSearchIntakeCardProps) {
  const helperID = "create-anisearch-helper";
  const statusID = "create-anisearch-status";

  return (
    <section className={createStyles.resultsPanel}>
      <div className={createStyles.resultsHeader}>
        <div className={createStyles.resultsTitleBlock}>
          <p className={createStyles.resultsEyebrow}>AniSearch</p>
          <h2 className={createStyles.resultsTitle}>AniSearch Daten laden</h2>
          <p className={createStyles.resultsText}>
            Lade AniSearch gezielt per ID, bevor du Jellyfin als Zusatzquelle nutzt.
          </p>
        </div>
      </div>

      <div className={styles.inputRow}>
        <label className={styles.field}>
          <span>AniSearch ID</span>
          <input
            value={anisearchID}
            placeholder="z. B. 5170"
            aria-describedby={`${helperID} ${statusID}`}
            onChange={(event) => onAniSearchIDChange(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={createStyles.primaryAction}
          aria-busy={isLoading}
          disabled={isLoading || !anisearchID.trim()}
          onClick={onSubmit}
        >
          {isLoading ? "AniSearch laedt..." : "AniSearch laden"}
        </button>
      </div>

      <p id={helperID} className={styles.hint}>
        Manuell &gt; AniSearch &gt; Jellyfin
      </p>

      <div id={statusID} aria-live="polite">
        {conflict ? (
          <div className={styles.details}>
            <p className={styles.hint}>
              AniSearch ID {conflict.anisearchID} ist bereits mit{" "}
              <strong>{conflict.existingTitle}</strong> verknuepft.
            </p>
            <Link
              href={conflict.redirectPath}
              className={createStyles.secondaryAction}
            >
              Zum vorhandenen Anime wechseln
            </Link>
          </div>
        ) : errorMessage ? (
          <div className={styles.errorBox}>
            <p>{errorMessage}</p>
            <p className={styles.hint}>
              Der aktuelle Entwurf bleibt unveraendert und noch nicht gespeichert.
            </p>
          </div>
        ) : result ? (
          <div className={styles.details}>
            <p className={styles.hint}>{result.summary}</p>
            <div className={styles.detailsInner}>
              <div>
                <strong>Aktualisierte Felder</strong>
                <p className={styles.hint}>
                  {result.updatedFields.length > 0
                    ? result.updatedFields.join(", ")
                    : "Keine Felder wurden aktualisiert."}
                </p>
              </div>
              <div>
                <strong>Relationen</strong>
                {result.relationNotes.map((note) => (
                  <p key={note} className={styles.hint}>
                    {note}
                  </p>
                ))}
              </div>
              <div>
                <strong>Entwurfsstatus</strong>
                {result.draftStatusNotes.map((note) => (
                  <p key={note} className={styles.hint}>
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.details}>
            <p className={styles.hint}>Noch keine AniSearch-Daten geladen.</p>
            <p className={styles.hint}>
              Nichts wird gespeichert, bis du den Anime danach normal erstellst.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
