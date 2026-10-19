import Link from "next/link";

import { Button } from "@/components/ui/Button";

import type { ActiveTab } from "./episodeVersionEditorUtils";
import styles from "./EpisodeVersionEditor.module.css";

interface EpisodeVersionActionBarProps {
  backHref: string;
  fansubGroupHref: string | null;
  isSingleSelectedGroup: boolean;
  isPlatformAdmin: boolean;
  canEditMetadata: boolean;
  visibleActiveTab: ActiveTab;
  isSaving: boolean;
  isDeleting: boolean;
  onDelete: () => void;
}

export function EpisodeVersionActionBar({
  backHref,
  fansubGroupHref,
  isSingleSelectedGroup,
  isPlatformAdmin,
  canEditMetadata,
  visibleActiveTab,
  isSaving,
  isDeleting,
  onDelete,
}: EpisodeVersionActionBarProps) {
  return (
    <section className={styles.actionBar}>
      <Link href={backHref} className={styles.secondaryButton}>
        Zurück
      </Link>
      {fansubGroupHref != null && isSingleSelectedGroup ? (
        <Button href={fansubGroupHref} variant="secondary">
          Zur Fansubgruppe
        </Button>
      ) : null}
      {isPlatformAdmin ||
      (canEditMetadata && visibleActiveTab === "informationen") ? (
        <>
          <button
            className={`${styles.primaryButton} ${styles.successButton}`}
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : null}
            {isSaving ? "Speichert..." : "Speichern"}
          </button>
          {isPlatformAdmin ? (
            <button
              className={styles.dangerButton}
              type="button"
              onClick={() => void onDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Löscht..." : "Löschen"}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
