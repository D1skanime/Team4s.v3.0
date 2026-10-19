import Link from "next/link";

import type { ActiveTab } from "./episodeVersionEditorUtils";
import { EpisodeNavigationControls } from "./EpisodeNavigationControls";
import styles from "./EpisodeVersionEditor.module.css";

interface NeighborNavState {
  prevVersionId: number | null;
  prevEpisodeNumber: number | null;
  nextVersionId: number | null;
  nextEpisodeNumber: number | null;
  currentIndex: number;
  totalCount: number;
  isLoading: boolean;
}

interface EpisodeVersionHeaderProps {
  animeTitle: string;
  animeHref: string;
  episodesHref: string;
  breadcrumbEpisodeLabel: string;
  breadcrumbVersionLabel: string;
  isCapabilityScopeReady: boolean;
  isPlatformAdmin: boolean;
  isContributorScopedEditor: boolean;
  hasVersion: boolean;
  groupName: string | null;
  fansubGroupHref: string | null;
  isSingleSelectedGroup: boolean;
  segmentVersion: string | null;
  hasUnsavedChanges: boolean;
  neighborNav: NeighborNavState;
  visibleActiveTab: ActiveTab;
}

export function EpisodeVersionHeader({
  animeTitle,
  animeHref,
  episodesHref,
  breadcrumbEpisodeLabel,
  breadcrumbVersionLabel,
  isCapabilityScopeReady,
  isPlatformAdmin,
  isContributorScopedEditor,
  hasVersion,
  groupName,
  fansubGroupHref,
  isSingleSelectedGroup,
  segmentVersion,
  hasUnsavedChanges,
  neighborNav,
  visibleActiveTab,
}: EpisodeVersionHeaderProps) {
  return (
    <>
      {/* Breadcrumb */}
      <nav className={styles.topLinks}>
        <Link href="/admin/anime">Anime</Link>
        <span>/</span>
        {animeTitle ? (
          <>
            <Link href={animeHref}>{animeTitle}</Link>
            <span>/</span>
          </>
        ) : null}
        <Link href={episodesHref}>{breadcrumbEpisodeLabel}</Link>
        <span>/</span>
        <span style={{ color: "#1c1c1e" }}>{breadcrumbVersionLabel}</span>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {!isCapabilityScopeReady
              ? "Editor"
              : isPlatformAdmin
                ? "Admin Editor"
                : isContributorScopedEditor
                  ? "Contributor Editor"
                  : "Editor"}
          </p>
          <h1 className={styles.title}>
            {animeTitle || "Episode-Version bearbeiten"}
            {hasVersion ? (
              <span className={styles.titleMeta}>
                {" · "}
                {breadcrumbEpisodeLabel}
                {groupName ? (
                  <>
                    {" · "}
                    {fansubGroupHref != null && isSingleSelectedGroup ? (
                      <Link
                        href={fansubGroupHref}
                        className={styles.subtitleGroupLink}
                      >
                        {groupName}
                      </Link>
                    ) : (
                      groupName
                    )}
                    {" "}
                    {segmentVersion}
                  </>
                ) : null}
              </span>
            ) : null}
          </h1>
        </div>
        <div className={styles.headerActions}>
          {hasUnsavedChanges ? (
            <span className={styles.unsavedBadge}>
              Ungespeicherte Änderungen
            </span>
          ) : null}
          {hasVersion ? (
            <EpisodeNavigationControls
              prevVersionId={neighborNav.prevVersionId}
              prevEpisodeNumber={neighborNav.prevEpisodeNumber}
              nextVersionId={neighborNav.nextVersionId}
              nextEpisodeNumber={neighborNav.nextEpisodeNumber}
              currentIndex={neighborNav.currentIndex}
              totalCount={neighborNav.totalCount}
              isLoading={neighborNav.isLoading}
              activeTab={visibleActiveTab}
            />
          ) : null}
        </div>
      </header>
    </>
  );
}
