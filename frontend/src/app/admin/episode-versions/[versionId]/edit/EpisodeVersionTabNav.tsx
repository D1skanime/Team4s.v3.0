import Link from "next/link";

import type { ActiveTab } from "./episodeVersionEditorUtils";
import styles from "./EpisodeVersionEditor.module.css";

interface EpisodeVersionTabNavProps {
  shouldRenderAdminTabs: boolean;
  shouldRenderContributorTabs: boolean;
  allowedTabs: Set<ActiveTab>;
  visibleActiveTab: ActiveTab;
  handleTabChange: (tab: ActiveTab) => void;
  publicReleaseHref: string | null;
}

export function EpisodeVersionTabNav({
  shouldRenderAdminTabs,
  shouldRenderContributorTabs,
  allowedTabs,
  visibleActiveTab,
  handleTabChange,
  publicReleaseHref,
}: EpisodeVersionTabNavProps) {
  if (!shouldRenderAdminTabs && !shouldRenderContributorTabs) return null;

  return (
    <div className={styles.tabNav}>
      {shouldRenderContributorTabs ? (
        <>
          {allowedTabs.has("informationen") ? (
            <button
              type="button"
              className={
                visibleActiveTab === "informationen"
                  ? styles.tabActive
                  : styles.tab
              }
              onClick={() => handleTabChange("informationen")}
            >
              Informationen
            </button>
          ) : null}
          {allowedTabs.has("segmente") ? (
            <button
              type="button"
              className={
                visibleActiveTab === "segmente" ? styles.tabActive : styles.tab
              }
              onClick={() => handleTabChange("segmente")}
            >
              Segmente
            </button>
          ) : null}
          {allowedTabs.has("media") ? (
            <button
              type="button"
              className={
                visibleActiveTab === "media" ? styles.tabActive : styles.tab
              }
              onClick={() => handleTabChange("media")}
            >
              Media / Assets
            </button>
          ) : null}
          {allowedTabs.has("notizen") ? (
            <button
              type="button"
              className={
                visibleActiveTab === "notizen" ? styles.tabActive : styles.tab
              }
              onClick={() => handleTabChange("notizen")}
            >
              Notizen / Beiträge
            </button>
          ) : null}
          {publicReleaseHref ? (
            <Link
              href={publicReleaseHref}
              className={styles.tab}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Öffentliche Release-Seite in neuem Tab öffnen"
            >
              Öffentliche Release-Seite
            </Link>
          ) : null}
        </>
      ) : shouldRenderAdminTabs ? (
        <>
          <button
            type="button"
            className={
              visibleActiveTab === "uebersicht" ? styles.tabActive : styles.tab
            }
            onClick={() => handleTabChange("uebersicht")}
          >
            Übersicht
          </button>
          <button
            type="button"
            className={
              visibleActiveTab === "dateien" ? styles.tabActive : styles.tab
            }
            onClick={() => handleTabChange("dateien")}
          >
            Dateien
          </button>
          <button
            type="button"
            className={
              visibleActiveTab === "informationen"
                ? styles.tabActive
                : styles.tab
            }
            onClick={() => handleTabChange("informationen")}
          >
            Informationen
          </button>
          <button
            type="button"
            className={
              visibleActiveTab === "segmente" ? styles.tabActive : styles.tab
            }
            onClick={() => handleTabChange("segmente")}
          >
            Segmente
          </button>
          <button
            type="button"
            className={
              visibleActiveTab === "media" ? styles.tabActive : styles.tab
            }
            onClick={() => handleTabChange("media")}
          >
            Media / Assets
          </button>
          <button
            type="button"
            className={
              visibleActiveTab === "changelog" ? styles.tabActive : styles.tab
            }
            onClick={() => handleTabChange("changelog")}
          >
            Changelog
          </button>
          <button
            type="button"
            className={
              visibleActiveTab === "notizen" ? styles.tabActive : styles.tab
            }
            onClick={() => handleTabChange("notizen")}
          >
            Notizen / Beiträge
          </button>
          {publicReleaseHref ? (
            <Link
              href={publicReleaseHref}
              className={styles.tab}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Öffentliche Release-Seite in neuem Tab öffnen"
            >
              Öffentliche Release-Seite
            </Link>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
