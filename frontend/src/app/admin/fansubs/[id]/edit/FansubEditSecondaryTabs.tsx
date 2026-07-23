"use client";

import type { FansubGroup } from "@/types/fansub";
import { NotesTab } from "./NotesTab";
import { GroupHistorySection } from "@/components/groups/GroupHistorySection";
import { ReadinessTab } from "./ReadinessTab";
import { ReleaseReviewsSection } from "./ReleaseReviewsSection";
import type { MainTab } from "./fansubEditTypes";
import {
  countQualifiedCompletedProjects,
  countQualifiedReleases,
  hasQualifiedCollaboration,
  hasQualifiedCompletedProject,
  hasQualifiedFirstProject,
  hasQualifiedFirstRelease,
} from "./fansubEditReleaseHelpers";
import type { FansubReleaseData } from "./useFansubReleaseData";

function hasWebsiteCommunityLink(group: FansubGroup | null): boolean {
  if (!group) return false;
  return Boolean(
    group.links?.some(
      (link) => link.link_type === "website" && link.url.trim() !== "",
    ),
  );
}

type FansubEditSecondaryTabsProps = {
  activeMainTab: MainTab;
  fansubID: number;
  group: FansubGroup | null;
  releaseData: FansubReleaseData;
};

export function FansubEditSecondaryTabs({
  activeMainTab,
  fansubID,
  group,
  releaseData,
}: FansubEditSecondaryTabsProps) {
  return (
    <>
      {activeMainTab === "notes" ? (
        <>
          <NotesTab fansubId={fansubID} />
          <GroupHistorySection
            fansubGroupId={fansubID}
            foundedYear={group?.founded_year ?? null}
            hasWebsiteLink={hasWebsiteCommunityLink(group)}
            hasFirstProject={hasQualifiedFirstProject(releaseData.animeCoverageMap)}
            hasFirstRelease={hasQualifiedFirstRelease(releaseData.animeCoverageMap)}
            qualifiedReleaseCount={countQualifiedReleases(releaseData.animeCoverageMap)}
            hasCompletedProject={hasQualifiedCompletedProject(releaseData.animeCoverageMap)}
            completedProjectCount={countQualifiedCompletedProjects(releaseData.animeCoverageMap)}
            hasCollaboration={hasQualifiedCollaboration(releaseData.animeCoverageMap)}
          />
        </>
      ) : null}
      {activeMainTab === "pruefungen" ? (
        <ReleaseReviewsSection fansubId={fansubID} />
      ) : null}
      {activeMainTab === "readiness" && group ? (
        <ReadinessTab fansubId={fansubID} group={group} />
      ) : null}
    </>
  );
}
