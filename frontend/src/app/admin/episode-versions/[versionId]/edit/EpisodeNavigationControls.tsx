"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

import styles from "./EpisodeVersionEditor.module.css";

export interface EpisodeNavigationControlsProps {
  prevVersionId: number | null;
  prevEpisodeNumber: number | null;
  nextVersionId: number | null;
  nextEpisodeNumber: number | null;
  currentIndex: number;
  totalCount: number;
  isLoading: boolean;
  activeTab: string;
}

export function EpisodeNavigationControls({
  prevVersionId,
  nextVersionId,
  currentIndex,
  totalCount,
  isLoading,
  activeTab,
}: EpisodeNavigationControlsProps) {
  const router = useRouter();

  const navigateTo = (targetVersionId: number) => {
    router.push(`/admin/episode-versions/${targetVersionId}/edit?tab=${activeTab}`);
  };

  const showPosition = currentIndex >= 0 && totalCount > 0;

  return (
    <div className={styles.episodeNavBar}>
      <Button
        type="button"
        variant="secondary"
        disabled={isLoading || prevVersionId == null}
        onClick={() => {
          if (prevVersionId != null) navigateTo(prevVersionId);
        }}
      >
        ← Vorherige Folge
      </Button>
      {showPosition ? (
        <span className={styles.episodeNavPosition}>
          Folge {currentIndex + 1} von {totalCount}
        </span>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        disabled={isLoading || nextVersionId == null}
        onClick={() => {
          if (nextVersionId != null) navigateTo(nextVersionId);
        }}
      >
        Nächste Folge →
      </Button>
    </div>
  );
}
