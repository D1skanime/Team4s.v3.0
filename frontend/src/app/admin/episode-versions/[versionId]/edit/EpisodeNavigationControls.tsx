"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className={styles.episodeNavPager}>
      <Button
        type="button"
        variant="ghost"
        className={styles.episodeNavPagerSegment}
        aria-label="Vorherige Folge"
        disabled={isLoading || prevVersionId == null}
        onClick={() => {
          if (prevVersionId != null) navigateTo(prevVersionId);
        }}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        <span className={styles.episodeNavPagerLabel}>Zurück</span>
      </Button>
      {showPosition ? (
        <span className={styles.episodeNavPagerPosition}>
          Folge {currentIndex + 1} / {totalCount}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className={styles.episodeNavPagerSegment}
        aria-label="Nächste Folge"
        disabled={isLoading || nextVersionId == null}
        onClick={() => {
          if (nextVersionId != null) navigateTo(nextVersionId);
        }}
      >
        <span className={styles.episodeNavPagerLabel}>Weiter</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
